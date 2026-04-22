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
      pattern: /(your_api_key_here|insert_.*_here|example\.com\/api|test\.com\/api|REPLACE_ME|TODO_AI|FIXME_AI)/i,
      reason: 'Unreplaced AI placeholder or template value detected.'
    },
    {
      category: 'prompt-injection',
      pattern: /(ignore (all )?previous instructions|you are now|new rule:|system (prompt|message):|forget everything)/i,
      reason: 'Potential prompt injection attempt detected in code diff.'
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

/**
 * Analyzes a unified diff to identify specific lines with high risk or uncertainty.
 * @param {string} diff - Unified diff string.
 * @returns {Array<{file: string, line: number, score: number, reason: string}>}
 */
export function evaluateLineLevelRisks(diff) {
  const lineRisks = [];
  const lines = diff.split('\n');
  let currentFile = '';
  let currentLine = 0;

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.substring(6);
      continue;
    }
    if (line.startsWith('@@ ')) {
      const match = line.match(/\+([0-9]+)/);
      if (match) currentLine = parseInt(match[1]) - 1;
      continue;
    }

    if (line.startsWith('+')) {
      currentLine++;
      const content = line.substring(1).trim();
      if (!content) continue;

      // 1. AI Artifacts / Leaks (High Risk)
      if (/(as an? ai (language )?model|honest?ly, I (don't|cannot)|here'?s a? (template|suggested|example))/i.test(content)) {
        lineRisks.push({
          file: currentFile,
          line: currentLine,
          score: 95,
          reason: 'AI chat residue detected.'
        });
      }

      // 2. Hallucinated Imports (High Risk)
      if (/(import|require|from)\s*['"](@?[a-z0-9-]+\/[a-z0-9-]+-implementation-helper|universal-.*-generator-api|mock-database-connector-pro)['"]/i.test(content)) {
        lineRisks.push({
          file: currentFile,
          line: currentLine,
          score: 90,
          reason: 'Potential hallucinated library import.'
        });
      }

      // 3. Complexity Spike & Obfuscation (Medium Risk)
      const operators = (content.match(/[&|?<>!=]{2,}|=>/g) || []).length;
      const isBase64 = /[A-Za-z0-9+/]{40,}=*/.test(content);
      const isLargeData = (content.match(/[,:\[\{]/g) || []).length > 8;
      
      if (operators > 3 || content.length > 150 || isBase64 || isLargeData) {
        lineRisks.push({
          file: currentFile,
          line: currentLine,
          score: 65,
          reason: isBase64 ? 'Potential obfuscated binary data.' : 
                  isLargeData ? 'Unusually large data structure density.' :
                  'High logic density (complexity spike).'
        });
      }
      
      // 4. Placeholder values
      if (/(your_api_key_here|insert_.*_here|example\.com\/api|test\.com\/api|REPLACE_ME|TODO_AI|FIXME_AI)/i.test(content)) {
        lineRisks.push({
          file: currentFile,
          line: currentLine,
          score: 85,
          reason: 'Unreplaced AI placeholder detected.'
        });
      }

      // 5. Prompt Injection (Critical)
      if (/(ignore (all )?previous instructions|you are now|new rule:|system (prompt|message):|forget everything)/i.test(content)) {
        lineRisks.push({
          file: currentFile,
          line: currentLine,
          score: 100,
          reason: 'High-confidence Prompt Injection attempt detected.'
        });
      }
    } else if (!line.startsWith('-')) {
      currentLine++;
    }
  }

  return lineRisks;
}
