# Troubleshooting Guide

This guide helps you resolve common issues with the MergeBrief beta.

## General
### PR Checks are pending indefinitely
- **Likely Cause**: The background analysis job crashed or the worker is offline.
- **Fix**: 
  1. Check the logs for `MergeBrief Webhook Service`.
  2. Verify that `DATABASE_URL` and `ANTHROPIC_API_KEY` are correct.
  3. Restart the backend: `npm run dev:backend`.

### Summary comment is missing
- **Likely Cause**: The analysis succeeded but the GitHub App does not have `write` permissions for PR comments.
- **Fix**: 
  1. Revise the GitHub App permissions and ensure `Pull requests` are set to `Read & Write`.
  2. Re-trigger the analysis by pushing a new commit or closing/reopening the PR.

## Authentication
### GitHub Login fails
- **Likely Cause**: Incorrect `GITHUB_ID` or `GITHUB_SECRET` in the `.env` file, or the OAuth redirect URL is mismatched.
- **Fix**:
  1. Verify the OAuth callback URL in GitHub Developer Settings matches: `${APP_URL}/api/auth/callback/github`.
  2. Ensure the `NEXTAUTH_URL` env var is set to your application's public root.

## Slack Notifications
### Slack message not received
- **Likely Cause**: Invalid Webhook URL or the workspace was deleted.
- **Fix**:
  1. Go to **Settings** in MergeBrief and verify the Slack Webhook URL.
  2. Use a tool like `curl` to test the webhook manually:
     ```bash
     curl -X POST -H 'Content-type: application/json' --data '{"text":"Test"}' <YOUR_WEBHOOK_URL>
     ```

## Performance
### Large PR takes too long to analyze
- **Likely Cause**: Reading thousands of files or heavy LLM usage on massive diffs.
- **Fix**:
  1. MergeBrief currently truncates diffs over 1,000 lines for the LLM step.
  2. If theAST analysis fails, check if the repo is a shallow clone (see `docs/BETA_ONBOARDING.md`). 
