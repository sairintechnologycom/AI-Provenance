const { analyzeCommitData } = require('../core/detect');

/**
 * Handle pull_request events
 */
async function handlePullRequest({ octokit, payload }) {
  const { action, repository, pull_request } = payload;
  
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
      // 3. Post summary comment
      const commentBody = formatSummaryComment(analysisResults);
      
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
    } else {
      console.log(`[Webhook] No AI provenance detected for PR #${pull_number}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error processing PR #${pull_number}:`, error.message);
  }
}

/**
 * Formats the analysis results into a friendly Markdown table
 */
function formatSummaryComment(results) {
  let body = '### MergeBrief AI Provenance Summary\n\n';
  body += 'I detected AI-generated code in this Pull Request. Here is the breakdown:\n\n';
  body += '| Commit | AI Tool | Confidence | Files | Added | Removed |\n';
  body += '| :--- | :--- | :--- | :--- | :--- | :--- |\n';

  for (const r of results) {
    const shortSha = r.sha.substring(0, 7);
    body += `| \`${shortSha}\` | **${r.aiTool}** | ${r.confidence}% | ${r.files} | ${r.linesAdded} | ${r.linesRemoved} |\n`;
  }

  body += '\n---\n*This summary was generated automatically by the **MergeBrief** GitHub App. [Learn more](https://github.com/apps/merge-brief)*';
  return body;
}

module.exports = {
  handlePullRequest
};
