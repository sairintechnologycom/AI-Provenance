/**
 * Asynchronous job queue for processing PRs without blocking webhooks.
 * Lightweight in-memory implementation for Phase 1.
 */

import { analyzeCommitData } from '../core/detect.js';
import { analyzeDiffIntent } from '../core/llm.js';
import { fetchCodeOwners, getSuggestedReviewers } from '../core/codeowners.js';
import { evaluateDeterministicRisks } from '../core/risk-engine.js';
import { buildPacket } from '../core/packet-builder.js';
import { updateCheckRun } from '../core/checks.js';
import { prisma } from './db.js';
import { sendSlackNotification } from './slack.js';
import { logAppEvent } from './analytics.js';

const queue = [];
let isProcessing = false;

/**
 * Queues a PR for analysis
 */
export function queueJob({ octokit, payload, repoRecord, prRecord, checkRunId, packetId }) {
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
      
      if (prisma) {
        await prisma.mergeBriefPacket.update({
          where: { id: jobParams.packetId },
          data: { status: 'FAILED' }
        });
      }
    } catch (e) {
      console.error('[AsyncQueue] Could not report failure state:', e);
    }

    await logAppEvent('packet_failed', {
      pr: jobParams.prRecord.number,
      repo: jobParams.repoRecord.name,
      error: error.message
    });
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
  await logAppEvent('packet_started', { pr: pull_number, repo });

  // 1. Move check to in_progress
  await updateCheckRun(octokit, {
    owner, repo, check_run_id: checkRunId,
    status: 'in_progress'
  });

  if (prisma) {
    await prisma.mergeBriefPacket.update({
      where: { id: packetId },
      data: { status: 'PROCESSING' }
    });
  }

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

  const { data: fullPrDiff } = await octokit.rest.pulls.get({
    owner, repo, pull_number, mediaType: { format: 'diff' }
  });

  const linesCount = fullPrDiff.split('\n').length;
  if (linesCount > MAX_DIFF_LINES) {
    didDiffExceedLimit = true;
    console.log(`[AsyncQueue] Diff is very large (${linesCount} lines). Analyzing partial chunk.`);
  }

  const diffChunk = fullPrDiff.split('\n').slice(0, MAX_DIFF_LINES).join('\n');
  
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

  if (didDiffExceedLimit && builtPacket.summary) {
     builtPacket.summary += '\n\n*(Note: Pull request was exceptionally large; LLM summary is based on a partial sample.)*';
  }

  // 7. Persist to DB
  if (prisma) {
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

    await prisma.pullRequest.update({
      where: { id: prRecord.id },
      data: {
        aiTool: builtPacket.aiTool,
        confidence: builtPacket.confidence
      }
    });
  }

  // 8. Output to GitHub Check
  const appBaseUrl = process.env.BASE_UI_URL || 'http://localhost:3001';
  const packetUrl = `${appBaseUrl}/packets/${packetId}`;
  
  let checkSummary = `### MergeBrief Packet Generated\n\n`;
  checkSummary += `**Packet Status**: COMPLETED\n`;
  checkSummary += `**Confidence**: ${builtPacket.confidence || 0}% AI Evidence\n`;
  if (builtPacket.summary) checkSummary += `\n> ${builtPacket.summary}\n`;
  checkSummary += `\n[🔍 View Full Packet & Risk Details](${packetUrl})`;

  await updateCheckRun(octokit, {
    owner, repo, check_run_id: checkRunId,
    status: 'completed',
    conclusion: (builtPacket.confidence && builtPacket.confidence > 50) ? 'neutral' : 'success',
    output: {
      title: 'MergeBrief Analysis',
      summary: checkSummary
    },
    packetUrl
  });

  // 9. Slack Notification
  if (prisma) {
    try {
      const repoWithOrg = await prisma.repository.findUnique({
        where: { id: repoRecord.id },
        include: { organization: { include: { workspace: true } } }
      });

      const workspace = repoWithOrg?.organization?.workspace;
      const currentPacket = await prisma.mergeBriefPacket.findUnique({
        where: { id: packetId }
      });

      if (workspace && workspace.slackWebhookUrl && !currentPacket.slackSentAt) {
        console.log(`[AsyncQueue] Sending Slack notification for PR #${pull_number}...`);
        await sendSlackNotification(workspace.slackWebhookUrl, builtPacket, {
          number: pull_number,
          repository: { owner, name: repo }
        });

        await prisma.mergeBriefPacket.update({
          where: { id: packetId },
          data: { slackSentAt: new Date() }
        });
      }
    } catch (slackErr) {
      console.error(`[AsyncQueue] Non-fatal Slack error:`, slackErr.message);
    }
  }

  await logAppEvent('packet_completed', {
    pr: pull_number,
    repo,
    confidence: builtPacket.confidence,
    files: builtPacket.filesChangedCount
  });

  console.log(`[AsyncQueue] PR #${pull_number} completed successfully.`);
}

export const processQueue = processNext;
