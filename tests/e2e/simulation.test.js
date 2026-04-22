import { jest } from '@jest/globals';
import { MockOctokit, MockAnthropic, MockPrisma } from './mocks.js';

// Shared mock Prisma instance consumed by src/app/db.js
const mockPrisma = new MockPrisma();

// 1. Mock PrismaClient globally (defensive — nothing should instantiate it directly)
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

// 2. Mock the DB module so src/app imports see our mock
jest.unstable_mockModule('../../src/app/db.js', () => ({
  prisma: mockPrisma,
  getPrisma: () => mockPrisma
}));

// 3. Mock Anthropic SDK
jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => new MockAnthropic())
}));

// 4. Mock the queue. After the pg-boss migration, handlePullRequest just
// fast-enqueues; the worker does the real work. For end-to-end coverage at
// the webhook boundary, we only need to observe that the queue was called.
const queueJobMock = jest.fn().mockResolvedValue('mock-job-id');
jest.unstable_mockModule('../../src/app/queue.js', () => ({
  queueJob: queueJobMock,
  startQueue: jest.fn().mockResolvedValue(undefined),
  stopQueue: jest.fn().mockResolvedValue(undefined),
  shouldSkipLLM: jest.fn()
}));

// 5. Import modules under test AFTER mock definitions (ESM requirement)
const { handlePullRequest, handleIssueComment } = await import('../../src/app/webhook.js');

describe('MergeBrief E2E Simulation (webhook boundary)', () => {
  let octokit;

  beforeEach(() => {
    octokit = new MockOctokit();
    mockPrisma.reset();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mockPrisma.$disconnect();
  });

  test('Step 1: opened PR is fast-enqueued for background analysis', async () => {
    const payload = {
      action: 'opened',
      repository: {
        name: 'test-repo',
        owner: { login: 'test-org', id: 123 },
        id: 456,
        private: false
      },
      pull_request: {
        number: 1,
        id: 789,
        head: { sha: 'mock-sha-123' },
        base: { repo: { id: 456, owner: { id: 123 } } },
        merged: false
      }
    };

    await handlePullRequest({ octokit, payload });

    // Post-pg-boss refactor: webhook should NOT block on DB or Checks API.
    // It should enqueue an 'analysis' job and return immediately.
    expect(queueJobMock).toHaveBeenCalledTimes(1);
    expect(queueJobMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'analysis',
      payload: expect.objectContaining({
        repository: expect.objectContaining({ name: 'test-repo' }),
        pull_request: expect.objectContaining({ number: 1 })
      })
    }));

    // Webhook must not touch Checks API directly any more (that's the worker's job).
    expect(octokit.rest.checks.create).not.toHaveBeenCalled();
  });

  test('Step 1b: closed+merged PR enqueues telemetry, not analysis', async () => {
    const payload = {
      action: 'closed',
      repository: {
        name: 'test-repo',
        owner: { login: 'test-org', id: 123 },
        id: 456,
        private: false
      },
      pull_request: {
        number: 1,
        id: 789,
        head: { sha: 'mock-sha-123' },
        base: { repo: { id: 456, owner: { id: 123 } } },
        merged: true
      }
    };

    await handlePullRequest({ octokit, payload });

    expect(queueJobMock).toHaveBeenCalledTimes(1);
    expect(queueJobMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'telemetry'
    }));
  });

  test('Step 1c: non-opened/synchronize/closed actions are ignored', async () => {
    const payload = {
      action: 'labeled',
      repository: { name: 'test-repo', owner: { login: 'test-org', id: 123 }, id: 456 },
      pull_request: { number: 1, id: 789, head: { sha: 'mock-sha-123' }, merged: false }
    };

    await handlePullRequest({ octokit, payload });

    expect(queueJobMock).not.toHaveBeenCalled();
  });

  test('Step 2: /merge-brief-approve from maintainer sets status and confirms', async () => {
    const payload = {
      action: 'created',
      repository: { name: 'test-repo', owner: { login: 'test-org' } },
      issue: { number: 2, pull_request: {} },
      comment: {
        body: '/merge-brief-approve: Logic is verified by human.',
        user: { login: 'maintainer-tom' }
      }
    };

    await handleIssueComment({ octokit, payload });

    expect(octokit.rest.repos.createCommitStatus).toHaveBeenCalledWith(expect.objectContaining({
      state: 'success',
      description: expect.stringContaining('Approved by @maintainer-tom')
    }));

    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.stringContaining('✅ **AI Provenance Approved**')
    }));
  });

  test('Step 2b: approval without a reason is rejected with guidance', async () => {
    const payload = {
      action: 'created',
      repository: { name: 'test-repo', owner: { login: 'test-org' } },
      issue: { number: 3, pull_request: {} },
      comment: {
        body: '/merge-brief-approve:',
        user: { login: 'maintainer-tom' }
      }
    };

    await handleIssueComment({ octokit, payload });

    expect(octokit.rest.repos.createCommitStatus).not.toHaveBeenCalled();
    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.stringContaining('A reason is required')
    }));
  });
});
