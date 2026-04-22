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

/**
 * Detects imports that are not listed in the project's dependency manifest.
 * @param {string[]} fileImports - List of imports found in a file.
 * @param {Object} manifest - Parsed package.json or similar.
 * @returns {string[]} List of "Shadow" dependencies.
 */
export function detectShadowDependencies(fileImports, manifest) {
  if (!manifest) return [];
  
  // Combine all declared dependencies
  const declared = new Set([
    ...Object.keys(manifest.dependencies || {}),
    ...Object.keys(manifest.devDependencies || {}),
    ...Object.keys(manifest.peerDependencies || {})
  ]);

  const shadow = [];

  for (const imp of fileImports) {
    // Ignore relative imports and absolute local paths
    if (imp.startsWith('.') || imp.startsWith('/')) continue;

    // Resolve package name (handle scoped packages @org/pkg)
    const parts = imp.split('/');
    const pkgName = imp.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];

    // Ignore Node.js built-ins (simplified check)
    const nodeBuiltins = ['fs', 'path', 'os', 'http', 'https', 'crypto', 'stream', 'util', 'events', 'child_process', 'fs/promises'];
    if (nodeBuiltins.includes(pkgName)) continue;

    if (!declared.has(pkgName)) {
      shadow.push(imp);
    }
  }

  return Array.from(new Set(shadow));
}

/**
 * Calculates a criticality score for the blast radius based on sensitive path patterns.
 * @param {string[]} impactedFiles - Files affected by the change.
 * @returns {number} 0-100 score.
 */
export function getImpactCriticality(impactedFiles) {
  if (!impactedFiles || impactedFiles.length === 0) return 0;

  let score = 0;
  const CRITICAL_PATTERNS = [
    /auth/i, /db/i, /database/i, /security/i, /config/i, /api/i, /middleware/i, /server/i, /core/i
  ];

  impactedFiles.forEach(file => {
    const isCritical = CRITICAL_PATTERNS.some(pattern => pattern.test(file));
    score += isCritical ? 25 : 5;
  });

  return Math.min(score, 100);
}
