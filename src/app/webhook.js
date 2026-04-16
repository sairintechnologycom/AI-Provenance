const { analyzeCommitData } = require('../core/detect');
const { analyzeDiffIntent } = require('../core/llm');
const { fetchCodeOwners, getSuggestedReviewers } = require('../core/codeowners');

/**
 * Handle pull_request events
 */
async function handlePullRequest({ octokit, payload }) {
  const { action, repository, pull_request } = payload;
  
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

  const owner = repository.owner.login;
  const repo = repository.name;
  const pull_number = pull_request.number;

  console.log(`[Webhook] Processing PR #${pull_number} for ${owner}/${repo} (Action: ${action})`);

  try {
    // 1. Get PR commits
    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number
    });

    const analysisResults = [];

    for (const commit of commits) {
      // 2. Get detailed commit info (to get the diff/patch)
      const { data: commitDetail } = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: commit.sha
      });

      // Combine patches for heuristic detection
      const fullDiff = commitDetail.files
        .map(f => f.patch || '')
        .join('\n');

      const result = analyzeCommitData({
        sha: commit.sha,
        message: commitDetail.commit.message,
        diff: fullDiff,
        files: commitDetail.files,
        trailerKey: process.env.TRAILER_KEY || 'AI-generated-by'
      });

      if (result.aiTool) {
        analysisResults.push(result);
      }
    }

    if (analysisResults.length > 0) {
      // 3. Semantic & Risk Analysis (New Phase 6 Feature)
      console.log(`[Webhook] AI detected in PR #${pull_number}, performing semantic analysis...`);
      
      const { data: fullDiff } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
        mediaType: { format: 'diff' }
      });

      const semanticAnalysis = await analyzeDiffIntent(fullDiff, analysisResults);
      const codeownersRef = await fetchCodeOwners(octokit, owner, repo);
      
      let suggestedReviewers = [];
      if (semanticAnalysis && semanticAnalysis.highRiskFiles) {
        suggestedReviewers = getSuggestedReviewers(semanticAnalysis.highRiskFiles, codeownersRef);
      }

      // 4. Post enhanced summary comment
      const commentBody = formatSummaryComment(analysisResults, semanticAnalysis, suggestedReviewers);
      
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pull_number
      });

      const botComment = comments.find(c => 
        c.user.type === 'Bot' && c.body.includes('MergeBrief AI Provenance Summary')
      );

      if (botComment) {
        await octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: botComment.id,
          body: commentBody
        });
        console.log(`[Webhook] Updated existing comment on PR #${pull_number}`);
      } else {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: pull_number,
          body: commentBody
        });
        console.log(`[Webhook] Posted new comment on PR #${pull_number}`);
      }
      // 5. Create/Update Status Check (Blocking Merge)
      await updateStatusCheck(octokit, {
        owner,
        repo,
        sha: pull_request.head.sha,
        state: 'pending',
        description: 'Awaiting human review with /merge-brief-approve command.'
      });
    } else {
      console.log(`[Webhook] No AI provenance detected for PR #${pull_number}`);
      
      // Clear status check if previously set (optional, but good practice)
      await updateStatusCheck(octokit, {
        owner,
        repo,
        sha: pull_request.head.sha,
        state: 'success',
        description: 'No AI provenance detected.'
      });
    }
    }
  } catch (error) {
    console.error(`[Webhook] Error processing PR #${pull_number}:`, error.message);
  }
}

/**
 * Handle issue_comment events
 */
async function handleIssueComment({ octokit, payload }) {
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
  const reason = commentText.replace('/merge-brief-approve:', '').trim();

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
    // 1. Check permissions
    const { data: permission } = await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username
    });

    const isAuthorized = ['admin', 'write'].includes(permission.permission);
    if (!isAuthorized) {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issue.number,
        body: `❌ **MergeBrief Denied:** You (@${username}) don't have write access to this repo.`
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
  const { prisma } = require('./db');
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

    // We can't easily re-run the full analysis on 'closed' without rediffing,
    // so we'll look for a previous bot comment to extract tool/confidence if possible.
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
      // Basic regex extraction from the summary table
      const toolMatch = botComment.body.match(/\*\*([^*]+)\*\*/);
      const confMatch = botComment.body.match(/(\d+)%/);
      if (toolMatch) aiTool = toolMatch[1];
      if (confMatch) confidence = parseInt(confMatch[1]);
    }

    // Capture the approval note (from the last /merge-brief-approve command)
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
 * Formats the analysis results into an enhanced Markdown summary
 */
function formatSummaryComment(results, semanticResults, suggestedReviewers) {
  let body = '### MergeBrief AI Provenance Summary\n\n';
  body += 'I detected AI-generated code in this Pull Request. Here is the breakdown:\n\n';
  
  // 1. Metrics Table
  body += '| Commit | AI Tool | Confidence | Files | Added | Removed |\n';
  body += '| :--- | :--- | :--- | :--- | :--- | :--- |\n';

  for (const r of results) {
    const shortSha = r.sha.substring(0, 7);
    body += `| \`${shortSha}\` | **${r.aiTool}** | ${r.confidence}% | ${r.files} | ${r.linesAdded} | ${r.linesRemoved} |\n`;
  }

  // 2. Semantic Analysis (Phase 6)
  if (semanticResults) {
    if (semanticResults.intents && semanticResults.intents.length > 0) {
      body += '\n#### 🎯 Semantic Intents\n';
      semanticResults.intents.forEach(intent => {
        body += `- ${intent}\n`;
      });
    }

    if (semanticResults.blastRadius && semanticResults.blastRadius.length > 0) {
      body += '\n#### ⚠️ Risk Areas (Blast Radius)\n';
      body += `> **Caution:** These areas are touched by AI-generated code:\n`;
      body += `> ${semanticResults.blastRadius.join(', ')}\n`;
    }
  }

  // 3. Suggested Reviewers
  if (suggestedReviewers && suggestedReviewers.length > 0) {
    body += '\n#### 👤 Suggested Reviewers\n';
    body += `Based on \`CODEOWNERS\` and the risk profile, I suggest the following reviewers:\n`;
    body += suggestedReviewers.join(' ') + '\n';
  }

  body += '\n---\n*This summary was generated automatically by the **MergeBrief** GitHub App. [Learn more](https://github.com/apps/merge-brief)*';
  return body;
}

/**
 * Updates the GitHub Status Check for a specific commit
 */
async function updateStatusCheck(octokit, { owner, repo, sha, state, description }) {
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

module.exports = {
  handlePullRequest,
  handleIssueComment,
  updateStatusCheck
};
