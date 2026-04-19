import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { verifySlackSignature } from '../src/app/auth-utils.js';
import crypto from 'crypto';

describe('Slack Signature Verification', () => {
  const signingSecret = 'test-secret';
  
  beforeAll(() => {
    process.env.SLACK_SIGNING_SECRET = signingSecret;
  });

  afterAll(() => {
    delete process.env.SLACK_SIGNING_SECRET;
  });

  it('should pass with a valid signature', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify({ payload: 'test' });
    const baseString = `v0:${timestamp}:${rawBody}`;
    const hmac = crypto.createHmac('sha256', signingSecret);
    hmac.update(baseString);
    const signature = `v0=${hmac.digest('hex')}`;

    const req = {
      headers: {
        'x-slack-signature': signature,
        'x-slack-request-timestamp': timestamp.toString()
      },
      rawBody: rawBody
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    const next = jest.fn();

    verifySlackSignature(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should fail with an invalid signature', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify({ payload: 'test' });
    const signature = 'v0=invalid-signature';

    const req = {
      headers: {
        'x-slack-signature': signature,
        'x-slack-request-timestamp': timestamp.toString()
      },
      rawBody: rawBody
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    const next = jest.fn();

    verifySlackSignature(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Slack signature mismatch');
    expect(next).not.toHaveBeenCalled();
  });

  it('should fail if timestamp is too old', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 60 * 10; // 10 minutes ago
    const rawBody = JSON.stringify({ payload: 'test' });
    const signature = 'v0=some-signature';

    const req = {
      headers: {
        'x-slack-signature': signature,
        'x-slack-request-timestamp': timestamp.toString()
      },
      rawBody: rawBody
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    const next = jest.fn();

    verifySlackSignature(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Slack request timestamp too old');
  });

  it('should skip verification if SLACK_SIGNING_SECRET is missing', () => {
    delete process.env.SLACK_SIGNING_SECRET;
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();

    verifySlackSignature(req, res, next);
    expect(next).toHaveBeenCalled();
    process.env.SLACK_SIGNING_SECRET = signingSecret;
  });
});
