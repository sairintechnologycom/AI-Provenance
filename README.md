# AI Provenance Detection

**AI Provenance** is a detection engine and CI/CD wrapper designed to identify and track AI-generated code in your repository. It analyzes git commits for known AI artifacts and trailers, providing you with a high-level view of AI contributions across your organization.

## Features

-   **Multi-Engine Detection**: Uses both git trailers (like `AI-generated-by: Copilot`) and intelligent heuristics to detect AI footprints.
-   **Shallow Clone Resilience**: Prevents inaccurate reports by automatically detecting and alerting on shallow clones.
-   **Rich Summaries**: Produces detailed Markdown tables with metrics (files touched, lines added/removed, tool identity).
-   **Webhook Telemetry**: Securely forward telemetry JSON to your central logging or BI systems.
-   **Cross-Platform Support**: Native runners for **GitHub Actions** and **Azure DevOps Pipelines**.

---

## 🚀 GitHub Actions Usage

Add this to your workflow (e.g., `.github/workflows/ai-provenance.yml`):

```yaml
name: AI Provenance Detection
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          # IMPORTANT: Detection requires full history or at least the current commit
          fetch-depth: 0

      - name: Detect AI Provenance
        uses: aincloudtools/AI-Provenance@v1
        with:
          # Optional: The commit SHA to analyze (defaults to current context)
          sha: ${{ github.sha }}
          
          # Optional: Custom git trailer to check for
          trailer-key: 'AI-generated-by'
          
          # Optional: Scalable telemetry endpoint
          webhook-url: 'https://telemetry.your-org.com/ingest'
```

### Action Inputs

| Input | Description | Default |
| :--- | :--- | :--- |
| `sha` | The git commit SHA to analyze. | `github.sha` |
| `trailer-key` | The git trailer key to search for tool identity. | `AI-generated-by` |
| `webhook-url` | Optional URL for POSTing analysis JSON telemetry. | (None) |

---

## ☁️ Azure DevOps Usage

For Azure Pipelines, use the included adapter:

```yaml
trigger:
  - main

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'

  - script: npm ci
    displayName: 'Install Dependencies'

  - script: node src/azure/index.js
    displayName: 'Detect AI Provenance'
    env:
      BUILD_SOURCEVERSION: $(Build.SourceVersion)
      SYSTEM_DEFAULTWORKINGDIRECTORY: $(System.DefaultWorkingDirectory)
      TRAILER_KEY: 'AI-generated-by'
```

*Results will be automatically attached as a Markdown summary to your Build Results UI.*

---

## 🛠️ Local Development & Testing

### Installation
```bash
npm install
```

### Running Tests
We use Jest for unit testing detection patterns:
```bash
npm test
```

### Manual Analysis
You can run the core engine locally:
```bash
node -e "require('./src/core/detect').analyzeCommit('.', 'HEAD').then(console.log)"
```

---

## ⚠️ Edge Cases

### Shallow Checkouts
Modern CI environments often "shallow clone" (fetch only the last commit). To detect AI artifacts accurately, the engine requires access to the full commit diff. If the runner detects a shallow repo, it will fail with a warning instructing you to set `fetch-depth: 0`.

### Binary Files
The engine correctly identifies binary file changes in `--numstat` and skips them during heuristic diff scanning to avoid corrupted metrics.

---

## 📊 Telemetry Format
When `webhook-url` is provided, a JSON payload is sent via POST:

```json
{
  "sha": "501d79...",
  "aiTool": "Copilot",
  "confidence": 100,
  "files": 12,
  "linesAdded": 450,
  "linesRemoved": 12,
  "methods": ["trailer"]
}
```
