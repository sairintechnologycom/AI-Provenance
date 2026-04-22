/**
 * Asynchronous job queue for processing PRs without blocking webhooks.
 * DB-backed implementation for reliability and recovery.
 */

import { PgBoss } from 'pg-boss';
import { analyzeCommitData } from '../core/detect.js';
import { analyzeDiffIntent } from '../core/llm.js';
import { fetchCodeOwners, getSuggestedReviewers } from '../core/codeowners.js';
import { evaluateDeterministicRisks, evaluateContentRisks, evaluateLineLevelRisks } from '../core/risk-engine.js';
import { buildPacket } from '../core/packet-builder.js';
import { updateCheckRun } from '../core/checks.js';
import { evaluatePolicy, applyPolicy } from '../core/policies.js';
import { verifyAnalysis } from '../core/verifier.js';
import { 
  parseImports, 
  calculateBlastRadius, 
  detectShadowDependencies, 
  getImpactCriticality 
} from '../core/dep-graph.js';
import { evaluateStyleVariance } from '../core/style-engine.js';
import { prisma } from './db.js';
import { sendSlackNotification } from './slack.js';
import { logAppEvent } from './analytics.js';

const QUEUE_NAME = 'analysis-jobs';

// Lazily-constructed pg-boss instance. We avoid building it at module load
// so imports (tests, CLI) don't require DATABASE_URL.
let boss = null;

function getBoss() {
  if (boss) return boss;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('[AsyncQueue] DATABASE_URL is required to initialize pg-boss.');
  }
  boss = new PgBoss({
    connectionString,
    // Defensive defaults. Override via env if you need a different cadence.
    retryLimit: Number(process.env.PGBOSS_RETRY_LIMIT || 3),
    retryBackoff: true,
    expireInHours: Number(process.env.PGBOSS_EXPIRE_HOURS || 1)
  });
  boss.on('error', (err) => console.error('[AsyncQueue] pg-boss error:', err));
  return boss;
}

/**
 * Decides whether LLM semantic analysis can be skipped for a PR.
 */
export function shouldSkipLLM(analysisResults, deterministicTags, env = process.env) {
  if (env.FORCE_LLM === 'true') return false;
  if (!Array.isArray(analysisResults) || analysisResults.length === 0) return false;
  
  const isHighRisk = Array.isArray(deterministicTags) && deterministicTags.length > 0;
  const isHighConfidenceTrailer = analysisResults.some(
    r => r && r.confidence === 100 && Array.isArray(r.methods) && r.methods.includes('trailer')
  );

  return isHighConfidenceTrailer && !isHighRisk;
}

/**
 * Initializes the pg-boss queue and starts the worker.
 *
 * pg-boss v12+ requires createQueue() before send/work, and the work
 * handler receives an array of jobs (batchSize=1 by default).
 */
export async function startQueue(githubApp) {
  const b = getBoss();
  await b.start();
  await b.createQueue(QUEUE_NAME);
  console.log(`[AsyncQueue] pg-boss started, queue "${QUEUE_NAME}" ready.`);

  await b.work(QUEUE_NAME, async ([job]) => {
    const { type, payload, installationId } = job.data;
    console.log(`[AsyncQueue] Processing ${type} job ${job.id}...`);

    const octokit = await githubApp.getInstallationOctokit(installationId);

    if (type === 'analysis') {
      await handleAnalysisJob(octokit, payload);
    } else if (type === 'telemetry') {
      await ingestTelemetry(octokit, payload);
    } else {
      console.warn(`[AsyncQueue] Unknown job type "${type}" — skipping.`);
    }
    // Errors propagate to pg-boss which applies retryLimit + backoff.
  });
}

/**
 * Graceful shutdown. Call from SIGTERM/SIGINT to let in-flight jobs finish.
 */
export async function stopQueue() {
  if (!boss) return;
  try {
    await boss.stop({ graceful: true, timeout: 30_000 });
  } finally {
    boss = null;
  }
}

/**
 * Handles the database persistence and starting the analysis for a PR.
 * Logic moved from webhook.js handlePullRequest.
 */
async function handleAnalysisJob(octokit, payload) {
  const { repository, pull_request } = payload;
  const owner = repository.owner.login;
  const repo = repository.name;
  const pull_number = pull_request.number;

  // 1. Gating Check (moved to background)
  const { checkSubscription } = await import('../core/gating.js');
  const gate = await checkSubscription({ owner, repo, isPrivate: repository.private });
  
  if (!gate.allowed) {
    const { createCheckRun } = await import('../core/checks.js');
    await createCheckRun(octokit, {
      owner, repo, sha: pull_request.head.sha,
      conclusion: 'action_required',
      output: {
        title: 'MergeBrief: Analysis Disabled',
        summary: gate.message,
        text: `Upgrade your subscription to enable analysis for private repositories.`
      }
    });
    return;
  }

  // 2. DB Persistence
  let prRecord, dbRepo, dbPacket;
  if (prisma) {
    const dbOrg = await prisma.organization.upsert({
      where: { githubId: String(repository.owner.id) },
      update: { login: owner },
      create: { githubId: String(repository.owner.id), login: owner }
    });

    dbRepo = await prisma.repository.upsert({
      where: { githubId: String(repository.id) },
      update: { owner, name: repo },
      create: { githubId: String(repository.id), owner, name: repo, organizationId: dbOrg.id }
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

    await prisma.mergeBriefPacket.deleteMany({ where: { pullRequestId: prRecord.id } });
    dbPacket = await prisma.mergeBriefPacket.create({
      data: { pullRequestId: prRecord.id, status: 'QUEUED', version: 1 }
    });
  }

  // 3. Create Check Run
  const { createCheckRun } = await import('../core/checks.js');
  const checkRun = await createCheckRun(octokit, {
    owner, repo, sha: pull_request.head.sha
  });

  if (checkRun && prisma) {
    const job = await prisma.analysisJob.create({
      data: {
        pullRequestId: prRecord.id,
        packetId: dbPacket.id,
        checkRunId: String(checkRun.id),
        status: 'QUEUED',
        payload
      }
    });

    // 4. Run the core analysis logic
    await processJob({
      octokit,
      payload,
      repoRecord: dbRepo,
      prRecord,
      checkRunId: checkRun.id,
      packetId: dbPacket.id,
      jobId: job.id
    });
  }
}

// Ensure ingestTelemetry is accessible
async function ingestTelemetry(octokit, payload) {
  const { ingestTelemetry: internalIngest } = await import('./webhook.js');
  const { repository, pull_request } = payload;
  return internalIngest(octokit, {
    owner: repository.owner.login,
    repo: repository.name,
    pull_request
  });
}

/**
 * Queues a PR for analysis via pg-boss.
 *
 * Octokit instances are not serializable, so we only persist the
 * installationId and let the worker mint its own Octokit per job.
 */
export async function queueJob(jobData) {
  const b = getBoss();

  const data = {
    ...jobData,
    installationId: jobData.payload?.installation?.id
  };
  delete data.octokit;

  const jobId = await b.send(QUEUE_NAME, data);
  console.log(`[AsyncQueue] Job enqueued to pg-boss: ${jobId}`);
  return jobId;
}

// `recoverJobs` was the in-memory queue's startup sweep. pg-boss now handles
// retries natively (see retryLimit/retryBackoff in getBoss) so that code path
// is gone. The AnalysisJob audit rows that could be left in a "QUEUED" state
// after a hard crash are a separate concern — add a dedicated sweeper when
// that becomes a real operational issue.

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

  // 3. Fetch Repository Context (Policy & Manifest)
  const { fetchRepoPolicy } = await import('../core/policies.js');
  const policy = await fetchRepoPolicy(octokit, owner, repo);

  let manifest = null;
  try {
    const { data: manifestData } = await octokit.rest.repos.getContent({
      owner, repo, path: 'package.json', ref: pull_request.head.sha
    });
    const manifestContent = Buffer.from(manifestData.content, 'base64').toString();
    manifest = JSON.parse(manifestContent);
  } catch (e) {
    console.log(`[AsyncQueue] No package.json found in ${repo} - skipping shadow dependency check.`);
  }

  // 4. Fetch PR Diffs & Commits
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner, repo, pull_number, per_page: 100
  });

  const { data: commits } = await octokit.rest.pulls.listCommits({
    owner, repo, pull_number
  });

  // Calculate Blast Radius (Tier 1)
  const dependencyMap = {};
  const allTouchedFiles = files.map(f => f.filename);
  for (const file of files) {
    if (file.status === 'removed' || !file.patch) continue;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner, repo, path: file.filename, ref: pull_request.head.sha
      });
      if (data && data.content) {
        const content = Buffer.from(data.content, 'base64').toString();
        dependencyMap[file.filename] = parseImports(content, file.filename);
      }
    } catch (e) {}
  }
  const blastRadiusFiles = calculateBlastRadius(allTouchedFiles, dependencyMap);

  // 3. AI Provenance Detection (Per-Commit)
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

    const result = await verifyAnalysis(fullDiff, {
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
  const lineLevelRisks = evaluateLineLevelRisks(diffChunk);

  // 4.1 Architectural Integrity (Phase 4)
  const allImports = Object.values(dependencyMap).flat();
  const shadowDeps = detectShadowDependencies(allImports, manifest);
  const impactCriticality = getImpactCriticality(blastRadiusFiles);
  const archTags = [];
  
  if (shadowDeps.length > 0) {
    archTags.push({ 
      category: 'shadow-dependency', 
      reason: `Undocumented dependencies detected: ${shadowDeps.join(', ')}` 
    });
  }
  
  if (impactCriticality >= 75) {
    archTags.push({ 
      category: 'high-blast-radius', 
      reason: `AI change impacts critical systems (Impact Score: ${impactCriticality})` 
    });
  }

  // 4.2 Style Variance Analysis (Phase 5)
  const styleVariance = evaluateStyleVariance(diffChunk, { namingStyle: 'camelCase' });
  const styleTags = [];
  if (styleVariance.score >= 40) {
    styleTags.push({ 
      category: 'style-inconsistency', 
      reason: `Significant stylistic deviations detected (Consistency: ${styleVariance.consistency}%)` 
    });
  }

  const deterministicTags = [...fileRiskTags, ...contentRiskTags, ...archTags, ...styleTags];
  
  const skipLLM = shouldSkipLLM(analysisResults, deterministicTags);

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

  // 5. Reviewers & Load Balancer
  const codeownersRef = await fetchCodeOwners(octokit, owner, repo);
  
  // Fetch reviewer performance stats for the Load Balancer
  let reviewerStats = {};
  if (prisma) {
    try {
      const recentEvents = await prisma.reviewEvent.findMany({
        where: { 
          pullRequest: { 
            repositoryId: repoRecord.id,
            latencySeconds: { not: null } 
          } 
        },
        include: { pullRequest: { select: { latencySeconds: true } } },
        take: 100,
        orderBy: { createdAt: 'desc' }
      });

      const latencyMap = {};
      recentEvents.forEach(ev => {
        if (!latencyMap[ev.username]) latencyMap[ev.username] = [];
        latencyMap[ev.username].push(ev.pullRequest.latencySeconds);
      });

      Object.entries(latencyMap).forEach(([user, latencies]) => {
        reviewerStats[user] = {
          avgLatencySeconds: latencies.reduce((a, b) => a + b, 0) / latencies.length
        };
      });
    } catch (dbErr) {
      console.error(`[AsyncQueue] Load Balancer stats fetch failed: ${dbErr.message}`);
    }
  }

  let suggestedReviewers = [];
  if (semanticAnalysis && semanticAnalysis.highRiskFiles) {
    suggestedReviewers = getSuggestedReviewers(semanticAnalysis.highRiskFiles, codeownersRef, reviewerStats);
  } else {
    suggestedReviewers = getSuggestedReviewers(allTouchedFiles, codeownersRef, reviewerStats);
  }

  // 6. Build the Packet
  const builtPacket = buildPacket({
    pullRequest: { id: prRecord.id },
    diffResults: analysisResults,
    semanticAnalysis,
    suggestedReviewers,
    deterministicTags,
    lineLevelRisks,
    shadowDeps,
    blastRadiusFiles,
    styleVariance
  });


  // 6.1 Agentic PR Triage & Labeling
  if (semanticAnalysis && semanticAnalysis.triage) {
    try {
      const triageLabel = `mb-triage:${semanticAnalysis.triage.toLowerCase()}`;
      await octokit.rest.issues.addLabels({
        owner, repo, issue_number: pull_number,
        labels: [triageLabel]
      });

      // Auto-approve TRIVIAL if conditions are met
      const isTrivial = semanticAnalysis.triage === 'TRIVIAL';
      const hasNoHighRisk = !semanticAnalysis.highRiskFiles || semanticAnalysis.highRiskFiles.length === 0;
      
      if (isTrivial && hasNoHighRisk && builtPacket.confidence < 50) {
        console.log(`[AsyncQueue] PR #${pull_number} is TRIVIAL and low risk. Auto-approving...`);
        await octokit.rest.issues.createComment({
          owner, repo, issue_number: pull_number,
          body: `🤖 **MergeBrief Auto-Triage**: This PR is classified as **TRIVIAL** (low risk, minor changes). \nAuto-approving to accelerate your velocity. 🚀`
        });
        
        await updateCheckRun(octokit, {
          owner, repo, check_run_id: checkRunId,
          status: 'completed',
          conclusion: 'success',
          output: {
            title: 'MergeBrief: Auto-Approved',
            summary: 'Trivial and safe change. No critical paths touched.'
          }
        });
      }
    } catch (labelErr) {
      console.error(`[AsyncQueue] Triage labeling failed: ${labelErr.message}`);
    }
  }

  if (didDiffExceedLimit && builtPacket.summary) {
     builtPacket.summary += '\n\n*(Note: Pull request was exceptionally large; LLM summary is based on a partial sample.)*';
  }

  // Calculate total latency
  const analysisEnd = Date.now();
  const latencySeconds = Math.round((analysisEnd - (jobData.addedAt || analysisEnd)) / 1000);

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
        provenanceEvidence: { create: builtPacket.provenanceEvidence },
        lineRisks: { create: builtPacket.lineRisks }
      }
    });

    await prisma.pullRequest.update({
      where: { id: prRecord.id },
      data: {
        aiTool: builtPacket.aiTool,
        confidence: builtPacket.confidence,
        latencySeconds
      }
    });

    if (jobId) {
      await prisma.analysisJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' }
      });
    }
  }

  // 8. Policy & Governance Decision
  const gatingResult = applyPolicy(builtPacket, policy);
  const policyResult = {
    action: gatingResult.decision,
    reason: gatingResult.reasons.join('; ') || 'Compliant with repository governance policy.'
  };

  if (policyResult.action === 'BLOCK') {
    console.log(`[AsyncQueue] PR #${pull_number} BLOCKED by Governance Policy: ${policyResult.reason}`);
    try {
      await octokit.rest.issues.createComment({
        owner, repo, issue_number: pull_number,
        body: `🛑 **MergeBrief Governance Alert**: This PR has been flagged for **CRITICAL AI RISK**. 
\nManual human verification is MANDATORY before merging.
\n**Blocking Reasons:**
\n- ${gatingResult.reasons.join('\n- ')}
\n[View Detailed Risk Heatmap](${packetUrl})`
      });
    } catch (commentErr) {
       console.error(`[AsyncQueue] Failed to create blocking comment: ${commentErr.message}`);
    }
  }

  // 9. Output to GitHub Check
  const appBaseUrl = process.env.BASE_UI_URL || 'http://localhost:3000';
  const packetUrl = `${appBaseUrl}/packets/${packetId}`;
  
  let checkSummary = `### 🛡️ MergeBrief Governance Report\n\n`;
  checkSummary += `**Triage**: ${semanticAnalysis?.triage || 'STANDARD'}\n`;
  checkSummary += `**Blast Radius**: ${blastRadiusFiles.length} impacted files\n`;
  checkSummary += `**AI Provenance**: ${builtPacket.confidence || 0}% confidence\n`;
  checkSummary += `**Decision**: ${policyResult.action}\n\n`;
  
  if (policyResult.reason) {
    checkSummary += `> ℹ️ **Policy Note**: ${policyResult.reason}\n\n`;
  }

  if (blastRadiusFiles.length > 0) {
    checkSummary += `#### 🔍 Impact Analysis (Blast Radius)\n`;
    checkSummary += blastRadiusFiles.slice(0, 5).map(f => `- \`${f}\``).join('\n');
    if (blastRadiusFiles.length > 5) checkSummary += `\n- ...and ${blastRadiusFiles.length - 5} more`;
    checkSummary += `\n\n`;
  }

  if (builtPacket.summary) checkSummary += `\n> ${builtPacket.summary}\n`;
  checkSummary += `\n[🔍 View Governance Details & Full Graph](${packetUrl})`;

  await updateCheckRun(octokit, {
    owner, repo, check_run_id: checkRunId,
    status: 'completed',
    conclusion: policyResult.action === 'BLOCK' ? 'failure' : (policyResult.action === 'WARN' ? 'neutral' : 'success'),
    output: {
      title: policyResult.action === 'BLOCK' ? 'Governance: Action Required' : 'Governance: Verified',
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
