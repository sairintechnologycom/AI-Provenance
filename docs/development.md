# Developer Setup: Hosting MergeBrief

This guide explains how to host your own instance of the **MergeBrief** GitHub App for organization-wide AI provenance tracking.

## Prerequisites

- **Nature**: Node.js (v20+)
- **Database**: PostgreSQL (v14+)
- **Secrets**: 
  - A GitHub App (with `pull_request`, `issue_comment`, and `commit_status` permissions).
  - An Anthropic API Key (for the Intent Engine).

---

## 1. Local Setup

### Installation
```bash
git clone https://github.com/aincloudtools/AI-Provenance.git
cd AI-Provenance
npm install
```

### Configuration
Copy the `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

| Key | Description |
| :--- | :--- |
| `APP_ID` | Your GitHub App ID. |
| `PRIVATE_KEY` | Your App's `.pem` private key content. |
| `WEBHOOK_SECRET` | The secret you set in the GitHub App settings. |
| `DATABASE_URL` | Postgres connection string. |
| `ANTHROPIC_API_KEY` | For semantic diff analysis. |

### Database Initialization
We use **Prisma** for schema management. Run the following to set up your database:

```bash
npx prisma migrate dev --name init
```

---

## 2. Running the Service

### Development
For Phase 1 local development, you need both the Node/Express webhook backend and the Next.js UI running simultaneously.
```bash
npm run dev:all
```
The Express backend will start on port `3000` and listen for GitHub webhooks at `/webhook`.
The Next.js React frontend will start on port `3001` and is accessible at `http://localhost:3001`.

### Production (Docker)
We include a `Dockerfile` and `docker-compose.yml` for containerized deployment:

```bash
docker-compose up -d
```

---

## 3. GitHub App Configuration

1. **Webhook URL**: Set to `https://your-domain.com/webhook` (Under the "General" section).
2. **User authorization callback URL**: Set to `http://localhost:3001/api/auth/callback/github` (Under the "Identifying and authorizing users" section in General tab). This is required for login.
3. **Permissions**:
    - `Pull Requests`: Read & Write (for comments and diffs).
    - `Issue Comments`: Read & Write (for commands).
    - `Checks`: Read & Write (Required for MergeBrief Packets Check Runs).
4. **Events**:
    - `Pull request`
    - `Issue comment`
    - `Check run`

---

## 4. Development Commands

### Running Tests
We use Jest to verify core detection algorithms:
```bash
npm test
```

### Manual CLI Analysis
Test the detection engine without a server:
```bash
node src/cli.js --sha <sha>
```
