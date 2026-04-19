export const metadata = {
  title: 'Terms of Service | MergeBrief',
  description: 'Terms of service for using MergeBrief AI Provenance & Governance.',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
      <div className="space-y-4 pb-8 border-b border-white/5">
        <h1 className="text-4xl font-black tracking-tight text-white">Terms of Service</h1>
        <p className="text-white/40">Last updated: April 19, 2026</p>
      </div>

      <div className="space-y-8 text-white/60 leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
          <p>By using MergeBrief ("the Service"), you agree to be bound by these Terms of Service. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">2. Service Description</h2>
          <p>MergeBrief is an AI provenance detection and governance platform that analyzes Pull Requests in GitHub repositories to identify AI-generated code, assess risk, and facilitate human-in-the-loop approval workflows.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">3. Beta Program</h2>
          <p>MergeBrief is currently in <strong className="text-primary">Beta</strong>. The Service is provided "as-is" during the beta period. Features, APIs, and data formats may change without notice. We make no guarantees about uptime or data persistence during the beta.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">4. Your Responsibilities</h2>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must have appropriate permissions to install the MergeBrief GitHub App on your repositories.</li>
            <li>You agree not to misuse the Service or attempt to reverse-engineer the analysis engine.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">5. Intellectual Property</h2>
          <p>Your code remains your intellectual property. MergeBrief does not claim ownership of any code analyzed through the Service. Analysis results (packets, summaries, risk tags) are generated artifacts of the Service.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">6. Limitation of Liability</h2>
          <p>MergeBrief's AI detection is probabilistic and should not be the sole basis for approval or rejection of code. Human review is essential. We are not liable for any decisions made based on the Service's output.</p>
        </section>

          <h2 className="text-xl font-bold text-white">8. Contact</h2>
          <p>For inquiries, please contact us at <a href="mailto:support@mergebrief.ai" className="text-primary hover:underline">support@mergebrief.ai</a> or through your assigned support representative.</p>
      </div>
    </div>
  );
}
