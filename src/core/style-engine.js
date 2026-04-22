/**
 * Style Variance Engine
 * Detects stylistic deviations between AI-generated code and the project's established standards.
 */

/**
 * Evaluates stylistic consistency of a code chunk.
 * @param {string} content - Code to evaluate.
 * @param {Object} projectMetadata - Metadata about project-wide styles (optional).
 * @returns {Object} Variance scores and specific findings.
 */
export function evaluateStyleVariance(content, projectMetadata = {}) {
  const lines = content.split('\n');
  const findings = [];
  let varianceScore = 0;

  // 1. Naming Convention (CamelCase vs SnakeCase)
  const camelPattern = /\b[a-z]+(?:[A-Z][a-z]+)+\b/g;
  const snakePattern = /\b[a-z]+(?:_[a-z]+)+\b/g;

  const camelCount = (content.match(camelPattern) || []).length;
  const snakeCount = (content.match(snakePattern) || []).length;

  const dominantStyle = projectMetadata.namingStyle || (camelCount >= snakeCount ? 'camelCase' : 'snake_case');
  
  if (dominantStyle === 'camelCase' && snakeCount > 0) {
    findings.push({
      category: 'naming-variance',
      message: `Detected ${snakeCount} snake_case identifiers in a predominantly camelCase context.`,
      severity: 'medium'
    });
    varianceScore += 30;
  } else if (dominantStyle === 'snake_case' && camelCount > 0) {
    findings.push({
      category: 'naming-variance',
      message: `Detected ${camelCount} camelCase identifiers in a predominantly snake_case context.`,
      severity: 'medium'
    });
    varianceScore += 30;
  }

  // 2. Indentation Consistency
  const spaceIndents = lines.filter(l => /^[ ]+/.test(l)).length;
  const tabIndents = lines.filter(l => /^\t+/.test(l)).length;

  if (spaceIndents > 0 && tabIndents > 0) {
    findings.push({
      category: 'indentation-variance',
      message: 'Mixed tabs and spaces detected in AI-generated block.',
      severity: 'high'
    });
    varianceScore += 40;
  }

  // 3. AI-Specific Comment Patterns
  const aiCommentPatterns = [
    /this function/i,
    /handles the logic/i,
    /implementation of/i,
    /auto-generated/i,
    /helper function/i
  ];

  let aiCommentsCount = 0;
  lines.forEach(line => {
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
       if (aiCommentPatterns.some(p => p.test(line))) {
         aiCommentsCount++;
       }
    }
  });

  if (aiCommentsCount > 0) {
    findings.push({
      category: 'ghost-comments',
      message: `Found ${aiCommentsCount} comments with typical AI-synthesized phrasing.`,
      severity: 'low'
    });
    varianceScore += 10;
  }

  return {
    score: Math.min(varianceScore, 100),
    findings,
    consistency: 100 - Math.min(varianceScore, 100)
  };
}
