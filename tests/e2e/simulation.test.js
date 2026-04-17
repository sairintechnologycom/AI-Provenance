const { handlePullRequest, handleIssueComment } = require('../../src/app/webhook');
const { MockOctokit, MockAnthropic, MockPrisma } = require('./mocks');

// Define the mock before requiring anything that uses it
const mockPrisma = new MockPrisma();

// Mock the DB module globally for the test
jest.mock('../../src/app/db', () => ({
  prisma: mockPrisma,
  getPrisma: () => mockPrisma
}));

// Mock Anthropic SDK globally for the test
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => new MockAnthropic())
}));

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

    // Verify Status Check was updated
    expect(octokit.rest.repos.createCommitStatus).toHaveBeenCalledWith(expect.objectContaining({
      state: 'pending',
      context: 'MergeBrief Approval'
    }));

    // Verify Comment was posted
    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.stringContaining('### MergeBrief AI Provenance Summary')
    }));

    // Simulate PR Merge (Ingestion)
    const closedPayload = {
      ...payload,
      action: 'closed',
      pull_request: {
        ...payload.pull_request,
        merged: true
      }
    };
    
    // We need to mock listComments to return the bot comment for ingestion regex
    octokit.rest.issues.listComments.mockResolvedValue({
      data: [{
        user: { type: 'Bot' },
        body: '### MergeBrief AI Provenance Summary\n\n| Commit | AI Tool | Confidence | Files | Added | Removed |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n| `mock-sha` | **Copilot** | 100% | 1 | 1 | 0 |'
      }]
    });

    await handlePullRequest({ octokit, payload: closedPayload });

    // Verify Telemetry Record was upserted/created in DB
    expect(mockPrisma.pullRequest.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        aiTool: 'Copilot',
        confidence: 100
      })
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
