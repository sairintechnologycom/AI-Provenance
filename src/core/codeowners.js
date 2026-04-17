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
 * Suggests reviewers based on high-risk files identified by LLM and CODEOWNERS rules.
 */
export function getSuggestedReviewers(highRiskFiles, codeownersContent) {
  if (!codeownersContent || !highRiskFiles || highRiskFiles.length === 0) {
    return [];
  }

  const rules = parseCodeOwners(codeownersContent);
  const suggestedReviewers = new Set();

  for (const file of highRiskFiles) {
    // CODEOWNERS rule: the last matching pattern takes precedence
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
        // Relative to root - remove leading slash as file paths are usually relative
        matchPattern = pattern.substring(1);
      } else if (!pattern.includes('/')) {
        // Patterns without slashes match anywhere (like matchBase)
        options.matchBase = true;
      } else {
        // Patterns with slashes but no leading slash are also relative to root in GitHub
        // (This is a bit different from gitignore but common in CODEOWNERS)
        // matchPattern = pattern; // already is
      }

      if (minimatch(file, matchPattern, options)) {
        bestMatch = rule;
      }
    }

    if (bestMatch) {
      bestMatch.owners.forEach(owner => suggestedReviewers.add(owner));
    }
  }

  return Array.from(suggestedReviewers);
}
