const { MockOctokit, MockAnthropic, MockPrisma } = require('./mocks');

// Define the mock before requiring anything that uses it
const mockPrisma = new MockPrisma();

// Mock PrismaClient globally for the test
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
  };
});

// Mock the DB module globally for the test
jest.mock('../../src/app/db', () => ({
  prisma: mockPrisma,
  getPrisma: () => mockPrisma
}));

// Mock Anthropic SDK globally for the test
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => new MockAnthropic())
}));

// Now require webhook and queue AFTER mocks are setup
const { handlePullRequest, handleIssueComment } = require('../../src/app/webhook');
const { processQueue } = require('../../src/app/queue');

describe('MergeBrief E2E Simulation (Fully Mocked)', () => {
  let octokit;

  beforeEach(async () => {
    octokit = new MockOctokit();
    // Clear mock call history
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mockPrisma.$disconnect();
  });

  test('Step 1: AI Detected PR -> Analysis -> DB Ingestion', async () => {
    const payload = {
      action: 'opened',
      repository: {
        name: 'test-repo',
        owner: { login: 'test-org', id: 123 },
        id: 456
      },
      pull_request: {
        number: 1,
        id: 789,
        head: { sha: 'mock-sha-123' },
        base: { repo: { id: 456, owner: { id: 123 } } },
        merged: false
      }
    };

    // Trigger PR Handler (Opened)
    await handlePullRequest({ octokit, payload });

    // Verify Check Run was created (queued state)
    expect(octokit.rest.checks.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'MergeBrief AI Analysis',
      status: 'queued'
    }));
    // The background job was started automatically. Wait a bit for it to finish.
    await new Promise(r => setTimeout(r, 100));

    // Verify Check Run was updated (completed state)
    expect(octokit.rest.checks.update).toHaveBeenCalledWith(expect.objectContaining({
      check_run_id: 999,
      status: 'completed',
      conclusion: 'neutral'
    }));

  });

  test('Step 2: Human-in-the-Loop Approval', async () => {
    const payload = {
      action: 'created',
      repository: { name: 'test-repo', owner: { login: 'test-org' } },
      issue: { number: 2, pull_request: {} },
      comment: {
        body: '/merge-brief-approve: Logic is verified by human.',
        user: { login: 'maintainer-tom' }
      }
    };

    // Trigger Comment Handler
    await handleIssueComment({ octokit, payload });

    // Verify Status Check updated to 'success'
    expect(octokit.rest.repos.createCommitStatus).toHaveBeenCalledWith(expect.objectContaining({
      state: 'success',
      description: expect.stringContaining('Approved by @maintainer-tom')
    }));

    // Verify confirmation comment posted
    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.stringContaining('✅ **AI Provenance Approved**')
    }));
  });
});
