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

  // Handle PR closure for Telemetry Ingestion (This can also be async)
  if (action === 'closed') {
    console.log(`[Webhook] PR #${pull_number} closed. Enqueuing telemetry ingestion...`);
    await queueJob({ type: 'telemetry', payload });
    return;
  }

  if (action !== 'opened' && action !== 'synchronize') {
    return;
  }

  console.log(`[Webhook] Fast-enqueuing PR #${pull_number} for ${owner}/${repo}`);
  
  // Enqueue immediately to avoid webhook timeouts.
  // The worker will handle gating, DB persistence, and check run creation.
  await queueJob({
    type: 'analysis',
    payload
  });
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
        console.log(`[Webhook] ${repositories_removed.length} repositories removed from installation.`);
        // Note: We don't delete history, we just log the event for now.
      }
    }
  } catch (error) {
    console.error(`[Webhook] Error handling installation_repositories.${action}:`, error.message);
  }
}

