import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import { App } from '@octokit/app';
import { Webhooks } from '@octokit/webhooks';
import logger from './logger.js';
import { handlePullRequest, handleIssueComment } from './webhook.js';
import { checkSubscription } from '../core/gating.js';
import createApiRouter from './api.js';
import { prisma } from './db.js';
import { verifySlackSignature } from './auth-utils.js';
import { recoverJobs } from './queue.js';
import { updateStatusCheck } from '../core/status.js';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Verify required environment variables
const requiredEnv = [
  'APP_ID', 
  'PRIVATE_KEY', 
  'WEBHOOK_SECRET', 
  'ANTHROPIC_API_KEY', 
  'DATABASE_URL'
];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  logger.error(`FATAL: Missing environment variables: ${missingEnv.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    logger.error('Production mode detected. Exiting due to missing secrets.');
    process.exit(1);
  }
  logger.warn('Server will start, but core features will fail without these variables.');
}

// Initialize GitHub App or Mock fallback
let githubApp;
const webhookSecret = process.env.WEBHOOK_SECRET || 'test-secret';

if (process.env.APP_ID && process.env.PRIVATE_KEY) {
  githubApp = new App({
    appId: process.env.APP_ID,
    privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    webhooks: {
      secret: webhookSecret
    }
  });

  // Event Subscriptions (App mode)
  githubApp.webhooks.on('pull_request', async ({ octokit, payload }) => {
    await handlePullRequest({ octokit, payload });
  });

  githubApp.webhooks.on('issue_comment', async ({ octokit, payload }) => {
    await handleIssueComment({ octokit, payload });
  });

  githubApp.webhooks.on('installation', async ({ payload }) => {
    await import('./webhook.js').then(m => m.handleInstallation({ payload }));
  });

  githubApp.webhooks.on('installation_repositories', async ({ payload }) => {
    await import('./webhook.js').then(m => m.handleInstallationRepositories({ payload }));
  });

  githubApp.webhooks.onError((error) => {
    logger.error(`[Webhook Error] ${error.message}`, { stack: error.stack });
  });
} else if (process.env.NODE_ENV !== 'production') {
  logger.warn('⚠️ GITHUB_APP_MOCK_MODE: Running with mock githubApp fallback.');
  
  const mockWebhooks = new Webhooks({
    secret: webhookSecret,
  });

  githubApp = {
    webhooks: mockWebhooks,
  };

  // Mock Octokit client for local testing
  const mockOctokit = {
    rest: {
      checks: { 
        create: async () => ({ data: { id: Date.now() } }), 
        update: async () => {} 
      },
      repos: { 
        createStatus: async () => {},
        getCollaboratorPermissionLevel: async () => ({ data: { permission: 'admin' } }),
        getCommit: async () => ({ 
          data: { 
            commit: { message: 'Mock AI Commit' }, 
            files: [{ filename: 'test.js', patch: '@@ -1,1 +1,1 @@\n-old\n+new', additions: 1 }] 
          } 
        })
      },
      issues: { createComment: async () => {} },
      pulls: { 
        get: async (params) => {
          if (params.mediaType?.format === 'diff') {
            return { data: 'diff --git a/test.js b/test.js\n--- a/test.js\n+++ b/test.js\n@@ -1,1 +1,1 @@\n-old\n+new' };
          }
          return { data: { head: { sha: 'mock-sha' }, base: { sha: 'base-sha' } } };
        },
        listCommits: async () => ({ 
          data: [{ sha: 'mock-sha' }] 
        })
      }
    }
  };

  // Event Subscriptions (Mock mode)
  mockWebhooks.on('pull_request', async ({ payload }) => {
    await handlePullRequest({ octokit: mockOctokit, payload });
  });

  mockWebhooks.on('issue_comment', async ({ payload }) => {
    await handleIssueComment({ octokit: mockOctokit, payload });
  });

  mockWebhooks.on('installation', async ({ payload }) => {
    await import('./webhook.js').then(m => m.handleInstallation({ payload }));
  });

  mockWebhooks.on('installation_repositories', async ({ payload }) => {
    await import('./webhook.js').then(m => m.handleInstallationRepositories({ payload }));
  });
}

// Middleware
app.use(morgan('combined', { 
  stream: { write: message => logger.info(message.trim(), { service: 'morgan' }) } 
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Root endpoint
app.get('/', (req, res) => {
  res.send({
    status: 'online',
    service: 'MergeBrief Webhook Service',
    version: '1.0.0'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// APIs
app.use('/api', createApiRouter(githubApp));

// Slack Interactivity
app.post('/api/slack/interact', verifySlackSignature, async (req, res) => {
  try {
    const rawPayload = req.body.payload;
    if (!rawPayload) return res.status(400).send('Missing payload');

    const payload = JSON.parse(rawPayload);
    if (!payload.actions || payload.actions.length === 0) {
       return res.status(200).send();
    }
    
    const { action_id, value } = payload.actions[0];

    if (action_id === 'approve_pr') {
      const { packetId, prNumber, owner, repo } = JSON.parse(value);
      const username = payload.user.name || payload.user.username;

      console.log(`[Slack] Approval received for PR #${prNumber} from @${username}`);

      if (!prisma) {
        throw new Error('Database client not initialized');
      }

      // Find the repository and packet
      const repository = await prisma.repository.findFirst({
        where: { owner, name: repo }
      });

      if (!repository) {
        console.error(`[Slack] Repository not found: ${owner}/${repo}`);
        return res.status(404).send('Repository not found');
      }

      const packet = await prisma.mergeBriefPacket.findUnique({
        where: { id: packetId }
      });

      // Update PR status
      await prisma.pullRequest.update({
        where: { 
          repositoryId_number: { 
            repositoryId: repository.id,
            number: prNumber 
          } 
        },
        data: {
          status: "APPROVED",
          approvalNote: `Approved via Slack by @${username}`
        }
      });

      // Update GitHub Status Check
      if (githubApp && packet) {
        try {
          const { data: installations } = await githubApp.octokit.rest.apps.listInstallations();
          const installation = installations.find(i => i.account.login === owner);
          
          if (installation) {
            const octokit = await githubApp.getInstallationOctokit(installation.id);
            await updateStatusCheck(octokit, {
              owner,
              repo,
              sha: packet.headSha,
              state: 'success',
              description: `Approved via Slack by @${username}`
            });
          }
        } catch (ghErr) {
          logger.error(`[Slack] Failed to update GitHub status: ${ghErr.message}`);
        }
      }

      // Log event
      await prisma.appEvent.create({
        data: {
          event: 'slack_approved',
          payload: { prNumber, username, packetId, repo: `${owner}/${repo}` }
        }
      });

      return res.status(200).send({
        text: `✅ PR #${prNumber} has been approved by @${username}.`,
        replace_original: false
      });
    }

    res.status(200).send();
  } catch (error) {
    logger.error(`[Slack Interaction Error] ${error.message}`, { stack: error.stack });
    res.status(500).send('Internal Server Error');
  }
});

// Main Webhook endpoint
app.post('/webhook', async (req, res) => {
  if (!githubApp) {
    return res.status(503).send('GitHub App not configured');
  }

  try {
    const id = req.headers['x-github-delivery'];
    const name = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];

    if (!id || !name || !signature) {
      return res.status(400).send('Missing GitHub webhook headers');
    }

    await githubApp.webhooks.verifyAndReceive({
      id,
      name,
      signature,
      payload: req.rawBody || JSON.stringify(req.body)
    });

    res.status(200).send('Accepted');
  } catch (error) {
    logger.error(`[Webhook Error] ${error.message}`);
    res.status(401).send('Unauthorized');
  }
});

// Start Server
app.listen(port, async () => {
  logger.info('---------------------------------------------------------');
  logger.info(`MergeBrief Webhook Service is live!`);
  logger.info(`Listening on port: ${port}`);
  logger.info(`Webhook endpoint: http://localhost:${port}/webhook`);
  logger.info(`Auth Client ID: ${process.env.GITHUB_ID ? process.env.GITHUB_ID.substring(0, 5) + '...' : 'MISSING'}`);
  logger.info('---------------------------------------------------------');

  if (githubApp) {
    try {
      await recoverJobs(githubApp);
    } catch (error) {
      logger.error(`[Startup] Failed to recover jobs: ${error.message}`);
    }
  }
});
