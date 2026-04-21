import { analyzeCommitData } from '../core/detect.js';
import { analyzeDiffIntent } from '../core/llm.js';
import { fetchCodeOwners, getSuggestedReviewers } from '../core/codeowners.js';
import { createCheckRun } from '../core/checks.js';
import { updateStatusCheck } from '../core/status.js';
import { queueJob } from './queue.js';
import { prisma } from './db.js';
import { checkSubscription } from '../core/gating.js';

/**
 * Handle pull_request events
 */
export async function handlePullRequest({ octokit, payload }) {
  const { action, repository, pull_request } = payload;
  const owner = repository.owner.login;
  const repo = repository.name;
  const pull_number = pull_request.number;

  // Handle PR closure for Telemetry Ingestion
  if (action === 'closed') {
    console.log(`[Webhook] Pull Request #${pull_number} closed (Merged: ${pull_request.merged}). Ingesting telemetry...`);
    if (pull_request.merged) {
      await ingestTelemetry(octokit, {
        owner,
        repo,
        pull_request
      });
    }
    return;
  }

  if (action !== 'opened' && action !== 'synchronize') {
    return;
  }

  console.log(`[Webhook] Processing PR #${pull_number} for ${owner}/${repo} (Action: ${action})`);
  
  // Gating Check
  const isPrivate = repository.private;
  const gate = await checkSubscription({ owner, repo, isPrivate });
  
  if (!gate.allowed) {
    console.log(`[Webhook] Analysis blocked for PR #${pull_number} (${owner}/${repo}): ${gate.reason}`);
    
    // Create a failed CheckRun to notify user why analysis stopped
    await createCheckRun(octokit, {
      owner,
      repo,
      sha: pull_request.head.sha,
      conclusion: 'action_required',
      output: {
        title: 'MergeBrief: Analysis Disabled',
        summary: gate.message,
        text: `To enable AI provenance analysis for private repositories, please upgrade your MergeBrief subscription in the dashboard.`
      }
    });
    return;
  }

  try {
    let prRecord = { id: 'temp_' + Date.now(), number: pull_number };
    let dbRepo = { id: 'temp_repo', owner, name: repo };
    let dbPacket = { id: 'temp_pkt' };

    if (prisma) {
      // Scaffold DB structs
      const orgData = { githubId: String(repository.owner.id), login: owner };
      const repoData = { githubId: String(repository.id), owner, name: repo };

      const dbOrg = await prisma.organization.upsert({
        where: { githubId: orgData.githubId },
        update: { login: orgData.login },
        create: orgData
      });

      dbRepo = await prisma.repository.upsert({
        where: { githubId: repoData.githubId },
        update: { owner: repoData.owner, name: repoData.name },
        create: { ...repoData, organizationId: dbOrg.id }
      });

      prRecord = await prisma.pullRequest.upsert({
        where: { repositoryId_number: { repositoryId: dbRepo.id, number: pull_number } },
        update: { merged: pull_request.merged, status: 'PENDING' },
        create: {
          githubId: String(pull_request.id),
          number: pull_number,
          repositoryId: dbRepo.id,
          status: 'PENDING',
          merged: pull_request.merged
        }
      });

      await prisma.mergeBriefPacket.deleteMany({
        where: { pullRequestId: prRecord.id }
      });
      
      dbPacket = await prisma.mergeBriefPacket.create({
        data: {
          pullRequestId: prRecord.id,
          status: 'QUEUED',
          version: 1
        }
      });
    }

    // Fire CheckRun directly via Checks API
    const checkRun = await createCheckRun(octokit, {
      owner,
      repo,
      sha: pull_request.head.sha
    });

    if (checkRun) {
      let jobId = 'temp_job_' + Date.now();
      
      if (prisma) {
        const job = await prisma.analysisJob.create({
          data: {
            pullRequestId: prRecord.id,
            packetId: dbPacket.id,
            checkRunId: String(checkRun.id),
            status: 'QUEUED',
            payload: payload // Store full payload for recovery
          }
        });
        jobId = job.id;
      }

      // Fire async to the queue to not timeout the webhook
      queueJob({
        octokit,
        payload,
        repoRecord: dbRepo,
        prRecord,
        checkRunId: checkRun.id,
        packetId: dbPacket.id,
        jobId
      });
    }

  } catch (error) {
    console.error(`[Webhook] Error processing PR #${pull_number}:`, error.message);
  }
}

/**
 * Handle issue_comment events
 */
export async function handleIssueComment({ octokit, payload }) {
  const { action, repository, issue, comment } = payload;
  
  if (action !== 'created' || !issue.pull_request) {
    return;
  }

  const commentText = comment.body.trim();
  if (!commentText.startsWith('/merge-brief-approve:')) {
    return;
  }

  const owner = repository.owner.login;
  const repo = repository.name;
  const username = comment.user.login;
  const isBot = comment.user.type === 'Bot';
  const reason = commentText.replace('/merge-brief-approve:', '').trim();

  if (isBot) {
    console.warn(`[Webhook] Approval command ignored from bot account: @${username}`);
    return;
  }

  if (!reason) {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: `⚠️ **MergeBrief Error:** A reason is required for approval. \nExample: \`/merge-brief-approve: This code looks solid and has unit tests.\``
    });
    return;
  }

  try {
    // 1. Check permissions (Strict: Admin or Maintainer only for AI-assisted code)
    const { data: permission } = await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username
    });

    const isAuthorized = ['admin', 'maintainer'].includes(permission.permission);
    if (!isAuthorized) {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issue.number,
        body: `❌ **MergeBrief Denied:** @${username}, you don't have sufficient privileges (Admin/Maintainer) to approve AI-assisted code.`
      });
      return;
    }

    // 2. Get PR SHA
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: issue.number
    });

    // 3. Pass Status Check
    await updateStatusCheck(octokit, {
      owner,
      repo,
      sha: pr.head.sha,
      state: 'success',
      description: `Approved by @${username}: ${reason}`
    });

    // 4. Acknowledge with confirmation comment
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: `✅ **AI Provenance Approved** by @${username}. The gate is open.\n\n> **Note:** ${reason}`
    });

  } catch (error) {
    console.error(`[Webhook] Error handling approval command:`, error.message);
  }
}

/**
 * Ingest final telemetry data into Database
 */
async function ingestTelemetry(octokit, { owner, repo, pull_request }) {
  if (!prisma) return;

  try {
    const prNumber = pull_request.number;

    // 1. Find the PR in our database
    const dbPr = await prisma.pullRequest.findFirst({
      where: {
        number: prNumber,
        repository: {
          owner,
          name: repo
        }
      },
      include: {
        packet: true
      }
    });

    if (!dbPr) {
      console.warn(`[Telemetry] PR #${prNumber} not found in database. Skipping ingestion.`);
      return;
    }

    // 2. Fetch comments to find the approval rationale if not already in DB
    // (In case they approved via GitHub comment but it wasn't captured or we want to be sure)
    let approvalNote = dbPr.approvalNote;
    if (!approvalNote) {
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber
      });
      const approveComment = comments.reverse().find(c => 
        c.body.trim().startsWith('/merge-brief-approve:')
      );
      if (approveComment) {
        approvalNote = approveComment.body.replace('/merge-brief-approve:', '').trim();
      }
    }

    // 3. Update PR with final state
    // We use the packet data as the source of truth for AI metrics if not on PR
    await prisma.pullRequest.update({
      where: { id: dbPr.id },
      data: {
        merged: true,
        status: approvalNote ? 'APPROVED' : dbPr.status,
        approvalNote: approvalNote,
        aiTool: dbPr.aiTool || dbPr.packet?.aiTool,
        confidence: dbPr.confidence || dbPr.packet?.confidence,
        updatedAt: new Date()
      }
    });

    // 4. Log final telemetry event
    await prisma.appEvent.create({
      data: {
        event: 'pr_merged_telemetry',
        payload: {
          prNumber,
          repo: `${owner}/${repo}`,
          aiTool: dbPr.aiTool || dbPr.packet?.aiTool,
          confidence: dbPr.confidence || dbPr.packet?.confidence,
          approved: !!approvalNote
        }
      }
    });

    console.log(`[Webhook] Successfully ingested telemetry for PR #${prNumber}`);

  } catch (error) {
    console.error(`[Webhook] Telemetry ingestion failed:`, error.message);
  }
}

/**
 * Handle installation events (App installed)
 */
export async function handleInstallation({ payload }) {
  const { action, installation, repositories } = payload;
  const owner = installation.account.login;
  const githubId = String(installation.account.id);

  console.log(`[Webhook] Installation ${action} for ${owner} (ID: ${installation.id})`);

  if (action === 'deleted' || action === 'suspend') {
    // Handle deactivation logic if needed
    return;
  }

  try {
    if (prisma) {
      // 1. Find or create Organization
      let dbOrg = await prisma.organization.upsert({
        where: { githubId },
        update: { login: owner },
        create: { githubId, login: owner }
      });

      // 2. Auto-link to the first available workspace if not linked
      if (!dbOrg.workspaceId) {
        const firstWorkspace = await prisma.workspace.findFirst();
        if (firstWorkspace) {
           dbOrg = await prisma.organization.update({
             where: { id: dbOrg.id },
             data: { workspaceId: firstWorkspace.id }
           });
           console.log(`[Webhook] Auto-linked ${owner} to workspace: ${firstWorkspace.name}`);
        }
      }

      // 3. Sync repositories if provided
      if (repositories && repositories.length > 0) {
        for (const repo of repositories) {
          await prisma.repository.upsert({
            where: { githubId: String(repo.id) },
            update: { owner, name: repo.name },
            create: {
              githubId: String(repo.id),
              owner,
              name: repo.name,
              organizationId: dbOrg.id
            }
          });
        }
      }

      // 4. Log event
      await prisma.appEvent.create({
        data: {
          event: `installation_${action}`,
          payload: { owner, installationId: installation.id, repoCount: repositories?.length || 0 }
        }
      });
    }
  } catch (error) {
    console.error(`[Webhook] Error handling installation.${action}:`, error.message);
  }
}

/**
 * Handle installation_repositories events (Repos added/removed)
 */
export async function handleInstallationRepositories({ payload }) {
  const { action, installation, repositories_added, repositories_removed } = payload;
  const owner = installation.account.login;

  console.log(`[Webhook] Installation repositories ${action} for ${owner}`);

  try {
    if (prisma) {
      const dbOrg = await prisma.organization.findUnique({
        where: { githubId: String(installation.account.id) }
      });

      if (!dbOrg) {
        console.warn(`[Webhook] Organization not found for installation: ${owner}`);
        return;
      }

      if (repositories_added) {
        for (const repo of repositories_added) {
          await prisma.repository.upsert({
            where: { githubId: String(repo.id) },
            update: { owner, name: repo.name },
            create: {
              githubId: String(repo.id),
              owner,
              name: repo.name,
              organizationId: dbOrg.id
            }
          });
        }
      }

      if (repositories_removed) {
        for (const repo of repositories_removed) {
          // We don't delete history, just mark as inactive
        }
      }
    }
  } catch (error) {
    console.error(`[Webhook] Error handling installation_repositories.${action}:`, error.message);
  }
}

