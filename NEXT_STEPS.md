# Next Sprint: Partner Readiness & Go-to-Market

Now that the core Phase 1 product shell revolves around a unified `MergeBriefPacket` and intuitive Dashboard UX, here is the backlog for the next 2 weeks.

## 1. OAuth / Install Flow (High Priority)
- The current implementation assumes a single statically configured GitHub App instance on a single server payload.
- We need to implement proper `App Installation` webhooks.
- Create an onboarding wizard on the Next.js app to handle the GitHub OAuth handshake.

## 2. Multi-tenant Considerations (High Priority)
- Isolate repositories by `Organization` in queries explicitly.
- Allow org configuration preferences (e.g. strict VS leniency mode).
- Currently, packets are public to anyone with the UUID. We should use short-lived tokens or SSO.

## 3. Slack Webhook (Medium Priority)
- Allow configuring a Slack or MS Teams webhook in the web dashboard.
- Emit a brief summary (similar to the Check Run) immediately to a channel.

## 4. Payment / Billing (Later)
- Do not implement until Phase 3 or Design Partners confirm willingness to scale.
- We will integrate Stripe based on API usage metrics.

## 5. Launch & Marketing (Later)
- Prepare Product Hunt launch assets.
- Refine Landing Page copy.
