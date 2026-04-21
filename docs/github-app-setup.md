# GitHub App Setup Guide

To make MergeBrief available for your organization or personal use, you need to register a GitHub App.

## 1. Register the App
Go to your GitHub Settings > Developer Settings > **GitHub Apps** and click **New GitHub App**.

## 2. Configuration
- **GitHub App name**: `MergeBrief` (or your choice)
- **Homepage URL**: `https://mergebrief.io` (your production URL)
- **Callback URL**: `https://mergebrief.io/api/auth/callback/github`
- **Setup URL**: `https://mergebrief.io/onboarding` (optional)
- **Webhook**: 
  - [x] **Active**
  - **Webhook URL**: `https://api.mergebrief.com/webhook` (your backend URL)
  - **Webhook Secret**: Generate a secure random string and save it.

## 3. Permissions
MergeBrief requires the following permissions to analyze pull requests:

| Permission | Access | Purpose |
| :--- | :--- | :--- |
| **Checks** | Read & write | To create the MergeBrief Analysis check run and post summaries. |
| **Pull requests** | Read & write | To read PR diffs and post comments or status updates. |
| **Contents** | Read-only | To analyze source code heuristics and AST. |
| **Metadata** | Read-only | Base requirement for all GitHub Apps. |

## 4. Events
Subscribe to the following events:
- [x] **Pull request** (open, synchronize, closed)
- [x] **Issue comment** (for interaction/notes)
- [x] **Installation**
- [x] **Installation repositories**

## 5. Security & Internal
- **Private Key**: Generate a new private key, download it, and save the contents as an environment variable `PRIVATE_KEY`.
- **App ID**: Save the App ID as `APP_ID`.
- **Client ID & Secret**: Save these as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` for the Web Dashboard login.

## 6. Environment Variables Summary
Set these on your production servers (Vercel and Fly.io/Render):

```env
APP_ID=...
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
WEBHOOK_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
DATABASE_URL=...
ANTHROPIC_API_KEY=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://mergebrief.io
BACKEND_API_URL=https://api.mergebrief.com
```
