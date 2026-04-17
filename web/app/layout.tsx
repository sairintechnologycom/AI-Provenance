import './globals.css';

export const metadata = {
  title: 'MergeBrief AI Provenance',
  description: 'AI code detection and compliance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-gray-50 min-h-screen">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xl">M</div>
            <h1 className="text-xl font-bold tracking-tight">MergeBrief</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-8 px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
