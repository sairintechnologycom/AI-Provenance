import { analyzeCommitData } from '../core/detect.js';
import { analyzeDiffIntent } from '../core/llm.js';
import { fetchCodeOwners, getSuggestedReviewers } from '../core/codeowners.js';
import { createCheckRun } from '../core/checks.js';
import { queueJob } from './queue.js';
import { prisma } from './db.js';

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
 * Ingest final telemetry data into PostgreSQL
 */
async function ingestTelemetry(octokit, { owner, repo, pull_request }) {
  if (!prisma) return;

  try {
    const orgData = {
      githubId: String(pull_request.base.repo.owner.id),
      login: owner
    };

    const repoData = {
      githubId: String(pull_request.base.repo.id),
      owner,
      name: repo
    };

    const prNumber = pull_request.number;

    // Build the Organization & Repository
    const dbOrg = await prisma.organization.upsert({
      where: { githubId: orgData.githubId },
      update: { login: orgData.login },
      create: orgData
    });

    const dbRepo = await prisma.repository.upsert({
      where: { githubId: repoData.githubId },
      update: { owner: repoData.owner, name: repoData.name },
      create: { ...repoData, organizationId: dbOrg.id }
    });

    // Fetch comments
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });

    const botComment = comments.find(c => 
      c.user.type === 'Bot' && c.body.includes('MergeBrief AI Provenance Summary')
    );

    let aiTool = null;
    let confidence = null;

    if (botComment) {
      const toolMatch = botComment.body.match(/\*\*([^*]+)\*\*/);
      const confMatch = botComment.body.match(/(\d+)%/);
      if (toolMatch) aiTool = toolMatch[1];
      if (confMatch) confidence = parseInt(confMatch[1]);
    }

    const approveComment = comments.reverse().find(c => 
      c.body.startsWith('/merge-brief-approve:')
    );
    const approvalNote = approveComment 
      ? approveComment.body.replace('/merge-brief-approve:', '').trim() 
      : null;

    await prisma.pullRequest.upsert({
      where: { repositoryId_number: { repositoryId: dbRepo.id, number: prNumber } },
      update: {
        merged: pull_request.merged,
        status: approvalNote ? 'APPROVED' : 'PENDING',
        approvalNote
      },
      create: {
        githubId: String(pull_request.id),
        number: prNumber,
        repositoryId: dbRepo.id,
        aiTool,
        confidence,
        status: approvalNote ? 'APPROVED' : 'PENDING',
        approvalNote,
        merged: pull_request.merged
      }
    });

    console.log(`[Webhook] Successfully ingested telemetry for PR #${prNumber}`);

  } catch (error) {
    console.error(`[Webhook] Ingestion failed:`, error.message);
  }
}

/**
 * Updates the GitHub Status Check for a specific commit
 */
export async function updateStatusCheck(octokit, { owner, repo, sha, state, description }) {
  try {
    await octokit.rest.repos.createCommitStatus({
      owner,
      repo,
      sha,
      state, // 'pending', 'success', 'failure', 'error'
      description: description.substring(0, 140),
      context: 'MergeBrief Approval',
      target_url: 'https://github.com/apps/merge-brief'
    });
    console.log(`[Webhook] Status check updated to ${state} for ${sha.substring(0, 7)}`);
  } catch (error) {
    console.error(`[Webhook] Failed to update Status Check:`, error.message);
  }
}
