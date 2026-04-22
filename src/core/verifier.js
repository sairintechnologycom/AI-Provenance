import { verifyAIGeneration } from './llm-verifier.js';

/**
 * Unified verification helper that handles LLM verification for inferred results.
 * Reduces duplication between detect.js and queue.js.
 */
export async function verifyAnalysis(diff, currentResult) {
  if (process.env.ENABLE_LLM_VERIFICATION !== 'true') {
    return currentResult;
  }

  // Only verify if there is some confidence but not yet 100%
  if (currentResult.confidence > 0 && currentResult.confidence < 100) {
    try {
      const verification = await verifyAIGeneration(diff, currentResult.confidence, currentResult.methods);
      if (verification && verification.verified) {
        const updatedResult = { ...currentResult };
        updatedResult.confidence = verification.verifiedConfidence;
        updatedResult.methods = [...(currentResult.methods || [])];
        updatedResult.methods.push(`llm-verified:${verification.consensus.toLowerCase()}`);
        updatedResult.verificationReason = verification.reason;
        return updatedResult;
      }
    } catch (err) {
      console.error(`[Verifier] LLM Verification failed: ${err.message}`);
    }
  }

  return currentResult;
}
