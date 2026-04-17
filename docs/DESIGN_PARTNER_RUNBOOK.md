# Design Partner Runbook (Ops)

This document is for the MergeBrief internal team to manage and support design partners.

## Monitoring Beta Usage
1. Inspect the `AppEvent` table in Postgres to see real-time activity:
   - `SELECT * FROM "AppEvent" ORDER BY "createdAt" DESC LIMIT 50;`
2. Key metrics to watch:
   - `packet_completed`: Indicates a successful analysis loop.
   - `reviewer_approved`: Indicates the human-in-the-loop workflow is being used.
   - `packet_failed`: Investigate immediately for large diffs or API timeouts.

## Onboarding a New Partner (Manual Steps)
1. **Initial Outreach**: Confirm the GitHub Organization login and the main point of contact's email.
2. **Setup Workspace**: Manually create a `Workspace` in the DB if the user hasn't done so via the UI, or assist them in the Settings page.
3. **App Approval**: If the organization uses restrictive permissions, ensure the `MergeBrief` App is approved for installation.

## Exporting Leads
- Periodically export the `Lead` table to identify new prospects:
  - `COPY "Lead" TO '/path/to/leads.csv' WITH (FORMAT CSV, HEADER);`

## Common Ops Tasks
### Trigger a manual PR sync
If a PR was missed due to a webhook failure:
```bash
# Example manual sync script (concept)
node src/cli.js sync-pr --owner acme --repo backend --number 123
```

### Resetting a User Role
If a user needs admin access to the dashboard:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'partner-lead@company.com';
```
