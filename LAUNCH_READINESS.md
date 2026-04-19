# Launch Readiness Checklist

## Product Readiness
- [x] GitHub OAuth login flow verified for primary workflows.
- [x] NextAuth session persistence working across page refreshes.
- [x] Workspace settings (Slack) save process verified.
- [x] Slack notifications triggered on PR synchronize/open events.
- [x] Reviewer "Merge Note" flow captures rationale in DB.
- [x] Analytics events (start, success, fail, view) are populating in `AppEvent`.
- [x] Landing page waitlist form captures leads.

## Operational Readiness
- [x] `BETA_ONBOARDING.md` guide is accurate.
- [x] `DESIGN_PARTNER_RUNBOOK.md` defines clear manual steps for support.
- [x] `TROUBLESHOOTING.md` covers common integration failures.
- [ ] Support lead assigned for first 3 design partners.

## Infrastructure
- [x] Database migrations applied: `Workspace`, `User`, `Lead`, `AppEvent`, `MergeBriefPacket.slackSentAt`.
- [x] Environment variables configured and validated on startup.
- [x] Log rotation enabled for analysis worker via `winston`.

## Success Metrics for Launch
- 3 active design partners using MergeBrief weekly.
- >50% of PRs have an associated Merge Note if AI code is detected.
- <5% analysis failure rate on non-shallow repositories.

