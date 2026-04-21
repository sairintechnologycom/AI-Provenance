# Self-Hosting MergeBrief

For enterprises and teams that require data residency and complete control over their infrastructure, MergeBrief can be self-hosted using Docker.

## Prerequisites
- Docker and Docker Compose
- A GitHub App (see [GitHub App Setup Guide](github-app-setup.md))
- An Anthropic API Key (for semantic analysis)

## Quick Start (Docker Compose)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/aincloudtools/AI-Provenance.git mergebrief
   cd mergebrief
   ```

2. **Configure Environment**:
   Create a `.env` file in the root directory based on `.env.example`:
   ```bash
   # Required
   APP_ID=your_app_id
   PRIVATE_KEY="your_private_key"
   WEBHOOK_SECRET=your_secret
   ANTHROPIC_API_KEY=your_key
   
   # Database (if using docker-compose default)
   DB_USER=mergebrief
   DB_PASSWORD=secure_password
   DB_NAME=mergebrief
   
   # Web Dashboard
   NEXTAUTH_SECRET=your_nextauth_secret
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   NEXTAUTH_URL=http://localhost:3001
   ```

3. **Launch the stack**:
   ```bash
   docker-compose up -d
   ```

4. **Verify**:
   - Backend Service: [http://localhost:3000/health](http://localhost:3000/health)
   - Web Dashboard: [http://localhost:3001](http://localhost:3001)

## Architecture Overview

The `docker-compose.yml` stack includes:
- **`db`**: A PostgreSQL 15 container for persistent storage.
- **`backend`**: The Node.js analysis engine and webhook handler.
- **`dashboard`**: The Next.js web application for PR visualization.

## Production Hardening
- **SSL**: We recommend using a reverse proxy like Nginx or Traefik with Let's Encrypt for HTTPS.
- **Secrets**: Use a secret manager instead of plain `.env` files for production keys.
- **Backup**: Ensure regular backups of the `postgres_data` volume.

## Updating
To update your self-hosted instance:
```bash
git pull
docker-compose build
docker-compose up -d
```
