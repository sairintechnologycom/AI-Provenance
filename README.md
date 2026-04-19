# MergeBrief

**The Proof of Human Intelligence.**

MergeBrief is an AI provenance detection engine and governance toolkit designed to identify, track, and govern AI-generated code. It analyzes git commits for known AI artifacts, heuristics, and semantic patterns, providing organization-wide visibility while preserving human accountability in the loop.

## 🚀 Deployment Modes
MergeBrief adapts to your engineering workflow with four flexible levels of integration:

| Mode | Deployment | Best For | Key Features |
| :--- | :--- | :--- | :--- |
| **CLI** | Local / Script | Ad-hoc audits | JSON output, no server required. |
| **GitHub Action** | `.github/workflows` | Single Repo | Job Summaries, Zero-config. |
| **Azure DevOps** | `azure-pipelines.yml` | Enterprise CI | Native Build Results integration. |
| **MergeBrief (SaaS)**| Express + Postgres | Organizations | **Human-in-the-Loop**, Status Checks, Intent Engine. |

---

## 🛠️ Usage Guides

### 1. GitHub Action (Simple)
Add this to your workflow (e.g., `.github/workflows/ai-provenance.yml`):

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0 # Required for diff analysis
  - uses: aincloudtools/AI-Provenance@v1
```

### 2. Azure DevOps
Use the included script in your pipeline:
```yaml
- script: node src/azure/index.js
  env:
    BUILD_SOURCEVERSION: $(Build.SourceVersion)
```

### 3. MergeBrief (SaaS / GitHub App)
The full experience with blocking checks, LLM-powered "Blast Radius" analysis, and a unified Web Dashboard.

- **Installation**: `npm install && npx prisma migrate dev && cd web && npm install`
- **Server**: `npm run dev:all`
- **Config**: See `.env.example` (Requires `APP_ID`, `PRIVATE_KEY`, `DATABASE_URL`, `ANTHROPIC_API_KEY`).

#### Features:
- **GitHub Check Runs**: Automatically creates a "MergeBrief Analysis" check for rich PR overlays instead of noisy comments.
- **MergeBrief Packets Dashboard**: View detailed AI authorship packets on our Next.js dashboard separated by deterministic and inferred tags.
- **Async Processing Engine**: Handles massive PR diffs natively through a background queue constraint to not timeout webhooks.
- **Semantic Intent**: AI-driven analysis of *why* the code was changed (e.g., "Refactoring Auth Logic").

---

## 📖 Deep Dives

- [**Developer Setup Guide**](docs/development.md): Hosting your own MergeBrief instance.
- [**End-User Guide**](docs/usage.md): How to use the AI approval commands and interpret metrics.

---

## 🛠️ Local Development

### Installation
```bash
npm install
```

### Running Tests
```bash
npm test
```

### Manual Analysis (CLI)
```bash
node src/cli.js --sha <commit-sha>
```

---

## ⚠️ Edge Cases & Notes

- **Shallow Clones**: The engine requires full history or the target commit's parent to analyze diffs. It will warn and exit if it detects a shallow clone.
- **Binary Files**: Statistics (`--numstat`) correctly identify binary changes and skip diff scanning for them.
- **Telemetry**: Provide a `WEBHOOK_URL` in Action/CLI modes to forward data to your central logging system.
