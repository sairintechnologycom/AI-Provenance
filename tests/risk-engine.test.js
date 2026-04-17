const { evaluateDeterministicRisks } = require('../src/core/risk-engine');

describe('risk-engine', () => {
  it('should identify auth and config patterns correctly', () => {
    const files = [
      'src/components/button.tsx',
      'src/server/auth/passport-setup.js',
      '.env.example'
    ];
    
    const risks = evaluateDeterministicRisks(files);
    
    expect(risks).toHaveLength(2);
    
    const categories = risks.map(r => r.category);
    expect(categories).toContain('auth');
    expect(categories).toContain('secrets-config');
    
    const authRisk = risks.find(r => r.category === 'auth');
    expect(authRisk.reason).toContain('src/server/auth/passport-setup.js');
  });

  it('should handle empty or unrelated file paths', () => {
    const risks = evaluateDeterministicRisks(['src/utils/math.js']);
    expect(risks).toHaveLength(0);
  });

  it('should deduplicate multiple files for the same category', () => {
    const files = [
      'package.json',
      'yarn.lock'
    ];
    const risks = evaluateDeterministicRisks(files);
    expect(risks).toHaveLength(1);
    expect(risks[0].category).toBe('dependency-change');
    expect(risks[0].reason).toContain('package.json, yarn.lock');
  });
});
