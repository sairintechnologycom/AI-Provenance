# 📦 Installation Guide

This guide will help you get MergeBrief up and running using Docker. This is the recommended method for self-hosting.

## Prerequisites

- **Docker**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS, Windows, Linux)
- **GitHub App**: You will need a GitHub App to handle PR events. [See Configuration Guide](./CONFIG.md)
- **Anthropic API Key**: Required for the AI detection engine.

## One-Click Setup (Recommended)

The easiest way to install MergeBrief is to use our setup script:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/AI-Provenance.git
cd AI-Provenance

# 2. Run the setup script
./scripts/setup.sh
```

The script will:
- Create your `.env` file.
- Generate a secure `NEXTAUTH_SECRET`.
- Build the Docker containers for the Database, Backend, and Dashboard.
- Start all services.

## Manual Setup

If you prefer to run the steps manually:

1. **Prepare Environment Variables**
   ```bash
   cp .env.example .env
   # Generate a secret for authentication
   openssl rand -base64 32 # Copy this into NEXTAUTH_SECRET in .env
   ```

2. **Edit `.env`**
   Open `.env` and fill in the required credentials (see [Configuration Guide](./CONFIG.md)).

3. **Launch with Docker Compose**
   ```bash
   docker compose up -d --build
   ```

## Verifying the Installation

Once the containers are running:

1. **Check Logs**: Monitor the database initialization and migration.
   ```bash
   docker compose logs -f
   ```
2. **Access Dashboard**: Open [http://localhost:3001](http://localhost:3001) in your browser.
3. **Access API**: The backend API is available at [http://localhost:3000](http://localhost:3000).

## Troubleshooting

- **Port Conflicts**: If port 3000 or 3001 is already in use, change the `PORT` variables in your `.env` file and restart the containers.
- **Database Connection**: If the backend fails to connect to the database, ensure the `db` container is healthy (`docker compose ps`).
- **Permissions**: On Linux, you might need to run docker commands with `sudo` if your user is not in the `docker` group.
