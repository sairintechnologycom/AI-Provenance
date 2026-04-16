# User Guide: AI Provenance & MergeBrief

This guide explains how developers and reviewers interact with the **MergeBrief** AI Provenance system.

## 🤖 Detection & Summaries

When you open or update a Pull Request, MergeBrief automatically analyzes each commit. If AI-generated code is detected, it posts a summary comment:

### AI Metrics Table
| Commit | AI Tool | Confidence | Files | Added | Removed |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a2b3c4` | **Copilot** | 100% | 3 | 120 | 5 |

### 🎯 Semantic Intents
MergeBrief uses an LLM-powered engine to understand *why* the AI code was added:
- "Identified logic for session expiration in `auth.js`."
- "Updated database schema migrations for user profiles."

### ⚠️ Risk Areas (Blast Radius)
It highlights critical files touched by AI that require extra scrutiny:
- `app/api/auth.js`
- `config/settings.json`

---

## ✅ Human-in-the-Loop Approval

One of the core features of MergeBrief is the **Blocking Gate**. If AI-generated code is detected, a mandatory status check called **MergeBrief Approval** will mark the PR as `pending`.

### How to Approve AI Code
To clear the gate and allow the PR to be merged, a repository maintainer (with `write` access) must review the AI code and provide a rationale.

**Command**: `/merge-brief-approve: <your-rationale>`

**Example**:
> `/merge-brief-approve: I have verified the AI-generated auth logic and added missing edge-case unit tests.`

### What Happens Next?
1. **Status Cleared**: The status check turns to `success`.
2. **Telemetry Ingested**: Your rationale and the AI detection metrics are saved to the project's database for long-term reporting.
3. **Confirmation**: MergeBrief will post a confirmation comment acknowledging the approval.

---

## 💡 Best Practices for AI Code

- **Review the Diffs**: Always double-check AI-generated logic for subtle bugs or security vulnerabilities.
- **Add Git Trailers**: You can help MergeBrief by adding git trailers to your commits:
  ```bash
  git commit -m "feat: add oauth support" -m "AI-generated-by: Copilot"
  ```
- **Provide Rationale**: When approving AI code, be specific. This helps your team build a high-quality "AI Provenance" history.
