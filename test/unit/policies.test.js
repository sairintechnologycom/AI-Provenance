import { applyPolicy, DEFAULT_POLICY } from '../../src/core/policies.js';

describe('Policy Engine Pivot Verification', () => {
  const mockPacket = {
    lineRisks: [
      { score: 95, line: 10 }
    ],
    tags: []
  };

  test('BLOCK mode correctly blocks on high risk', () => {
    const policy = { ...DEFAULT_POLICY, mode: 'BLOCK' };
    const result = applyPolicy(mockPacket, policy);
    expect(result.decision).toBe('BLOCK');
    expect(result.reasons[0]).toContain('CRITICAL risk');
  });

  test('ADVISORY mode downgrades BLOCK to WARN', () => {
    const policy = { ...DEFAULT_POLICY, mode: 'ADVISORY' };
    const result = applyPolicy(mockPacket, policy);
    expect(result.decision).toBe('WARN');
    expect(result.reasons[0]).toContain('ADVISORY MODE');
  });

  test('OBSERVE mode always passes', () => {
    const policy = { ...DEFAULT_POLICY, mode: 'OBSERVE' };
    const result = applyPolicy(mockPacket, policy);
    expect(result.decision).toBe('PASS');
    expect(result.reasons[0]).toContain('OBSERVE MODE');
  });

  test('PASS decision remains PASS in all modes', () => {
    const cleanPacket = { lineRisks: [{ score: 10, line: 1 }], tags: [] };
    const modes = ['OBSERVE', 'ADVISORY', 'BLOCK'];
    
    modes.forEach(mode => {
      const result = applyPolicy(cleanPacket, { ...DEFAULT_POLICY, mode });
      expect(result.decision).toBe('PASS');
    });
  });
});
