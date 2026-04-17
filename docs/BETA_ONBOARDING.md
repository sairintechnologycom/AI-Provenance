# Beta Onboarding Guide

Welcome to the MergeBrief Design Partner Beta! This document outlines how to onboard a new team manually.

## Prerequisites
- A GitHub Organization where you have admin access.
- A Slack Workspace (for notifications).
- Access to the MergeBrief Beta URL.

## Step 1: Install the GitHub App
1. Go to the [MergeBrief GitHub App](https://github.com/apps/merge-brief) page.
2. Click **Install**.
3. Select your organization and choose the repositories you want MergeBrief to monitor.
4. Note the **Installation ID** (visible in your browser URL or App Settings).

## Step 2: Configure the Workspace
1. Sign in to MergeBrief via GitHub.
2. Navigate to **Settings**.
3. Enter your **Workspace Name** (e.g., "Acme Engineering").
4. (Optional) Provide an **Incoming Slack Webhook URL** to receive PR summaries in Slack.
   - Creating a webhook: `Service Home > App Directory > Incoming Webhooks > Add to Slack`.

## Step 3: Verify the Integration
1. Open a new Pull Request in one of the tracked repositories.
2. Look for the **MergeBrief Analysis** check run at the bottom of the PR.
3. Once completed, a summary comment will appear, and a Slack notification will be sent (if configured).
4. Click the link in the GitHub comment or Slack message to view the full **MergeBrief Packet**.

## Step 4: Reviewer Workflow
1. As a reviewer, assess the AI provenance and risk overlays on the packet page.
2. Before merging, provide a **Merge Note** explaining why the AI-generated logic is acceptable.
3. Submit the note to MARK the PR as "Approved" in the MergeBrief dashboard.

## Support
If you encounter issues, please refer to the [Troubleshooting Guide](./TROUBLESHOOTING.md) or contact your MergeBrief support lead.
