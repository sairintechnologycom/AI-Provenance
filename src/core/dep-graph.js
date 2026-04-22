/**
 * Lightweight dependency graph analysis using regex-based import parsing.
 * Provides a fast "Blast Radius" estimation without full AST parsing.
 */

const IMPORT_PATTERNS = {
  javascript: /(?:import|from|require)\s*['"]([^'"]+)['"]/g,
  typescript: /(?:import|from|require)\s*['"]([^'"]+)['"]/g,
  python: /^\s*(?:import\s+([\w\.]+)|from\s+([\w\.]+)\s+import)/gm,
  go: /^\s*import\s+(?:\(\s*([^)]+)\s*\)|"([^"]+)")/gm,
  ruby: /^\s*(?:require|require_relative)\s*['"]([^'"]+)['"]/gm
};

/**
 * Parses imports from a file content.
 * @param {string} content - File content.
 * @param {string} filename - Filename to determine language.
 * @returns {string[]} List of dependencies/imports.
 */
export function parseImports(content, filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const imports = new Set();
  
  let pattern = IMPORT_PATTERNS.javascript; // Default
  if (['py'].includes(ext)) pattern = IMPORT_PATTERNS.python;
  if (['go'].includes(ext)) pattern = IMPORT_PATTERNS.go;
  if (['rb'].includes(ext)) pattern = IMPORT_PATTERNS.ruby;

  let match;
  while ((match = pattern.exec(content)) !== null) {
    // Handle specific group captures based on language
    const dep = match[1] || match[2];
    if (dep) {
       // Clean up Go multi-line imports or Python dots
       imports.add(dep.trim());
    }
  }
  
  return Array.from(imports);
}

/**
 * Calculates the "Blast Radius" of a list of changed files.
 * This is a Tier 1 heuristic: if File A is changed, what else imports it?
 * @param {string[]} changedFiles - List of files that were modified.
 * @param {Map<string, string[]>} dependencyMap - Map of [File] -> [Dependencies it has]
 * @returns {string[]} List of impacted files.
 */
export function calculateBlastRadius(changedFiles, dependencyMap) {
  const impacted = new Set();
  
  // Inverse the map: [Dependency] -> [Files that import it]
  const inverseMap = {};
  for (const [file, deps] of Object.entries(dependencyMap)) {
    for (const dep of deps) {
      if (!inverseMap[dep]) inverseMap[dep] = [];
      inverseMap[dep].push(file);
    }
  }

  const queue = [...changedFiles];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    // Find who imports this file
    // Note: This requires resolving path names which is hard with regex. 
    // Tier 1 logic: just look for filename matches in imports.
    const filename = current.split('/').pop()?.split('.')[0];
    if (!filename) continue;

    for (const [dep, importers] of Object.entries(inverseMap)) {
      if (dep.includes(filename)) {
        importers.forEach(imp => {
          if (!impacted.has(imp)) {
            impacted.add(imp);
            queue.push(imp); // Recurse for deeper blast radius
          }
        });
      }
    }
  }

  return Array.from(impacted);
}
