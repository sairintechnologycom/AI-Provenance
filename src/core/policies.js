import { minimatch } from 'minimatch';

/**
 * Gating Policy Engine
 * Determines if a Pull Request should be blocked or flagged based on AI presence.
 */

const DEFAULT_POLICY = {
  blockThreshold: 90, // Block if confidence > 90%
  warnThreshold: 50,  // Warn if confidence > 50%
  criticalPaths: [
    '**/auth/**',
    '**/billing/**',
    '**/security/**',
    '**/crypto/**',
    'src/core/gating.js',
    'prisma/schema.prisma'
  ],
  strictMode: false // If true, blockThreshold drops to 70 for critical paths
};

/**
 * Evaluates a set of files and analysis results against a policy.
 * @returns { action: 'BLOCK' | 'WARN' | 'ALLOW', reason: string }
 */
export function evaluatePolicy(analysis, files, orgPolicy = DEFAULT_POLICY) {
  const { confidence, aiTool } = analysis;
  
  // 1. Check for critical path violations
  const changedFiles = Array.isArray(files) ? files.map(f => f.filename) : [];
  const hitCriticalPath = changedFiles.some(file => 
    orgPolicy.criticalPaths.some(pattern => minimatch(file, pattern))
  );

  const effectiveBlockThreshold = (orgPolicy.strictMode && hitCriticalPath) 
    ? Math.max(20, orgPolicy.blockThreshold - 20) 
    : orgPolicy.blockThreshold;

  if (confidence >= effectiveBlockThreshold) {
    if (hitCriticalPath) {
      return { 
        action: 'BLOCK', 
        reason: `AI-generated code (${aiTool}, ${confidence}%) detected in critical paths: ${changedFiles.filter(f => orgPolicy.criticalPaths.some(p => minimatch(f, p))).join(', ')}` 
      };
    }
    return { 
      action: 'BLOCK', 
      reason: `High confidence AI-generated code detected (${confidence}%). Threshold is ${effectiveBlockThreshold}%.` 
    };
  }

  if (confidence >= orgPolicy.warnThreshold) {
    return { 
      action: 'WARN', 
      reason: `Potential AI-generated code detected (${confidence}%). Review required.` 
    };
  }

  return { action: 'ALLOW', reason: 'No significant AI presence detected or below thresholds.' };
}
