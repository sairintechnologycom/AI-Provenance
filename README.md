# 🛡️ MergeBrief: The AI Governance Layer

**PR Governance for AI-Era Velocity.**

MergeBrief is an open-source governance control plane designed for modern engineering teams. It solves "AI Review Inflation" by providing high-fidelity risk triage, semantic intent analysis, and auditable approval workflows for AI-assisted code contributions.

![MergeBrief Dashboard Overview](./docs/images/dashboard.png)

---

## ✨ Key Features

### 🎯 High-Fidelity Risk Triage
Automatically classify Pull Requests as **Trivial**, **Standard**, or **High-Risk**. MergeBrief analyzes AI authorship (e.g., 84% AI-generated) and highlights critical risk areas like **Auth** and **Database** changes before a human even opens the PR.

### 🌉 Intent Bridge & Evidence
Capture developer intent automatically. MergeBrief provides "Evidence" for AI-generated scaffolding, ensuring that reviewers understand *why* the AI was used and what verification steps were taken.

### 🏢 Enterprise Policy Engine
Enforce governance at scale. Toggle between **Observe**, **Advisory**, and **Block** modes to ensure that high-risk AI code never reaches production without mandatory human verification.

---

## 🚀 Why MergeBrief?

| Benefit | How we do it |
| :--- | :--- |
| **Maintain Velocity** | AI-assisted triage and "Merge Notes" speed up review cycles. |
| **Enhance Security** | Automatic detection of AI-generated changes in sensitive modules. |
| **Audit Readiness** | Permanent, searchable records of every AI-assisted code approval. |
| **Open Source** | Self-hosted, privacy-first governance that keeps your code in your VPC. |

---

## 📦 Deployment Modes

MergeBrief adapts to your stack with three powerful integration levels:

1. **Dashboard (Full Stack)**: Next.js + Express + PostgreSQL. Centralized control plane for the whole organization.
2. **GitHub Action**: Zero-config governance for individual repositories.
3. **CLI Tool**: Powerful ad-hoc audits for local development or custom CI/CD pipelines.

---

## ⚡ Quick Start (Docker)

The fastest way to get MergeBrief running in your environment is using Docker:

```bash
# 1. Clone the repository
git clone https://github.com/sairintechnologycom/AI-Provenance.git
cd AI-Provenance

# 2. Run the setup script
chmod +x ./scripts/setup.sh
./scripts/setup.sh
```

For detailed setup instructions, including GitHub App configuration, see the **[📦 Installation Guide](./docs/INSTALL.md)**.

---

## 📚 Documentation

- [📦 Installation Guide](./docs/INSTALL.md) - Step-by-step Docker setup.
- [⚙️ Configuration Guide](./docs/CONFIG.md) - GitHub App and environment setup.
- [🚀 Usage Guide](./docs/USAGE.md) - How to use the dashboard and CLI.
- [🏢 Production Deployment](./docs/PRODUCTION_DEPLOYMENT.md) - Scaling for enterprise.

---

## 🤝 Contributing

We welcome contributions! MergeBrief is open-source and built for the community. Please see our [Contributing Guidelines](CONTRIBUTING.md) to get started.

---

## ⚠️ Notes

- **Privacy**: MergeBrief processes diffs locally or within your private VPC. Your code never leaves your controlled environment.
- **AI Models**: Supports Anthropic Claude-3 and OpenAI GPT-4 for high-fidelity analysis.

---

*Built with ❤️ by the AI Provenance team.*
