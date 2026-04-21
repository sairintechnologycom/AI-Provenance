import './globals.css';
import SessionProvider from '../components/SessionProvider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';

export const metadata = {
  title: 'MergeBrief | AI Code Governance for Pull Requests',
  description: 'Detect likely AI-written code, focus review on risky changes, and record human approval with rationale.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen premium-gradient-bg">
        <SessionProvider>
          <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/85 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="flex h-8 w-8 items-center justify-center border border-primary/40 bg-primary/15 text-sm font-semibold text-primary transition-colors group-hover:bg-primary/20">
                  M
                </div>
                <div className="flex flex-col leading-none">
                  <h1 className="text-base font-semibold tracking-tight text-white">
                    MergeBrief
                  </h1>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                    AI Code Governance
                  </p>
                </div>
              </Link>

              <nav className="flex items-center gap-5">
                {session?.user ? (
                  <>
                    <Link href="/settings" className="text-sm font-medium text-white/60 hover:text-primary transition-colors">
                      Settings
                    </Link>
                    <div className="h-4 w-[1px] bg-white/10" />
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-white/80 font-medium">{session.user.name}</span>
                      <Link 
                        href="/api/auth/signout" 
                        className="glass-button text-xs py-1.5 px-3 border-red-500/20 text-red-400 hover:bg-red-500/10"
                      >
                        Sign out
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard?demo=true"
                      className="hidden text-sm font-medium text-white/60 transition-colors hover:text-white md:inline-flex"
                    >
                      Demo
                    </Link>
                    <Link
                      href="https://github.com/aincloudtools/AI-Provenance#readme"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden text-sm font-medium text-white/60 transition-colors hover:text-white md:inline-flex"
                    >
                      Docs
                    </Link>
                    <Link
                      href="/api/auth/signin"
                      className="inline-flex items-center justify-center border border-white/15 px-4 py-2 text-sm font-medium text-white/85 transition hover:border-primary/50 hover:text-white"
                    >
                      Sign in
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </header>

          <main className="max-w-7xl mx-auto py-12 px-6 animate-fade-in">
            {children}
          </main>

          <footer className="max-w-7xl mx-auto flex flex-col gap-6 border-t border-white/5 px-6 py-12 text-sm text-white/40 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-white/75">MergeBrief</p>
              <p>AI provenance, risk review, and approval trails for pull requests.</p>
            </div>
            <div className="flex gap-8">
              <Link href="/privacy" className="transition-colors hover:text-white">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-white">Terms</Link>
              <Link href="https://github.com/aincloudtools/AI-Provenance#readme" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">Docs</Link>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
