/**
 * Asynchronous job queue for processing PRs without blocking webhooks.
 * Lightweight in-memory implementation for Phase 1.
 */

const { analyzeCommitData } = require('../core/detect');
const { analyzeDiffIntent } = require('../core/llm');
const { fetchCodeOwners, getSuggestedReviewers } = require('../core/codeowners');
const { evaluateDeterministicRisks } = require('../core/risk-engine');
const { buildPacket } = require('../core/packet-builder');
const { updateCheckRun } = require('../core/checks');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const queue = [];
let isProcessing = false;

/**
 * Queues a PR for analysis
 */
function queueJob({ octokit, payload, repoRecord, prRecord, checkRunId, packetId }) {
  queue.push({
    octokit, payload, repoRecord, prRecord, checkRunId, packetId, addedAt: Date.now()
  });
  
  if (!isProcessing) {
    processNext();
  }
}

async function processNext() {
  if (queue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const jobParams = queue.shift();
  
  try {
    await processJob(jobParams);
  } catch (error) {
    console.error(`[AsyncQueue] Job failed for PR #${jobParams.prRecord.number}:`, error);
    
    // Fallback failure reporting
    try {
      await updateCheckRun(jobParams.octokit, {
        owner: jobParams.repoRecord.owner,
        repo: jobParams.repoRecord.name,
        check_run_id: jobParams.checkRunId,
        status: 'completed',
        conclusion: 'failure',
        output: {
          title: 'Analysis Failed',
          summary: `MergeBrief encountered a systemic error during analysis: ${error.message}`
        }
      });
      
      await prisma.mergeBriefPacket.update({
        where: { id: jobParams.packetId },
        data: { status: 'FAILED' }
      });
      
    } catch (e) {
      console.error('[AsyncQueue] Could not report failure state:', e);
    }
  }

  // Allow event loop to breathe
  setTimeout(processNext, 500);
}

async function processJob({ octokit, payload, repoRecord, prRecord, checkRunId, packetId }) {
  const { repository, pull_request } = payload;
  const owner = repository.owner.login;
  const repo = repository.name;
  const pull_number = pull_request.number;

  console.log(`[AsyncQueue] Processing PR #${pull_number} in background...`);

  // 1. Move check to in_progress
  await updateCheckRun(octokit, {
    owner, repo, check_run_id: checkRunId,
    status: 'in_progress'
  });

  await prisma.mergeBriefPacket.update({
    where: { id: packetId },
    data: { status: 'PROCESSING' }
  });

  // 2. Fetch Commits
  const { data: commits } = await octokit.rest.pulls.listCommits({
    owner, repo, pull_number
  });

  const analysisResults = [];
  const modifiedFiles = new Set();
  let totalAdditions = 0;

  for (const commit of commits) {
    const { data: commitDetail } = await octokit.rest.repos.getCommit({
      owner, repo, ref: commit.sha
    });

    const fullDiff = commitDetail.files
      .map(f => {
        modifiedFiles.add(f.filename);
        totalAdditions += (f.additions || 0);
        return f.patch || '';
      })
      .join('\n');

    const result = analyzeCommitData({
      sha: commit.sha,
      message: commitDetail.commit.message,
      diff: fullDiff,
      files: commitDetail.files,
      trailerKey: process.env.TRAILER_KEY || 'AI-generated-by'
    });

    if (result.aiTool || result.methods.length > 0) {
      analysisResults.push(result);
    }
  }

  const allTouchedFiles = Array.from(modifiedFiles);

  // 3. Fallback semantic chunks for large diffs
  let semanticAnalysis = null;
  const MAX_DIFF_LINES = 1000;
  let didDiffExceedLimit = false;

  // We only consult LLM if there's AI authorship or to figure out intents
  // Pulling full PR diff
  const { data: fullPrDiff } = await octokit.rest.pulls.get({
    owner, repo, pull_number, mediaType: { format: 'diff' }
  });

  const linesCount = fullPrDiff.split('\\n').length;
  if (linesCount > MAX_DIFF_LINES) {
    didDiffExceedLimit = true;
    console.log(`[AsyncQueue] Diff is very large (${linesCount} lines). Analyzing partial chunk.`);
  }

  // Take the first chunk for LLM analysis
  const diffChunk = fullPrDiff.split('\\n').slice(0, MAX_DIFF_LINES).join('\\n');
  
  if (analysisResults.length > 0 || totalAdditions > 0) {
     semanticAnalysis = await analyzeDiffIntent(diffChunk, analysisResults);
  }

  // 4. Deterministic Tags
  const deterministicTags = evaluateDeterministicRisks(allTouchedFiles);

  // 5. Reviewers
  const codeownersRef = await fetchCodeOwners(octokit, owner, repo);
  let suggestedReviewers = [];
  if (semanticAnalysis && semanticAnalysis.highRiskFiles) {
    suggestedReviewers = getSuggestedReviewers(semanticAnalysis.highRiskFiles, codeownersRef);
  } else {
    // default suggestions on all files if semantic analysis fails or is not risky
    suggestedReviewers = getSuggestedReviewers(allTouchedFiles, codeownersRef);
  }

  // 6. Build the Packet
  const builtPacket = buildPacket({
    pullRequest: { id: prRecord.id },
    diffResults: analysisResults,
    semanticAnalysis,
    suggestedReviewers,
    deterministicTags
  });

  // Optional: append partial analysis warning if diff was too large
  if (didDiffExceedLimit && builtPacket.summary) {
     builtPacket.summary += '\\n\\n*(Note: Pull request was exceptionally large; LLM summary is based on a partial sample.)*';
  }

  // 7. Persist to DB
  await prisma.mergeBriefPacket.update({
    where: { id: packetId },
    data: {
      status: 'COMPLETED',
      summary: builtPacket.summary,
      aiTool: builtPacket.aiTool,
      confidence: builtPacket.confidence,
      filesChangedCount: builtPacket.filesChangedCount,
      headSha: pull_request.head.sha,
      baseSha: pull_request.base.sha,
      rawPayload: builtPacket.rawPayload,
      
      tags: { create: builtPacket.tags },
      intents: { create: builtPacket.intents },
      reviewerSuggestions: { create: builtPacket.reviewerSuggestions },
      provenanceEvidence: { create: builtPacket.provenanceEvidence }
    }
  });

  // Update PR record backward compatibility metrics
  await prisma.pullRequest.update({
    where: { id: prRecord.id },
    data: {
      aiTool: builtPacket.aiTool,
      confidence: builtPacket.confidence
    }
  });

  // 8. Output to GitHub Check
  const appBaseUrl = process.env.BASE_UI_URL || 'http://localhost:3001';
  const packetUrl = `${appBaseUrl}/packets/${packetId}`;
  
  let checkSummary = `### MergeBrief Packet Generated\\n\\n`;
  checkSummary += `**Packet Status**: COMPLETED\\n`;
  checkSummary += `**Confidence**: ${builtPacket.confidence || 0}% AI Evidence\\n`;
  if (builtPacket.summary) checkSummary += `\\n> ${builtPacket.summary}\\n`;
  checkSummary += `\\n[🔍 View Full Packet & Risk Details](${packetUrl})`;

  await updateCheckRun(octokit, {
    owner, repo, check_run_id: checkRunId,
    status: 'completed',
    conclusion: (builtPacket.confidence && builtPacket.confidence > 50) ? 'neutral' : 'success', // Neutral to prompt review without failing build, unless strict
    output: {
      title: 'MergeBrief Analysis',
      summary: checkSummary
    },
    packetUrl
  });

  console.log(`[AsyncQueue] PR #${pull_number} completed successfully.`);
}

module.exports = {
  queueJob,
  processQueue: processNext
};
