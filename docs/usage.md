# 🚀 Usage Guide

Once MergeBrief is installed and configured, follow these steps to start governing your AI-generated code.

## 1. Connecting a Repository

1. Navigate to your MergeBrief Dashboard ([http://localhost:3001](http://localhost:3001)).
2. Log in with your GitHub account.
3. Click on **Install App** to select the repositories you want to monitor.
4. Once installed, the repositories will appear in your dashboard.

## 2. Setting Up Governance Policies

Navigate to the **Settings** tab for a repository to configure:

- **Strict Mode**: Automatically fail PRs that contain unverified AI code.
- **Reviewer Assignment**: Automatically add a human reviewer if AI code exceeds a certain threshold.
- **Exclusion Patterns**: Ignore specific files (e.g., documentation, vendor folders) from analysis.

## 3. Detecting AI Code in Pull Requests

MergeBrief analyzes every commit in a Pull Request. To explicitly mark code as AI-generated, contributors should use the Git Trailer:

```text
Commit message body...

AI-generated-by: Claude-3-Opus
```

### Dashboard Insights

- **Provenance Score**: A high-level metric indicating the percentage of AI code in the PR.
- **Risk Triage**: Identifies potential security or licensing issues in AI-contributed blocks.
- **Audit Log**: A permanent record of all AI code detections for compliance.

## 4. Using the CLI (Developer Tool)

Developers can verify their code locally before pushing to GitHub:

```bash
# Install the CLI tool
npm install -g mergebrief

# Analyze the current directory
mergebrief detect .

# Analyze a specific PR
mergebrief analyze --pr 42
```

## 5. Monitoring and Logs

- **Dashboard**: Real-time overview of all active PRs.
- **Docker Logs**: Check background job progress.
  ```bash
  docker compose logs -f backend
  ```
