/**
 * Packet Builder Service
 * Converts AI core detect results and LLM semantic intent analysis into a canonical MergeBrief packet.
 */

function buildPacket({
  pullRequest,
  diffResults = [],
  semanticAnalysis = null,
  suggestedReviewers = [],
  deterministicTags = []
}) {
  const packetId = `pkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // aggregate overarching stats from internal results
  let filesChangedCount = 0;
  let maxConfidence = 0;
  let primaryAiTool = null;
  const provenanceEvidence = [];

  diffResults.forEach(r => {
    if (r.files) filesChangedCount += r.files;
    if (r.confidence > maxConfidence) {
      maxConfidence = r.confidence;
      primaryAiTool = r.aiTool;
    }
    
    // Convert core detect results to evidence format
    r.methods?.forEach(method => {
      provenanceEvidence.push({
        method,
        confidence: r.confidence,
        file: r.file || null // if file-level granularity is present
      });
    });
  });

  const intents = semanticAnalysis?.intents?.map(intent => ({ detail: intent })) || [];
  
  // Deterministic Tags
  const formattedDeterministicTags = deterministicTags.map(tag => ({
    type: 'DETERMINISTIC',
    category: tag.category,
    reason: tag.reason
  }));

  // Inferred Tags (Blast Radius) from Semantic Analysis
  const inferredTags = semanticAnalysis?.blastRadius?.map(area => ({
    type: 'INFERRED',
    category: area,
    reason: 'Derived from semantic analysis of the diff.'
  })) || [];

  const allTags = [...formattedDeterministicTags, ...inferredTags];

  const formattedReviewers = suggestedReviewers.map(username => ({
    username,
    reason: 'Suggested from CODEOWNERS based on affected paths.'
  }));

  const packet = {
    id: packetId,
    version: 1,
    status: 'COMPLETED',
    summary: semanticAnalysis?.summary || 'Provenance analysis complete',
    aiTool: primaryAiTool,
    confidence: maxConfidence,
    filesChangedCount,
    tags: allTags,
    intents,
    reviewerSuggestions: formattedReviewers,
    provenanceEvidence,
    rawPayload: JSON.stringify({ diffResults, semanticAnalysis })
  };

  return packet;
}

/**
 * Checks if the packet contains useful fields or needs review.
 */
function assessPacketCompleteness(packet) {
  return {
    hasProvenance: packet.provenanceEvidence.length > 0,
    hasReviewerSuggestions: packet.reviewerSuggestions.length > 0,
    hasRiskTags: packet.tags.length > 0,
    hasIntentSummary: packet.intents.length > 0
  };
}

module.exports = {
  buildPacket,
  assessPacketCompleteness
};
