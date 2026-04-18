import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import { App } from '@octokit/app';
import { handlePullRequest, handleIssueComment } from './webhook.js';
import apiRouter from './api.js';

const app = express();
const port = process.env.PORT || 3000;

// Verify required environment variables
const requiredEnv = ['APP_ID', 'PRIVATE_KEY', 'WEBHOOK_SECRET', 'ANTHROPIC_API_KEY'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`FATAL: Missing environment variables: ${missingEnv.join(', ')}`);
  // Not exiting here to allow for inspection, but server won't function for GitHub webhooks
  console.warn('Server will start, but GitHub Webhook features will crash without these variables.');
}

// Initialize GitHub App
let githubApp;
if (process.env.APP_ID && process.env.PRIVATE_KEY) {
  githubApp = new App({
    appId: process.env.APP_ID,
    privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    webhooks: {
      secret: process.env.WEBHOOK_SECRET
    }
  });

  // Event Subscriptions
  githubApp.webhooks.on('pull_request', async ({ octokit, payload }) => {
    await handlePullRequest({ octokit, payload });
  });

  githubApp.webhooks.on('issue_comment', async ({ octokit, payload }) => {
    await handleIssueComment({ octokit, payload });
  });

  githubApp.webhooks.on('error', (error) => {
    console.error(`[Webhook Error] ${error.message}`);
  });
}

// Middleware
app.use(morgan('dev'));
app.use(bodyParser.json());

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
app.use('/api', apiRouter);

// Slack Interactivity
app.post('/api/slack/interact', async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);
    const { action_id, value } = payload.actions[0];

    if (action_id === 'approve_pr') {
      const { packetId, prNumber, owner, repo } = JSON.parse(value);
      const username = payload.user.username;

      console.log(`[Slack] Approval received for PR #${prNumber} from @${username}`);

      if (prisma) {
        const updatedPr = await prisma.pullRequest.update({
          where: { repositoryId_number: { 
            repositoryId: (await prisma.repository.findUnique({ where: { owner_name: { owner, name: repo } } })).id,
            number: prNumber 
          } },
          data: {
            status: "APPROVED",
            approvalNote: `Approved via Slack by @${username}`
          }
        });

        // Log event
        await prisma.appEvent.create({
          data: {
            event: 'slack_approved',
            payload: { prNumber, username, packetId }
          }
        });
      }

      // Respond to Slack to update the message or just acknowledge
      return res.status(200).send({
        text: `✅ PR #${prNumber} has been approved by @${username}.`,
        replace_original: false
      });
    }

    res.status(200).send();
  } catch (error) {
    console.error(`[Slack Interaction Error] ${error.message}`);
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
      payload: req.body
    });

    res.status(200).send('Accepted');
  } catch (error) {
    console.error(`[Webhook Error] ${error.message}`);
    res.status(401).send('Unauthorized');
  }
});

// Start Server
app.listen(port, () => {
  console.log('---------------------------------------------------------');
  console.log(`MergeBrief Webhook Service is live!`);
  console.log(`Listening on port: ${port}`);
  console.log(`Webhook endpoint: http://localhost:${port}/webhook`);
  console.log('---------------------------------------------------------');
});
