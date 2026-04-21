/**
 * Asynchronous job queue for processing PRs without blocking webhooks.
 * DB-backed implementation for reliability and recovery.
 */

import { analyzeCommitData } from '../core/detect.js';
import { analyzeDiffIntent } from '../core/llm.js';
import { fetchCodeOwners, getSuggestedReviewers } from '../core/codeowners.js';
import { evaluateDeterministicRisks, evaluateContentRisks } from '../core/risk-engine.js';
import { buildPacket } from '../core/packet-builder.js';
import { updateCheckRun } from '../core/checks.js';
import { evaluatePolicy } from '../core/policies.js';
import { verifyAIGeneration } from '../core/llm-verifier.js';
import { prisma } from './db.js';
import { sendSlackNotification } from './slack.js';
import { logAppEvent } from './analytics.js';

const queue = [];
let isProcessing = false;

/**
 * Queues a PR for analysis
 */
export function queueJob({ octokit, payload, repoRecord, prRecord, checkRunId, packetId, jobId }) {
  queue.push({
    octokit, payload, repoRecord, prRecord, checkRunId, packetId, jobId, addedAt: Date.now()
  });
  
  if (!isProcessing) {
    processNext();
  }
}

/**
 * Recovers stuck jobs from the database on startup.
 */
export async function recoverJobs(octokitApp) {
  if (!prisma) return;

  console.log('[AsyncQueue] Checking for jobs to recover...');
  
  const stuckJobs = await prisma.analysisJob.findMany({
    where: {
      status: { in: ['QUEUED', 'PROCESSING'] }
    },
    include: {
      pullRequest: {
        include: {
          repository: true
        }
      }
    }
  });

  if (stuckJobs.length === 0) {
    console.log('[AsyncQueue] No stuck jobs found.');
    return;
  }

  console.log(`[AsyncQueue] Recovering ${stuckJobs.length} stuck jobs...`);

  for (const job of stuckJobs) {
    try {
      const { pullRequest, payload, checkRunId, packetId } = job;
      const { repository } = pullRequest;

      // We need an octokit instance for this installation
      // The payload should have installation.id
      const installationId = payload?.installation?.id;
      if (!installationId) {
        console.error(`[AsyncQueue] Cannot recover job ${job.id}: missing installation.id in payload`);
        continue;
      }

      const octokit = await octokitApp.getInstallationOctokit(installationId);

      queueJob({
        octokit,
        payload,
        repoRecord: repository,
        prRecord: pullRequest,
        checkRunId: checkRunId ? parseInt(checkRunId) : null,
        packetId,
        jobId: job.id
      });
    } catch (error) {
      console.error(`[AsyncQueue] Failed to recover job ${job.id}:`, error.message);
    }
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

        if (jobParams.jobId) {
          await prisma.analysisJob.update({
            where: { id: jobParams.jobId },
            data: { 
              status: 'FAILED',
              errorDetail: error.message
            }
          });
        }
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

async function processJob({ octokit, payload, repoRecord, prRecord, checkRunId, packetId, jobId }) {
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

    if (jobId) {
      await prisma.analysisJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' }
      });
    }
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

    // Integrated LLM Verification for inferred results
    if (process.env.ENABLE_LLM_VERIFICATION === 'true' && result.confidence > 0 && result.confidence < 100) {
      try {
        const verification = await verifyAIGeneration(fullDiff, result.confidence, result.methods);
        if (verification.verified) {
          result.confidence = verification.verifiedConfidence;
          result.methods.push(`llm-verified:${verification.consensus.toLowerCase()}`);
          result.verificationReason = verification.reason;
        }
      } catch (err) {
        console.error(`[AsyncQueue] LLM Verification failed for commit ${commit.sha}: ${err.message}`);
      }
    }

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
  
  // 4. Risk Engine Evaluation
  const fileRiskTags = evaluateDeterministicRisks(allTouchedFiles);
  const contentRiskTags = evaluateContentRisks(diffChunk);
  const deterministicTags = [...fileRiskTags, ...contentRiskTags];
  
  const isHighRisk = deterministicTags.length > 0;
  
  const skipLLM = isHighConfidenceTrailer && !isHighRisk && process.env.FORCE_LLM !== 'true';

  if (!skipLLM && (analysisResults.length > 0 || totalAdditions > 0)) {
     console.log(`[AsyncQueue] Running LLM semantic analysis for PR #${pull_number}...`);
     semanticAnalysis = await analyzeDiffIntent(diffChunk, analysisResults);
  } else if (skipLLM) {
     console.log(`[AsyncQueue] Skipping LLM analysis for PR #${pull_number} (High confidence trailer + Low risk).`);
     semanticAnalysis = {
       intents: ['AI-generated changes (Confirmed by commit trailer)'],
       blastRadius: ['Low risk areas'],
       highRiskFiles: []
     };
  }

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

    if (jobId) {
      await prisma.analysisJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' }
      });
    }
  }

  // 8. Policy Evaluation
  const policyResult = evaluatePolicy(builtPacket, commits.flatMap(c => c.files || []), {
    blockThreshold: parseInt(process.env.POLICY_BLOCK_THRESHOLD || '90'),
    warnThreshold: parseInt(process.env.POLICY_WARN_THRESHOLD || '50'),
    strictMode: process.env.POLICY_STRICT_MODE === 'true',
    criticalPaths: [
      '**/auth/**', '**/billing/**', '**/security/**', '**/crypto/**',
      'src/core/gating.js', 'prisma/schema.prisma'
    ]
  });

  // 9. Output to GitHub Check
  const appBaseUrl = process.env.BASE_UI_URL || 'http://localhost:3001';
  const packetUrl = `${appBaseUrl}/packets/${packetId}`;
  
  let checkSummary = `### MergeBrief Packet Generated\n\n`;
  checkSummary += `**Packet Status**: COMPLETED\n`;
  checkSummary += `**Confidence**: ${builtPacket.confidence || 0}% AI Evidence\n`;
  checkSummary += `**Policy Decision**: ${policyResult.action}\n\n`;
  
  if (policyResult.reason) {
    checkSummary += `> ℹ️ **Reason**: ${policyResult.reason}\n\n`;
  }

  if (builtPacket.summary) checkSummary += `\n> ${builtPacket.summary}\n`;
  checkSummary += `\n[🔍 View Full Packet & Risk Details](${packetUrl})`;

  await updateCheckRun(octokit, {
    owner, repo, check_run_id: checkRunId,
    status: 'completed',
    conclusion: policyResult.action === 'BLOCK' ? 'failure' : (policyResult.action === 'WARN' ? 'neutral' : 'success'),
    output: {
      title: policyResult.action === 'BLOCK' ? 'MergeBrief: Action Required' : 'MergeBrief Analysis',
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
