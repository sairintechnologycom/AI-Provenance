# BETA_PLAN.md

## Current Architecture Summary
- **Backend**: Node.js/Express service (`src/app/server.js`) handling GitHub webhooks, asynchronous queue operations (`queue.js`), and exposing raw APIs (`api.js`).
- **Database**: Prisma + PostgreSQL mapping `Organization`, `Repository`, `PullRequest`, `MergeBriefPacket`, and `AnalysisJob`. The `MergeBriefPacket` is the core artifact of analysis containing confidence, summaries, and tags.
- **Analysis Engine**: Platform-agnostic `src/core/` engine doing AST parsing, CODEOWNERS mapping, heuristic checks, and LLM classification (Anthropic).
- **Web App**: Next.js (App Router) + Tailwind in `./web/`. Currently has minimal pages to view repos and packets. No authentication.

## Beta-Readiness Gaps
1. **Access Control**: The web application lacks any authentication mechanism or session tracking. External users cannot safely access the app.
2. **Configuration/Admin Model**: No interface or database model to manage workspace/team settings, GitHub app installation metadata, or Slack webhook configurations.
3. **Distribution/Demand Capture**: Missing a public landing page or waitlist form to capture prospective design partners.
4. **Visibility**: Slack integration is missing, meaning users only get notified within the GitHub PR comment layer.
5. **Insights**: No application analytics/instrumentation to measure user interaction with packets and PR UI.
6. **Interaction**: Minimal human-in-the-loop workflow; reviewer "merge notes" exist in the DB schema but need an integrated UX.

## Target Outcomes for this Sprint
- **Install & Access**: A user can sign in via GitHub OAuth, and view only repositories they have access to.
- **Admin Readiness**: Users can configure workspace settings and a Slack webhook URL.
- **Alerts**: High-signal PR summaries are pushed to configured Slack channels.
- **Lead Generation**: A new landing page accepts waitlist signups.
- **Measurement**: Backend logging captures events like packet views and Slack notifications for beta operations.
- **Review Workflow**: The packet UI supports the recording and display of approval/merge notes.
- **Ops Preparedness**: Comprehensive runbooks and onboarding guides ensure we can manually onboard and support design partners.

## Task List with Dependencies
1. **Audit & Plan (Done)**: Create this `BETA_PLAN.md`.
2. **GitHub OAuth & Sessions**: Setup NextAuth.js or custom express sessions to safely identify users.
3. **Settings Model**: Update Prisma schema to capture Slack configs/workspace contexts. Create settings UI.
4. **Slack Integration**: Extend analysis backend to post to Slack upon packet completion. *(Depends on Task 3)*.
5. **Landing Page**: Build public-facing page with a waitlist model tracking leads.
6. **Instrumentation**: Create a lightweight analytics table and tracking layer to capture UI/API events.
7. **Merge Note UX**: Enhance the packet UI to capture and display human reviewer intent.
8. **Documentation**: Add `BETA_ONBOARDING.md`, `DESIGN_PARTNER_RUNBOOK.md`, and `TROUBLESHOOTING.md`.
9. **Reliability Fixes**: Address duplicate notifications, long diff timeouts, and empty UI states.
10. **Handoff Artifacts**: Create `NEXT_SPRINT.md`, `BETA_FEEDBACK_TEMPLATE.md`, and `LAUNCH_READINESS.md`.

## Risks
- Over-complicating GitHub App authentication vs standard GitHub OAuth. We should stick to simple OAuth for web identity first via `next-auth`.
- Slack delivery failures. We must ensure slack webhooks fail gracefully and don't block analysis.
- Adding too much to the frontend: we will keep the Next.js app extremely simple and not overbuild a massive dashboard.

## Explicit Non-Goals
- Phase 2 features: behavioral assertion engine, compliance export, policy DSL, side-effect sandboxing.
- Enterprise SSO / SCIM / GitLab support.
- Fully automated billing or self-serve signup (we rely on manual onboarding).
- Fine-grained RBAC.
