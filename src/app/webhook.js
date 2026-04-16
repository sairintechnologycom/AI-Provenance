const { analyzeCommitData } = require('../core/detect');
const { analyzeDiffIntent } = require('../core/llm');
const { fetchCodeOwners, getSuggestedReviewers } = require('../core/codeowners');

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
    } else {
      console.log(`[Webhook] No AI provenance detected for PR #${pull_number}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error processing PR #${pull_number}:`, error.message);
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

module.exports = {
  handlePullRequest
};
