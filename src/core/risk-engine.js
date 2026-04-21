/**
 * Deterministic Risk Tagging Engine
 * Evaluates touched files against known patterns to flag specific risk categories.
 */

export const RISK_RULES = [
  {
    category: 'auth',
    pattern: /(auth(entication|orization)?|login|passport|jwt|session|cookie|token|oauth|mfa|saml|sso)/i,
    reason: 'Modification of authentication or authorization logic.'
  },
  {
    category: 'billing',
    pattern: /(stripe|billing|payment|checkout|invoice|subscription|plan)/i,
    reason: 'Modification of payment or billing logic.'
  },
  {
    category: 'infra',
    pattern: /(\.pdf|docker|terraform|\.tf|kubernetes|helm|\.yaml|\.yml|k8s|cloudformation)/i,
    reason: 'Modification to infrastructure configuration or deployment manifests.'
  },
  {
    category: 'ci-cd',
    pattern: /(\.github\/workflows|\.gitlab-ci|azure-pipelines|jenkins|drone)/i,
    reason: 'Modification of CI/CD pipelines.'
  },
  {
    category: 'secrets-config',
    pattern: /(\.env|config|secrets|credentials|aws.*credentials|gcp.*json)/i,
    reason: 'Modification to potential secret or environment configuration files.'
  },
  {
    category: 'database-schema',
    pattern: /(prisma\/.*\.(prisma|sql)|migrations\/.*\.sql|init\.sql|schema\.rb)/i,
    reason: 'Modification to database schema or migrations.'
  },
  {
    category: 'dependency-change',
    pattern: /(package\.json|package-lock\.json|yarn\.lock|Gemfile|requirements\.txt|pom\.xml|go\.mod|go\.sum)/i,
    reason: 'Modification to project dependencies.'
  }
];

/**
 * Given a list of touched file paths, returns applicable deterministic risk tags.
 * @param {string[]} filePaths - Array of touched file paths.
 * @returns {Array<{category: string, reason: string}>} Array of unique tags.
 */
export function evaluateDeterministicRisks(filePaths) {
  const matchedTags = new Map();

  for (const filePath of filePaths) {
    if (!filePath) continue;
    
    for (const rule of RISK_RULES) {
      if (rule.pattern.test(filePath)) {
        if (!matchedTags.has(rule.category)) {
          matchedTags.set(rule.category, {
            category: rule.category,
            reason: rule.reason,
            files: [filePath]
          });
        } else {
          matchedTags.get(rule.category).files.push(filePath);
        }
      }
    }
  }

  // Convert map back to an array, joining the matching paths for the reason.
  const results = [];
  for (const tag of matchedTags.values()) {
    const fileSample = tag.files.slice(0, 3).join(', ') + (tag.files.length > 3 ? ` and ${tag.files.length - 3} more` : '');
    results.push({
      category: tag.category,
      reason: `${tag.reason} Affected files: [${fileSample}].`
    });
  }

  return results;
}
/**
 * Evaluates the actual content of a diff for AI-specific risks (hallucinations, leaks).
 * @param {string} diff - The unified diff text.
 * @returns {Array<{category: string, reason: string}>} Array of risk tags.
 */
export function evaluateContentRisks(diff) {
  const contentRisks = [];

  // 1. AI "Leaks" (Phrases that shouldn't be in production code)
  const leakPatterns = [
    {
      category: 'ai-artifact',
      pattern: /(as an? ai (language )?model|honest?ly, I (don't|cannot)|here'?s a? (template|suggested|example) (implementation|code))/i,
      reason: 'AI chat residue/disclaimer detected in code comments or strings.'
    },
    {
      category: 'placeholder',
      pattern: /(your_api_key_here|insert_.*_here|example\.com\/api|REPLACE_ME)/i,
      reason: 'Unreplaced AI placeholder or template value detected.'
    }
  ];

  for (const risk of leakPatterns) {
    if (risk.pattern.test(diff)) {
      contentRisks.push({ category: risk.category, reason: risk.reason });
    }
  }

  // 2. Likely Hallucinated Imports
  // Heuristic: Very long, descriptive, or unusually named libraries that don't exist in major ecosystems.
  const suspiciousImports = diff.match(/(import|require|from)\s*['"](@?[a-z0-9-]+\/[a-z0-9-]+-implementation-helper|universal-.*-generator-api|mock-database-connector-pro)['"]/gi);
  if (suspiciousImports) {
    contentRisks.push({
      category: 'hallucination',
      reason: `Potential hallucinated libraries detected: [${suspiciousImports.slice(0, 2).map(i => i.trim()).join(', ')}].`
    });
  }

  return contentRisks;
}
