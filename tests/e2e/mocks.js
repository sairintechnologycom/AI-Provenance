import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_STATE_PATH = path.join(__dirname, 'db_state.json');

/**
 * Mocking library for E2E Simulation
 * Updated to support persistent JSON state for verification.
 */

export class MockOctokit {
  constructor() {
    this.rest = {
      repos: {
        getCommit: jest.fn().mockResolvedValue({
          data: {
            commit: { message: 'feat: add ai logic \n\nAI-generated-by: Copilot' },
            files: [
              { filename: 'src/core/detect.js', patch: '@@ -1,1 +1,2 @@\n+const ai = true;' }
            ]
          }
        }),
        getCollaboratorPermissionLevel: jest.fn().mockResolvedValue({
          data: { permission: 'admin' }
        }),
        createCommitStatus: jest.fn().mockResolvedValue({}),
        getContent: jest.fn().mockResolvedValue({
          data: { content: Buffer.from('* @maintainer-tom\n').toString('base64') }
        })
      },
      checks: {
        create: jest.fn().mockResolvedValue({ data: { id: 999 } }),
        update: jest.fn().mockResolvedValue({ data: { id: 999 } })
      },
      pulls: {
        listCommits: jest.fn().mockResolvedValue({
          data: [{ sha: 'mock-sha-123' }]
        }),
        get: jest.fn().mockImplementation((args) => {
          if (args.mediaType && args.mediaType.format === 'diff') {
            return Promise.resolve({
              data: 'diff --git a/src/core/detect.js b/src/core/detect.js\n--- a/src/core/detect.js\n+++ b/src/core/detect.js\n@@ -1,1 +1,2 @@\n+const ai = true;'
            });
          }
          return Promise.resolve({
            data: {
              number: args.pull_number,
              head: { sha: 'mock-sha-123' },
              base: { repo: { id: 456, owner: { id: 123 } } },
              body: 'Test PR body',
              merged: true
            }
          });
        })
      },
      issues: {
        listComments: jest.fn().mockResolvedValue({ data: [] }),
        createComment: jest.fn().mockResolvedValue({}),
        updateComment: jest.fn().mockResolvedValue({})
      }
    };
  }
}

export class MockAnthropic {
  constructor() {
    this.messages = {
      create: jest.fn().mockResolvedValue({
        content: [{ 
          text: JSON.stringify({
            intents: ["Refactoring detection logic", "Adding AI footprint tests"],
            blastRadius: ["Core Engine", "CI/CD Pipeline"],
            highRiskFiles: ["src/core/detect.js"]
          })
        }]
      })
    };
  }
}

export class MockPrisma {
  constructor() {
    this.state = {
      organizations: [],
      repositories: [],
      pullRequests: [],
      reviewEvents: []
    };
    this.init();

    // Stable Mock Functions
    this.organization = {
      upsert: jest.fn().mockImplementation(({ create }) => {
        let org = this.state.organizations.find(o => o.githubId === create.githubId);
        if (!org) {
          org = { ...create, id: `org-${Date.now()}` };
          this.state.organizations.push(org);
          this.save();
        }
        return Promise.resolve(org);
      }),
      deleteMany: jest.fn().mockImplementation(() => {
        this.state.organizations = [];
        this.save();
        return Promise.resolve({});
      })
    };

    this.repository = {
      upsert: jest.fn().mockImplementation(({ create }) => {
        let repo = this.state.repositories.find(r => r.githubId === create.githubId);
        if (!repo) {
          repo = { ...create, id: `repo-${Date.now()}` };
          this.state.repositories.push(repo);
          this.save();
        }
        return Promise.resolve(repo);
      }),
      deleteMany: jest.fn().mockImplementation(() => {
        this.state.repositories = [];
        this.save();
        return Promise.resolve({});
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const repo = this.state.repositories.find(r => r.id === where.id);
        return Promise.resolve(repo ? { ...repo, organization: { include: { workspace: true } } } : null);
      })
    };

    this.pullRequest = {
      upsert: jest.fn().mockImplementation(({ create }) => {
        let pr = this.state.pullRequests.find(p => p.githubId === create.githubId);
        if (!pr) {
          pr = { ...create, id: `pr-${Date.now()}` };
          this.state.pullRequests.push(pr);
        } else {
          Object.assign(pr, create);
        }
        this.save();
        return Promise.resolve(pr);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const pr = this.state.pullRequests.find(p => p.number === where.number);
        if (pr) {
          const repo = this.state.repositories.find(r => r.id === pr.repositoryId);
          return Promise.resolve({ ...pr, repository: repo });
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        let pr = this.state.pullRequests.find(p => p.number === where.number);
        if (pr) {
          Object.assign(pr, data);
          this.save();
        }
        return Promise.resolve(pr);
      }),
      deleteMany: jest.fn().mockImplementation(() => {
        this.state.pullRequests = [];
        this.save();
        return Promise.resolve({});
      })
    };

    this.reviewEvent = {
      create: jest.fn().mockImplementation(({ data }) => {
        const event = { ...data, id: `event-${Date.now()}` };
        this.state.reviewEvents.push(event);
        this.save();
        return Promise.resolve(event);
      }),
      deleteMany: jest.fn().mockImplementation(() => {
        this.state.reviewEvents = [];
        this.save();
        return Promise.resolve({});
      })
    };

    this.mergeBriefPacket = {
      create: jest.fn().mockImplementation(({ data }) => {
        const packet = { ...data, id: `packet-${Date.now()}` };
        return Promise.resolve(packet);
      }),
      deleteMany: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({ id: 'packet-1', pullRequestId: 'pr-1' }),
      update: jest.fn().mockResolvedValue({ id: 'packet-1' })
    };

    this.appEvent = {
      create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      deleteMany: jest.fn().mockResolvedValue({})
    };

    this.workspace = {
      findUnique: jest.fn().mockResolvedValue({ id: 'ws-1', slackWebhookUrl: 'https://hooks.slack.com/services/mock' }),
      update: jest.fn().mockResolvedValue({ id: 'ws-1' })
    };

    this.analysisJob = {
      create: jest.fn().mockImplementation(({ data }) => {
        const job = { ...data, id: `job-${Date.now()}` };
        return Promise.resolve(job);
      }),
      update: jest.fn().mockResolvedValue({ id: 'job-1' })
    };
  }

  init() {
    if (fs.existsSync(DB_STATE_PATH)) {
      this.state = JSON.parse(fs.readFileSync(DB_STATE_PATH, 'utf8'));
    }
  }

  save() {
    fs.writeFileSync(DB_STATE_PATH, JSON.stringify(this.state, null, 2));
  }

  async $disconnect() {
    return Promise.resolve();
  }
}

