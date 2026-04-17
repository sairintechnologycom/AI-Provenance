# Launch Readiness Checklist

## Product Readiness
- [ ] GitHub OAuth login flow verified in staging.
- [ ] NextAuth session persistence working across page refreshes.
- [ ] Workspace settings (Slack) save process verified.
- [ ] Slack notifications triggered on PR synchronize/open events.
- [ ] Reviewer "Merge Note" flow captures rationale in DB.
- [ ] Analytics events (start, success, fail, view) are populating in `AppEvent`.
- [ ] Landing page waitlist form captures leads.

## Operational Readiness
- [ ] `BETA_ONBOARDING.md` guide is accurate.
- [ ] `DESIGN_PARTNER_RUNBOOK.md` defines clear manual steps for support.
- [ ] `TROUBLESHOOTING.md` covers common integration failures.
- [ ] Support lead assigned for first 3 design partners.

## Infrastructure
- [ ] Database migrations applied: `Workspace`, `User`, `Lead`, `AppEvent`, `MergeBriefPacket.slackSentAt`.
- [ ] Environment variables configured: `GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET`, `APP_URL`.
- [ ] Log rotation enabled for analysis worker.

## Success Metrics for Launch
- 3 active design partners using MergeBrief weekly.
- >50% of PRs have an associated Merge Note if AI code is detected.
- <5% analysis failure rate on non-shallow repositories.
