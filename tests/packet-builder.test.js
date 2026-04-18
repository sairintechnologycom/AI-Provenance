import { buildPacket, assessPacketCompleteness } from '../src/core/packet-builder.js';

describe('packet-builder', () => {
  it('should build a canonically structured packet from varied inputs', () => {
    const diffResults = [
      { aiTool: 'Copilot', confidence: 95, files: 2, methods: ['trailer'] },
      { aiTool: 'Unknown', confidence: 80, files: 1, methods: ['heuristic'] }
    ];

    const semanticAnalysis = {
      intents: ['Added authentication'],
      blastRadius: ['User Service'],
      summary: 'Added auth logic'
    };

    const deterministicTags = [
      { category: 'auth', reason: 'Touched auth.js' }
    ];

    const packet = buildPacket({
      pullRequest: { id: 'pr123' },
      diffResults,
      semanticAnalysis,
      suggestedReviewers: ['alice', 'bob'],
      deterministicTags
    });

    expect(packet.aiTool).toBe('Copilot'); // highest confidence
    expect(packet.confidence).toBe(95);
    expect(packet.filesChangedCount).toBe(3);
    
    // tags
    expect(packet.tags.length).toBe(2);
    expect(packet.tags[0].type).toBe('DETERMINISTIC');
    expect(packet.tags[1].type).toBe('INFERRED');
    expect(packet.tags[1].category).toBe('User Service');

    // provenance metadata
    expect(packet.provenanceEvidence.length).toBe(2);
    expect(packet.provenanceEvidence[0].method).toBe('trailer');
  });

  it('evaluates packet completeness', () => {
    const packet = buildPacket({
      diffResults: [{ aiTool: 'Copilot', confidence: 95, files: 2, methods: ['trailer'] }],
      semanticAnalysis: { intents: ['A'], blastRadius: ['B'], summary: 'C' }
    });

    const completeness = assessPacketCompleteness(packet);
    expect(completeness.hasProvenance).toBe(true);
    expect(completeness.hasIntentSummary).toBe(true);
    expect(completeness.hasReviewerSuggestions).toBe(false);
  });
});
