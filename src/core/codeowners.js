import { minimatch } from 'minimatch';

/**
 * Fetches the CODEOWNERS file from several standard locations.
 */
export async function fetchCodeOwners(octokit, owner, repo) {
  const possiblePaths = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'];
  
  for (const path of possiblePaths) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });
      
      if (data && data.content) {
        return Buffer.from(data.content, 'base64').toString();
      }
    } catch (error) {
      // 404 is expected if file doesn't exist at this specific path
      if (error.status !== 404) {
        console.error(`[CodeOwners] Error fetching from ${path}: ${error.message}`);
      }
    }
  }
  
  return null;
}

/**
 * Parses CODEOWNERS content into a list of rules.
 */
function parseCodeOwners(content) {
  if (!content) return [];
  
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const parts = line.split(/\s+/);
      const pattern = parts[0];
      const owners = parts.slice(1);
      return { pattern, owners };
    });
}

/**
 * Suggests reviewers based on high-risk files and CODEOWNERS rules.
 * Optinally weights by historical performance (Reviewer Load Balancer).
 */
export function getSuggestedReviewers(highRiskFiles, codeownersContent, reviewerStats = {}) {
  if (!codeownersContent || !highRiskFiles || highRiskFiles.length === 0) {
    return [];
  }

  const rules = parseCodeOwners(codeownersContent);
  const suggestedReviewers = new Set();

  for (const file of highRiskFiles) {
    let bestMatch = null;
    
    for (const rule of rules) {
      let pattern = rule.pattern;
      const isAbsolute = pattern.startsWith('/');
      
      if (pattern.endsWith('/')) {
        pattern += '**';
      }

      const options = { dot: true };
      let matchPattern = pattern;

      if (isAbsolute) {
        matchPattern = pattern.substring(1);
      } else if (!pattern.includes('/')) {
        options.matchBase = true;
      }

      if (minimatch(file, matchPattern, options)) {
        bestMatch = rule;
      }
    }

    if (bestMatch) {
      bestMatch.owners.forEach(owner => {
        suggestedReviewers.add(owner);
      });
    }
  }

  const reviewers = Array.from(suggestedReviewers);

  // Sorting logic for Load Balancer: Lowest Latency First
  if (Object.keys(reviewerStats).length > 0) {
    return reviewers.sort((a, b) => {
      const nameA = a.startsWith('@') ? a.substring(1) : a;
      const nameB = b.startsWith('@') ? b.substring(1) : b;
      const latencyA = reviewerStats[nameA]?.avgLatencySeconds || 999999;
      const latencyB = reviewerStats[nameB]?.avgLatencySeconds || 999999;
      return latencyA - latencyB;
    });
  }

  return reviewers;
}
