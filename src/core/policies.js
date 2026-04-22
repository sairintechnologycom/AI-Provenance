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
