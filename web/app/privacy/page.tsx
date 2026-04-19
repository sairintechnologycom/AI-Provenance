export const metadata = {
  title: 'Privacy Policy | MergeBrief',
  description: 'How MergeBrief handles your data and protects your privacy.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
      <div className="space-y-4 pb-8 border-b border-white/5">
        <h1 className="text-4xl font-black tracking-tight text-white">Privacy Policy</h1>
        <p className="text-white/40">Last updated: April 19, 2026</p>
      </div>

      <div className="space-y-8 text-white/60 leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">1. Data We Collect</h2>
          <p>MergeBrief collects information necessary to provide AI provenance analysis for your GitHub repositories:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong className="text-white/80">GitHub Account Data</strong>: Username, email, and avatar via GitHub OAuth for authentication.</li>
            <li><strong className="text-white/80">Repository Metadata</strong>: Organization names, repository names, and PR numbers for tracking.</li>
            <li><strong className="text-white/80">Code Diffs</strong>: Commit diffs are analyzed in-memory for AI provenance signals. Raw code is not stored permanently.</li>
            <li><strong className="text-white/80">Analysis Results</strong>: MergeBrief Packets (confidence scores, tags, summaries) are persisted in our database.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">2. How We Use Your Data</h2>
          <p>Your data is used exclusively to provide and improve MergeBrief's AI governance analysis. We do not sell, share, or monetize your data with third parties.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">3. Data Storage & Security</h2>
          <p>All data is stored in encrypted PostgreSQL databases. GitHub tokens are stored securely via NextAuth session management. We follow industry-standard security practices.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">4. Third-Party Services</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong className="text-white/80">GitHub API</strong>: For repository access and webhook processing.</li>
            <li><strong className="text-white/80">Anthropic API</strong>: For semantic analysis of code diffs (diffs are sent to Anthropic's API and are subject to their data handling policy).</li>
            <li><strong className="text-white/80">Slack API</strong>: For sending notifications if configured by your workspace administrator.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">5. Data Retention & Deletion</h2>
          <p>You may request deletion of your data at any time by contacting us. Upon request, we will delete all associated analysis data, leads, and account information within 30 days.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">6. Contact</h2>
          <p>For privacy-related inquiries, please contact us at <a href="mailto:privacy@mergebrief.ai" className="text-primary hover:underline">privacy@mergebrief.ai</a> or reach out to your assigned support representative.</p>
        </section>
      </div>
    </div>
  );
}
