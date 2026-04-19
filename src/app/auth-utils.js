import crypto from 'crypto';

/**
 * Middleware to verify Slack signatures.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(req, res, next) {
  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    console.warn('[Slack Auth] SLACK_SIGNING_SECRET not configured, skipping verification.');
    return next();
  }

  if (!signature || !timestamp) {
    return res.status(401).send('Slack signature or timestamp missing');
  }

  // Prevent replay attacks: timestamp should be within 5 minutes
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) {
    return res.status(401).send('Slack request timestamp too old');
  }

  const baseString = `v0:${timestamp}:${req.rawBody}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(baseString);
  const mySignature = `v0=${hmac.digest('hex')}`;

  const mySigBuffer = Buffer.from(mySignature);
  const slackSigBuffer = Buffer.from(signature);

  if (mySigBuffer.length === slackSigBuffer.length && crypto.timingSafeEqual(mySigBuffer, slackSigBuffer)) {
    next();
  } else {
    console.error('[Slack Auth] Signature verification failed');
    res.status(401).send('Slack signature mismatch');
  }
}
