import './globals.css';
import SessionProvider from '../components/SessionProvider';
import { getServerSession } from 'next-auth';

export const metadata = {
  title: 'MergeBrief AI Provenance',
  description: 'AI code detection and compliance',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-gray-50 min-h-screen">
        <SessionProvider>
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xl">M</div>
              <h1 className="text-xl font-bold tracking-tight">MergeBrief</h1>
            </div>
            <div className="flex items-center gap-4">
              {session?.user ? (
                <div className="flex items-center gap-4">
                  <a href="/settings" className="text-sm font-medium text-gray-700 hover:text-blue-600">Settings</a>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{session.user.name}</span>
                    <a href="/api/auth/signout" className="text-sm text-gray-400 hover:text-gray-900">Sign out</a>
                  </div>
                </div>
              ) : (
                <a href="/api/auth/signin" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                  Sign in
                </a>
              )}
            </div>
          </header>
          <main className="max-w-7xl mx-auto py-8 px-6">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
