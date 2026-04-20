# Guided Tour of MergeBrief

Welcome! This guide will walk you through the core features of MergeBrief using our **Interactive Demo Mode**. You won't need to configure any GitHub Apps or Slack webhooks to follow this tour.

## Prerequisites
- Node.js installed.
- The project dependencies installed (`npm install`).

## Step 1: Launch the Demo
Run the following command in your terminal:
```bash
npm run demo
```
This command will:
1. Seed your local database with mock data (Workspace, Repositories, Pull Requests, and AI Provenance Packets).
2. Start the backend server and the frontend dashboard.

## Step 2: Access the Dashboard
Once the servers are running, open your browser and navigate to:
[http://localhost:3001/?demo=true](http://localhost:3001/?demo=true)

You will see the **MergeBrief Dashboard** in Demo Mode. Notice the status banner at the top indicating you are in a simulated environment.

## Step 3: Explore a Repository
1. On the Dashboard, you'll see a repository named `Acme-Corp/core-api`.
2. Click on the repository card to view the active Pull Requests being monitored.
3. You should see **PR #42: Implement JWT session handling**.

## Step 4: Inspect a "MergeBrief Packet"
Click on **PR #42** to view its synthesis packet. This is the heart of MergeBrief.

### Key Sections to Observe:
- **Executive Summary**: An AI-generated summary of the PR's impact.
- **Semantic Intent**: A list of *why* the changes were made, derived from commit patterns.
- **Risk Overlay Analysis**:
    - **Deterministic Overlays**: Flags changes in sensitive areas like `auth` or `db`.
    - **Inferred Risks**: AI-driven analysis of the "Blast Radius" (e.g., impact on connection pooling).
- **AI Governance Score**: A confidence score indicating how much of the code is likely AI-generated.
- **Verification Methods**: Breakdowns of the techniques used (Trailer analysis, Heuristics, etc.).

## Step 5: The Human-in-the-Loop Workflow
MergeBrief doesn't just detect AI code; it governs it.
1. Scroll down to the **Merge Note** section.
2. In a real workflow, a reviewer must provide a reason *why* this AI-generated code is safe to merge.
3. Type a sample note: *"Reviewed the auth logic for token expiration; looks standard and follows our security policy."*
4. Click **Submit Approval**.
5. Notice how the PR status updates to **APPROVED** within MergeBrief.

## Next Steps
Once you've explored the demo, you can learn how to set up a real integration:
- [**Beta Onboarding Guide**](./BETA_ONBOARDING.md): Manual setup for your own org.
- [**Developer Setup**](./development.md): Hosting your own instance.
