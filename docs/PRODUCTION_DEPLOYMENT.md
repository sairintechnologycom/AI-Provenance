# Production Deployment Guide: MergeBrief

This document outlines the steps required to deploy **MergeBrief** (AI Provenance & Governance) to a production environment.

## 🏗️ Architecture Overview
- **UI**: Next.js (Frontend) + NextAuth (Identity).
- **Backend**: Node.js/Express (Webhook & API Service).
- **Database**: PostgreSQL (Data persistence).
- **AI**: Anthropic Claude API (Semantic Analysis).

---

## 🔐 1. Secrets & Environment Variables

The following environment variables MUST be configured in your production environment (e.g., Vercel, AWS Secrets Manager, or GitHub Actions).

### GitHub App Credentials
| Variable | Description |
| :--- | :--- |
| `APP_ID` | Your GitHub App ID. |
| `PRIVATE_KEY` | The `.pem` content of your GitHub App private key. |
| `WEBHOOK_SECRET` | The secret used to sign GitHub webhooks. |

### Auth & Security
| Variable | Description |
| :--- | :--- |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | The public URL of the web application. |
| `GITHUB_ID` | OAuth Client ID for the GitHub App. |
| `GITHUB_SECRET` | OAuth Client Secret for the GitHub App. |

### Core Services
| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Your production PostgreSQL connection string. |
| `ANTHROPIC_API_KEY` | API Key for AI Analysis. |
| `SLACK_SIGNING_SECRET` | Secret to verify Slack interactivity requests. |

---

## 🚀 2. Deployment Steps

### Option A: Managed Services (Recommended)
- **Frontend**: Deploy the `./web` directory to **Vercel** or **Netlify**.
- **Backend**: Deploy the root project to **Render**, **Railway**, or **AWS App Runner**.
- **Database**: Use a managed Postgres service like **AWS RDS** or **Neon**.

### Option B: Docker (Self-Hosted)
MergeBrief includes a `Dockerfile` for easy containerization.

1. Build the image:
   ```bash
   docker build -t mergebrief-prod .
   ```
2. Run with environment variables:
   ```bash
   docker run -p 3000:3000 --env-file .env mergebrief-prod
   ```

---

## 🔄 3. Database Migrations

In production, ensure you run Prisma migrations as part of your CI/CD pipeline:

```bash
npx prisma migrate deploy
```

> [!CAUTION]
> Never use `prisma migrate dev` in a production environment as it may reset your database.

---

## 📝 4. Monitoring & Logs

### Log Rotation
MergeBrief uses `winston` for production logging. Logs are automatically rotated daily and stored in:
- `/logs/combined-YYYY-MM-DD.log`
- `/logs/error-YYYY-MM-DD.log`

### Health Checks
- **Webhook Service**: `https://api.yourdomain.com/health`
- **Frontend**: `https://dashboard.yourdomain.com/`

---

## 🆘 Support
For production support, contact the MergeBrief engineering team at `support@mergebrief.ai`.
