# AI-Provenance BUILD_PLAN.md

## Current Architecture Summary
- **Backend Framework**: Node.js / Express
- **Database**: PostgreSQL accessed via Prisma ORM
- **Entry Points**: 
  - `src/app/server.js` listens on `/webhook`
  - `src/app/webhook.js` processes GitHub `pull_request` and `issue_comment`
- **Core Analysis**: 
  - `src/core/detect.js`: Analyzes diffs for AI-generated code.
  - `src/core/llm.js`: Identifies semantic intent and blast radius using Anthropic SDK.
  - `src/core/codeowners.js`: Determines reviewer suggestions.
- **GitHub UX**: Posts standard PR comments containing summary tables and sets a static Commit Status (`octokit.rest.repos.createCommitStatus`) requiring `/merge-brief-approve:` comments.
- **Data Persistence**: `PullRequest` schema holds flat metrics `aiTool`, `confidence`, `blastRadius`, and `intent`. 
- **Missing Elements**: No GitHub Checks API, no modular `Packet` boundary separating inferences from strict truths, no web dashboard, synchronous processing leading to potential timeouts on large diffs.

## Target Architecture (2-Week Phase 1 Beta Sprint)
- Keep existing Node/Express + Postgres backend.
- Introduce Next.js (`/web`) to act as a lightweight product shell.
- Create a canonical `MergeBriefPacket` abstraction in DB and code to isolate analysis states, separating deterministic tags from LLM-based intent tags.
- Transition from static commit statuses to rich GitHub Check Runs linked directly to the new Next.js dashboard.
- Create an asynchronous processing queue to prevent webhook timeouts during heavy LLM diff analysis.

## Task List with Dependencies
1. **Task 1: Audit repo and create an execution plan** (Current)
2. **Task 2: Introduce versioned MergeBrief packet domain model**: Depends on Task 1. Requires `prisma/schema.prisma` updates.
3. **Task 3: Create packet builder service**: Depends on Task 2. Extracts packet normalization.
4. **Task 4: Add deterministic risk tagging engine**: Depends on Task 3. Matches file paths to categories (e.g., auth, infra).
5. **Task 5: Replace status-only output with GitHub Check Runs**: Depends on existing webhook. Replaces simple statuses with rich Check API runs (`queued`, `in_progress`, `completed`).
6. **Task 6: Persist packets and expose backend APIs**: Depends on Task 2. Provides `GET /api/packets/:id` for frontend.
7. **Task 7: Add async analysis pipeline for larger diffs**: Depends on Task 5 & 6. Moves LLM calls into an async loop.
8. **Task 8: Create minimal Next.js frontend**: Depends on Task 6. Scaffolds repo list, PR list, and packet detail routing.
9. **Task 9: Wire GitHub output to packet URLs and improve reviewer UX**: Depends on Task 5 & 8. Makes the GitHub PR comment and Check Run point to the Next.js frontend.
10. **Task 10: Testing, docs, cleanup, and next-sprint handoff**: Depends on all above. Polish tests and README.

## Known Risks
- **Async Queue Robustness**: Since we are constrained from adopting heavy new infrastructure, using an in-process queue for Task 7 will lose jobs if the Node server restarts during processing. We should persist an `AnalysisJob` to the database before processing to recover state if needed.
- **GitHub Checks Permissions**: The GitHub app needs the `checks: write` permission which might require manual updating if it's an existing app installation.
- **Next.js & Express Co-existence**: Need to ensure PORTs don't clash (Express on 3000, Next.js on 3001) for local development orchestrations.

## Decisions Made
- No backend rewrite to FastAPI; we stick with Node/Express.
- Next.js is added simply as a product shell without complex boilerplate.
- GitHub Check Runs specifically replace status-only UX for blocking logic.
- "Packet" assumes the boundary role for holding provenance information.
- Deterministic tags explicitly segregated from probabilistic (LLM) risk tags.
- No auth needed right now on the web UI.
