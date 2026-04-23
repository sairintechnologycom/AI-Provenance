# 📢 MergeBrief Outreach Assets

This document contains the drafted copy for launching MergeBrief across various community platforms.

---

## 1. Hacker News (Show HN)

**Post Title**: Show HN: MergeBrief – Open-source governance layer to solve "AI Review Inflation"

**Proposed Body**:
Hi HN,

We’re the team behind MergeBrief.

Like many of you, we love the 10x velocity boost from tools like Cursor and Copilot. But we’ve noticed a growing side effect: **AI Review Inflation**. 

Engineering teams are now facing a massive increase in PR volume. Reviewers are drowning in AI-generated scaffolding, making it harder to spot the critical 20% of changes (Auth, Database, Security) that actually need deep human scrutiny.

We built MergeBrief to be the governance control plane for this new era. It’s an open-source, self-hosted tool that sits between your developers and your main branch.

**Key Features**:
- **High-Fidelity Risk Triage**: Automatically flags PRs as Trivial, Standard, or High-Risk based on AI-authorship percentage and module sensitivity.
- **Intent Bridge**: Captures the "Why" behind the AI usage and the verification steps taken by the dev.
- **Policy Engine**: Lets you set rules (e.g., "Block any AI code in /auth without a Senior review").

It’s built with Next.js, Express, and PostgreSQL. It’s designed to run in your own VPC to keep your code private.

We’d love to hear your thoughts on how you’re managing the review bottleneck in the AI era.

**GitHub**: https://github.com/sairintechnologycom/AI-Provenance

---

## 2. X/Twitter Launch Thread

**Tweet 1**: AI coding assistants are a 10x productivity multiplier. 🚀

But they've created a massive new bottleneck: **AI Review Inflation**.

Reviewers are drowning in AI-generated code. Critical security flaws are getting lost in the noise. 🧵

**Tweet 2**: We’re seeing PR volume explode, but human review capacity is fixed. 

The result? "LGTM" culture on steroids and a growing shadow of unverified AI code in production.

**Tweet 3**: Introducing MergeBrief 🛡️.

An open-source governance control plane designed to maintain velocity without sacrificing security.

**Tweet 4**: [Attach Image: Dashboard]
MergeBrief provides **High-Fidelity Risk Triage**. 🎯

It analyzes AI authorship (e.g., "This PR is 84% AI-generated") and highlights critical risk areas before you even open the diff.

**Tweet 5**: [Attach Image: Intent Bridge]
The **Intent Bridge** captures developer intent and AI verification steps automatically. 🌉

Reviewers finally get the context they need: *Why* was AI used, and *how* was it tested?

**Tweet 6**: 🏢 **Enterprise Ready & Open Source**

- Self-hosted (your code stays in your VPC)
- Policy Engine (Observe, Advisory, Block modes)
- Privacy-first

**Tweet 7**: Stop the inflation. Start governing. 

MergeBrief is open-source and ready for your first PR. 

Check us out on GitHub and give us a ⭐ if you're feeling the review pain!

https://github.com/sairintechnologycom/AI-Provenance

---

## 3. LinkedIn (Executive Focus)

**Headline**: Is "AI Review Inflation" slowing down your engineering organization?

As AI coding assistants like Copilot and Cursor become standard, we’re seeing a paradox: developers are writing code 10x faster, but the **Review Bottleneck** is getting worse.

Reviewers are overwhelmed by the volume of AI-generated contributions. This leads to two major risks:
1. **Burnout**: Senior engineers spending hours on "noise."
2. **Security Gaps**: Critical logic changes getting missed in a sea of boilerplate.

Today, we’re launching **MergeBrief**—the first open-source governance layer for the AI era. 🛡️

MergeBrief helps VPs and CTOs maintain velocity by providing:
✅ **Automated Risk Triage**: Know which PRs are trivial and which need eyes-on-code.
✅ **Audit Trails**: Permanent records of AI-assisted code approvals.
✅ **Enterprise Policies**: Enforce security standards on AI contributions at scale.

We’re keeping it open-source and self-hosted because governance belongs in your own environment.

See how we're solving the review crisis:
https://github.com/sairintechnologycom/AI-Provenance

#AI #EngineeringManagement #OpenSource #SoftwareDevelopment #Governance

---

## 4. Dev.to / Hashnode (Technical Deep-Dive)

**Title**: Solving AI Review Inflation: Why we built an open-source triage engine for AI code.

**Intro**:
The "AI-assisted developer" is here to stay. But the "AI-assisted reviewer" is still missing. 

In this post, we dive into the technical architecture of **MergeBrief**, an open-source tool designed to analyze, triage, and govern AI-generated code at scale.

**Key sections to include**:
1. **The Data Problem**: Why standard git diffs aren't enough for AI code.
2. **Authorship Detection**: How we identify AI-generated patterns vs. human code.
3. **The Risk Engine**: Mapping code changes to "Risk Zones" (Auth, Database, Payments).
4. **The "Intent Bridge"**: Using LLMs to summarize developer intent and verification steps.
5. **Open Source Architecture**: Next.js + Express + Prisma + Docker.

Read the full technical breakdown and join the community on GitHub:
https://github.com/sairintechnologycom/AI-Provenance

---

## 5. Product Hunt (Upcoming Launch)

**Tagline**: The Governance Layer for AI-Era Engineering Velocity.

**Description**:
MergeBrief solves "AI Review Inflation" by providing high-fidelity risk triage and auditable approval workflows for AI-assisted code. Maintain 10x velocity without the 10x review burden. Open-source & self-hosted.

**Key Features**:
- 🛡️ Risk Triage (Trivial vs. High-Risk)
- 🌉 Intent Bridge & Evidence
- 🏢 Enterprise Policy Engine
- 🔒 Self-hosted / Privacy-first

---

## 6. Reddit (r/selfhosted)

**Title**: Show reddit: MergeBrief – A self-hosted governance layer for the AI era (solve "AI Review Inflation")

**Proposed Body**:
Hey r/selfhosted,

We’ve all seen the explosion of AI coding assistants (Copilot, Cursor, etc.). They’re great for velocity, but they’ve created a new problem: **AI Review Inflation**.

Reviewers are drowning in AI-generated scaffolding, making it harder to spot the critical security or logic changes.

We built **MergeBrief** to solve this. It’s an open-source, self-hosted governance control plane that sits between your devs and your main branch.

**Why we built it self-hosted**:
- **Privacy**: Your code never leaves your VPC.
- **Control**: You define the governance policies.
- **Transparency**: Open-source triage engine.

**Key Features**:
- 🎯 **High-Fidelity Risk Triage**: Flags PRs as Trivial/Standard/High-Risk based on AI-authorship.
- 🌉 **Intent Bridge**: Automatically captures developer intent and AI verification steps.
- 🐳 **Docker Ready**: One-click setup (Next.js + Express + Postgres).

We’re looking for early feedback and "design partners" who are feeling the review pain.

**GitHub**: https://github.com/sairintechnologycom/AI-Provenance

---

## 7. Reddit (r/programming)

**Title**: Solving "AI Review Inflation": Why we built an open-source triage engine for AI-assisted code

**Proposed Body**:
The "AI-assisted developer" is here to stay, but the "AI-assisted reviewer" is still missing.

As teams adopt tools like Cursor and Copilot, PR volume is exploding. However, human review capacity is fixed. This leads to "LGTM" culture on steroids and unverified AI code reaching production.

We built **MergeBrief** as an open-source triage engine to solve this bottleneck.

**How it works**:
1. **Authorship Analysis**: It detects the percentage of AI-generated code in a PR.
2. **Risk Mapping**: It correlates changes with sensitive modules (Auth, DB, Payments).
3. **Intent Capture**: It summarizes *why* AI was used and *how* the dev verified the output.

It’s built with a modern stack: Next.js, Express, Prisma, and PostgreSQL. It’s designed to be self-hosted to keep your IP secure.

Check out the repo and let us know how you're handling the AI code deluge:
https://github.com/sairintechnologycom/AI-Provenance
