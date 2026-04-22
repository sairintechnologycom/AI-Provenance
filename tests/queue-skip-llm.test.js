import { jest } from '@jest/globals';

const { shouldSkipLLM } = await import('../src/app/queue.js');

describe('shouldSkipLLM', () => {
  const originalEnv = process.env.FORCE_LLM;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.FORCE_LLM;
    else process.env.FORCE_LLM = originalEnv;
  });

  it('is defined and does not throw a ReferenceError (regression: isHighConfidenceTrailer was undefined)', () => {
    expect(typeof shouldSkipLLM).toBe('function');
    expect(() => shouldSkipLLM([], [])).not.toThrow();
  });

  it('skips LLM when every commit has a trailer-sourced 100% confidence and no risk tags', () => {
    const analysisResults = [
      { confidence: 100, methods: ['trailer'] },
      { confidence: 100, methods: ['trailer'] }
    ];
    expect(shouldSkipLLM(analysisResults, [], {})).toBe(true);
  });

  it('runs LLM when any deterministic risk tag fires, even with full trailer coverage', () => {
    const analysisResults = [{ confidence: 100, methods: ['trailer'] }];
    const deterministicTags = [{ category: 'auth', reason: 'Auth files touched' }];
    expect(shouldSkipLLM(analysisResults, deterministicTags, {})).toBe(false);
  });

  it('runs LLM when confidence came from heuristics (no trailer method)', () => {
    const analysisResults = [{ confidence: 85, methods: ['heuristic-explicit'] }];
    expect(shouldSkipLLM(analysisResults, [], {})).toBe(false);
  });

  it('skips LLM when at least one commit in a multi-commit PR has a trailer and no risk tags fire', () => {
    // Current semantics: trailer on any commit is enough. Caveat worth a future review —
    // a heuristic-only companion commit bypasses LLM analysis today.
    const analysisResults = [
      { confidence: 100, methods: ['trailer'] },
      { confidence: 60, methods: ['fingerprint:excessive-jsdoc'] }
    ];
    expect(shouldSkipLLM(analysisResults, [], {})).toBe(true);
  });

  it('runs LLM when FORCE_LLM=true overrides even a clean trailer-only PR', () => {
    const analysisResults = [{ confidence: 100, methods: ['trailer'] }];
    expect(shouldSkipLLM(analysisResults, [], { FORCE_LLM: 'true' })).toBe(false);
  });

  it('runs LLM when there are no analysisResults at all (nothing to trust)', () => {
    expect(shouldSkipLLM([], [], {})).toBe(false);
  });

  it('tolerates missing methods/confidence fields without throwing', () => {
    expect(() => shouldSkipLLM([{ confidence: 100 }], [], {})).not.toThrow();
    expect(shouldSkipLLM([{ confidence: 100 }], [], {})).toBe(false);
    expect(shouldSkipLLM([{ methods: ['trailer'] }], [], {})).toBe(false);
  });

  it('tolerates non-array inputs without throwing', () => {
    expect(() => shouldSkipLLM(null, null, {})).not.toThrow();
    expect(shouldSkipLLM(null, null, {})).toBe(false);
    expect(shouldSkipLLM(undefined, undefined, {})).toBe(false);
  });
});
