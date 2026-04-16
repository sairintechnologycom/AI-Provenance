require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { App } = require('@octokit/app');
const { handlePullRequest } = require('./webhook');

const app = express();
const port = process.env.PORT || 3000;

// Verify required environment variables
const requiredEnv = ['APP_ID', 'PRIVATE_KEY', 'WEBHOOK_SECRET', 'ANTHROPIC_API_KEY'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`FATAL: Missing environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// Initialize GitHub App
const githubApp = new App({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  webhooks: {
    secret: process.env.WEBHOOK_SECRET
  }
});

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

// Main Webhook endpoint
app.post('/webhook', async (req, res) => {
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

// Event Subscriptions
githubApp.webhooks.on('pull_request', async ({ octokit, payload }) => {
  await handlePullRequest({ octokit, payload });
});

githubApp.webhooks.on('error', (error) => {
  console.error(`[Webhook Error] ${error.message}`);
});

// Start Server
app.listen(port, () => {
  console.log('---------------------------------------------------------');
  console.log(`MergeBrief Webhook Service is live!`);
  console.log(`Listening on port: ${port}`);
  console.log(`Webhook endpoint: http://localhost:${port}/webhook`);
  console.log('---------------------------------------------------------');
});
