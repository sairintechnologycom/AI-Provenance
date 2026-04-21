'use client';

import { useState } from 'react';
import Link from 'next/link';

const outcomes = [
  {
    title: 'Detect likely AI-written code',
    body: 'Score pull requests for probable AI authorship using commit signals, diff heuristics, and verification methods.'
  },
  {
    title: 'Focus review where risk is highest',
    body: 'Flag changes in auth, database, configuration, and other sensitive areas so reviewers spend time where it matters.'
  },
  {
    title: 'Record human approval with rationale',
    body: 'Require a reviewer to document why the AI-assisted change is acceptable before it moves forward.'
  }
];

const workflow = [
  'Analyze pull requests and build a provenance packet.',
  'Show confidence, evidence, intent summary, and risk areas.',
  'Collect reviewer approval notes for AI-touched changes.',
  'Keep an audit trail across repositories and pull requests.'
];

const comparison = [
  {
    label: 'GitHub, GitLab, Bitbucket',
    body: 'Helpful for AI-assisted review, summaries, comments, and merge controls.'
  },
  {
    label: 'MergeBrief',
    body: 'Built for AI code governance: provenance, risk review, and accountable approval.'
  }
];

export default function LandingPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', role: '', teamSize: '1-10' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-24">
      <section className="grid gap-12 border border-white/10 bg-white/[0.02] px-8 py-12 md:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] md:px-12">
        <div className="space-y-8">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            AI code governance for pull requests
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Govern AI-generated code before it ships.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-white/70 md:text-xl">
              MergeBrief detects likely AI-written code in pull requests, flags risky changes, and records human approval with rationale.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/dashboard?demo=true"
              className="inline-flex items-center justify-center border border-primary/60 bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Explore demo
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center border border-white/15 bg-transparent px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
            >
              See how it works
            </a>
          </div>

          <div className="grid gap-4 border-t border-white/10 pt-6 text-sm text-white/60 md:grid-cols-3">
            <div>
              <div className="text-white">AI provenance</div>
              <p className="mt-1">Track likely AI authorship with evidence and confidence.</p>
            </div>
            <div>
              <div className="text-white">Risk-focused review</div>
              <p className="mt-1">Highlight sensitive files and likely blast radius.</p>
            </div>
            <div>
              <div className="text-white">Approval trail</div>
              <p className="mt-1">Store reviewer rationale for later audit and follow-up.</p>
            </div>
          </div>
        </div>

        <div className="border border-white/10 bg-[#0a1020] p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-semibold text-white">Sample packet</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">PR #42 · core-api</p>
            </div>
            <span className="border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs font-medium text-amber-200">
              Review required
            </span>
          </div>

          <div className="space-y-5 pt-5 text-sm text-white/70">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-white/10 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">Likely AI authorship</div>
                <div className="mt-2 text-2xl font-semibold text-white">84%</div>
              </div>
              <div className="border border-white/10 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">Risk areas</div>
                <div className="mt-2 text-2xl font-semibold text-white">Auth, DB</div>
              </div>
            </div>

            <div className="border border-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">Evidence</div>
              <ul className="mt-3 space-y-2">
                <li>Commit metadata and heuristic patterns point to AI-generated scaffolding.</li>
                <li>Diff structure matches generated auth/session boilerplate.</li>
                <li>Reviewer note required before merge because sensitive modules changed.</li>
              </ul>
            </div>

            <div className="border border-white/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">Reviewer note</div>
              <p className="mt-3 text-white/85">
                Reviewed token expiry handling and added tests for session invalidation. Acceptable to merge.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {outcomes.map((item) => (
          <div key={item.title} className="border border-white/10 bg-white/[0.02] p-8">
            <h2 className="text-xl font-semibold text-white">{item.title}</h2>
            <p className="mt-3 text-base leading-7 text-white/65">{item.body}</p>
          </div>
        ))}
      </section>

      <section id="how-it-works" className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
        <div className="border border-white/10 bg-white/[0.02] p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">A workflow built for engineering teams.</h2>
          <div className="mt-8 space-y-5">
            {workflow.map((step, index) => (
              <div key={step} className="flex gap-4 border-t border-white/10 pt-5 first:border-t-0 first:pt-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/15 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="pt-1 text-base leading-7 text-white/70">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-white/10 bg-[#0a1020] p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Why not platform AI alone</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Review assistance is not governance.</h2>
          <div className="mt-8 space-y-5">
            {comparison.map((item) => (
              <div key={item.label} className="border border-white/10 p-5">
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <p className="mt-2 text-base leading-7 text-white/65">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="waitlist" className="grid gap-10 border border-white/10 bg-white/[0.02] px-8 py-10 md:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)] md:px-10">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Design partner program</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            For teams adopting AI in production engineering workflows.
          </h2>
          <p className="max-w-2xl text-base leading-8 text-white/65">
            Join the waitlist if you want earlier access to provenance packets, approval workflows, and repository-level visibility into AI-assisted changes.
          </p>
          <div className="space-y-3 border-t border-white/10 pt-5 text-sm text-white/60">
            <p>Best fit: engineering leaders, platform teams, security reviewers, and developer productivity teams.</p>
            <p>Use cases: regulated environments, critical infrastructure, internal governance, and audit readiness.</p>
          </div>
        </div>

        <div className="border border-white/10 bg-[#0a1020] p-6 md:p-8">
          {status === 'success' ? (
            <div className="space-y-4 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center border border-primary/30 bg-primary/10 text-2xl text-primary">
                ✓
              </div>
              <h3 className="text-2xl font-semibold text-white">Request received</h3>
              <p className="text-white/60">We&apos;ll follow up to learn about your review workflow and rollout needs.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-white/60">
                  <span>Name</span>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    className="w-full border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className="space-y-2 text-sm text-white/60">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    placeholder="jane@company.com"
                    className="w-full border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm text-white/60">
                <span>Company</span>
                <input
                  type="text"
                  placeholder="Acme Inc."
                  className="w-full border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary"
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-white/60">
                  <span>Role</span>
                  <input
                    type="text"
                    placeholder="Engineering Manager"
                    className="w-full border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary"
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  />
                </label>
                <label className="space-y-2 text-sm text-white/60">
                  <span>Team size</span>
                  <select
                    className="w-full border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary"
                    onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                  >
                    <option value="1-10">1-10 engineers</option>
                    <option value="11-50">11-50 engineers</option>
                    <option value="51-200">51-200 engineers</option>
                    <option value="200+">200+ engineers</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full border border-primary/60 bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
              >
                {status === 'loading' ? 'Submitting...' : 'Request early access'}
              </button>

              {status === 'error' ? (
                <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
              ) : null}
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
