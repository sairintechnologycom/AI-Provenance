import './globals.css';
import SessionProvider from '../components/SessionProvider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';

export const metadata = {
  title: 'MergeBrief | AI Provenance & Governance',
  description: 'Detect, assess, and govern AI-generated code with human accountability.',
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
          <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform">
                  M
                </div>
                <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                  MergeBrief
                </h1>
              </Link>

              <nav className="flex items-center gap-6">
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
                  <Link 
                    href="/api/auth/signin" 
                    className="glass-button text-sm px-5 py-2 hover:border-primary/50 group"
                  >
                    <span>Sign in</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                )}
              </nav>
            </div>
          </header>

          <main className="max-w-7xl mx-auto py-12 px-6 animate-fade-in">
            {children}
          </main>

          <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-white/40 text-sm">
            <p>&copy; {new Date().getFullYear()} MergeBrief AI. All rights reserved.</p>
            <div className="flex gap-8">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="https://github.com/aincloudtools/AI-Provenance#readme" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Docs</Link>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}

