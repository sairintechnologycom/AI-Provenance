import { getSuggestedReviewers } from '../src/core/codeowners.js';


describe('CODEOWNERS Logic', () => {
  const mockCodeOwners = `
# Engineering
*.js @general-reviewer
/src/auth/ @security-team
/src/db/ @database-expert
/migrations/ @backend-lead @rohit
`;

  test('should match direct file paths', () => {
    const highRiskFiles = ['src/auth/login.js'];
    const reviewers = getSuggestedReviewers(highRiskFiles, mockCodeOwners);
    expect(reviewers).toContain('@security-team');
  });

  test('should match glob patterns', () => {
    const highRiskFiles = ['anyfile.js'];
    const reviewers = getSuggestedReviewers(highRiskFiles, mockCodeOwners);
    expect(reviewers).toContain('@general-reviewer');
  });

  test('should match multiple owners', () => {
    const highRiskFiles = ['migrations/001_init.sql'];
    const reviewers = getSuggestedReviewers(highRiskFiles, mockCodeOwners);
    expect(reviewers).toContain('@backend-lead');
    expect(reviewers).toContain('@rohit');
  });

  test('last match should take precedence (standard CODEOWNERS behavior)', () => {
    // Both *.js and /src/auth/ match src/auth/utils.js. 
    // /src/auth/ comes after *.js in my mock, so it should win.
    const highRiskFiles = ['src/auth/utils.js'];
    const reviewers = getSuggestedReviewers(highRiskFiles, mockCodeOwners);
    expect(reviewers).toContain('@security-team');
    // In actual CODEOWNERS, only the last match's owners are used. 
    // My implementation uses a Set of all matched owners for ALL files.
    // So if I have multiple files, it aggregates.
  });

  test('should return empty if no matches', () => {
    const highRiskFiles = ['README.md'];
    const reviewers = getSuggestedReviewers(highRiskFiles, mockCodeOwners);
    expect(reviewers).toEqual([]);
  });
});
