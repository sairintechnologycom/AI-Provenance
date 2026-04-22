/**
 * Policy-as-Code engine for MergeBrief.
 * Parses .mergebrief.yml from repositories to determine governance rules.
 */
import yaml from 'js-yaml';

export const DEFAULT_POLICY = {
  requireAIVerification: true,
  boilerplateRatioThreshold: 0.15,
  autoApproveTrivial: true,
  highRiskPaths: ['src/auth/**', 'src/billing/**', 'infrastructure/**', '.github/**'],
  labels: {
    triage: true,
    confidence: true
  },
  riskThresholds: {
    critical: 90, // Block if any line >= 90
    high: 75,     // Require verification if any line >= 75
    maxCumulativeScore: 500 // Block if total line-level risk exceeds this
  }
};

/**
 * Fetches and evaluates the policy for a given repository.
 */
export async function evaluatePolicy(octokit, owner, repo) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '.mergebrief.yml'
    });

    if (data && data.content) {
      const content = Buffer.from(data.content, 'base64').toString();
      const userPolicy = yaml.load(content);
      
      return {
        ...DEFAULT_POLICY,
        ...userPolicy,
        // Deep merge labels if needed
        labels: { ...DEFAULT_POLICY.labels, ...(userPolicy.labels || {}) }
      };
    }
  } catch (error) {
    if (error.status !== 404) {
       console.error(`[PolicyEngine] Error fetching policy from ${owner}/${repo}: ${error.message}`);
    }
  }

  return DEFAULT_POLICY;
}

/**
 * Evaluates a completed MergeBrief packet against a repository policy.
 * @returns { decision: 'BLOCK' | 'PASS' | 'WARN', reasons: string[] }
 */
export function applyPolicy(packet, policy = DEFAULT_POLICY) {
  const reasons = [];
  const lineRisks = packet.lineRisks || [];
  
  // 1. Check Critical Thresholds
  const criticalLines = lineRisks.filter(r => r.score >= (policy.riskThresholds?.critical || 90));
  if (criticalLines.length > 0) {
    reasons.push(`Found ${criticalLines.length} line(s) with CRITICAL risk scores (>= ${policy.riskThresholds.critical}).`);
  }

  // 2. Check Cumulative Risk
  const totalScore = lineRisks.reduce((sum, r) => sum + r.score, 0);
  if (totalScore >= (policy.riskThresholds?.maxCumulativeScore || 500)) {
    reasons.push(`Cumulative line-level risk score (${totalScore}) exceeds threshold (${policy.riskThresholds.maxCumulativeScore}).`);
  }

  // 3. High Risk Paths (Existing tags check)
  const highRiskTags = (packet.tags || []).filter(t => t.category === 'deterministic' && t.label === 'Security Sensitive');
  if (highRiskTags.length > 0 && lineRisks.some(r => r.score >= 70)) {
     reasons.push(`PR touches high-risk paths with elevated line-level risk.`);
  }

  // 3. Architectural Integrity (Phase 4)
  const hasShadowDeps = packet.tags?.some(t => t.category === 'shadow-dependency');
  if (hasShadowDeps) {
    reasons.push('PR introduces shadow dependencies not present in the manifest.');
  }

  const hasHighImpact = packet.tags?.some(t => t.category === 'high-blast-radius');
  if (hasHighImpact) {
    reasons.push('PR modifications affect high-criticality architectural systems.');
  }

  const decision = reasons.length > 0 ? 'BLOCK' : 
                   (lineRisks.some(r => r.score >= (policy.riskThresholds?.high || 75)) ? 'WARN' : 'PASS');
  
  if (decision === 'WARN' && reasons.length === 0) {
    reasons.push(`Significant AI-assisted changes detected (scores >= ${policy.riskThresholds?.high || 75}).`);
  }

  return {
    decision,
    reasons
  };
}
