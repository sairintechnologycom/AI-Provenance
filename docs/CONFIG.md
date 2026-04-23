# ⚙️ Configuration Guide

MergeBrief requires several environment variables to function correctly. These are managed in your `.env` file.

## 1. GitHub App Setup (Required)

MergeBrief acts as a GitHub App to receive pull request events and post comments.

### Step-by-Step Instructions:

1. Go to your **GitHub Organization/Profile Settings** > **Developer Settings** > **GitHub Apps**.
2. Click **New GitHub App**.
3. **App Name**: MergeBrief (or your choice).
4. **Homepage URL**: Your dashboard URL (e.g., `http://localhost:3001`).
5. **Webhook**:
   - Check **Active**.
   - **Webhook URL**: Your backend URL + `/api/webhook` (e.g., `http://your-domain.com/api/webhook`). Note: For local testing, use a tool like [smee.io](https://smee.io/) or [ngrok](https://ngrok.com/).
   - **Webhook Secret**: Enter a secure random string and add it to `WEBHOOK_SECRET` in `.env`.
6. **Permissions**:
   - **Pull Requests**: Read & Write (to detect and comment).
   - **Metadata**: Read-only (required for all apps).
7. **Subscribe to events**:
   - Check **Pull request**.
8. **Secrets**:
   - Generate a **Private Key** and download it. Copy the contents into `PRIVATE_KEY` in `.env` (use `\n` for newlines if setting as a single string, or point to a file if your infrastructure supports it).
   - Copy the **App ID** to `APP_ID` in `.env`.
   - Create a **Client Secret** and copy it to `GITHUB_SECRET` in `.env`.
   - Copy the **Client ID** to `GITHUB_ID` in `.env`.

## 2. Environment Variables Reference

| Variable | Description | Example |
| :--- | :--- | :--- |
| `APP_ID` | GitHub App ID | `123456` |
| `PRIVATE_KEY` | GitHub App Private Key (PEM format) | `-----BEGIN RSA PRIVATE KEY-----...` |
| `WEBHOOK_SECRET` | Secret for verifying GitHub webhooks | `my_secret_string` |
| `ANTHROPIC_API_KEY` | Key for AI-powered detection engine | `sk-ant-api03-...` |
| `NEXTAUTH_SECRET` | Secret for session encryption | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL of the dashboard | `http://localhost:3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/db` |

## 3. Advanced Settings

- `ENABLE_LLM_VERIFICATION`: Set to `true` to enable deep AI analysis of code snippets (increases accuracy but adds cost/latency).
- `TRAILER_KEY`: The Git trailer key used to identify AI-generated code (default: `AI-generated-by`).
- `LOG_LEVEL`: Set to `debug` for detailed troubleshooting logs.

## 4. Local Testing with Webhooks

Since GitHub cannot reach your `localhost`, you need a proxy for webhooks during local development:

1. Install Smee: `npm install --global smee-client`
2. Run Smee: `smee -u https://smee.io/YOUR_CHANNEL -t http://localhost:3000/api/webhook`
3. Update your GitHub App Webhook URL to `https://smee.io/YOUR_CHANNEL`.
