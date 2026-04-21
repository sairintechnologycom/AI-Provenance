'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Dashboard from '@/components/Dashboard';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  useEffect(() => {
    const showDashboard = session || isDemo;
    if (status !== 'loading' && !showDashboard) {
      router.replace('/');
    }
  }, [router, session, isDemo, status]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </div>
    );
  }

  const showDashboard = session || isDemo;


  if (!showDashboard) {
    return null;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {isDemo && !session && (
        <div className="glass-card flex items-center justify-between border-primary/20 bg-primary/10 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">✨</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-white">Demo Environment</p>
              <p className="text-xs text-white/40">You are viewing a simulated workspace with pre-seeded AI provenance data.</p>
            </div>
          </div>
          <a href="/api/auth/signin" className="glass-button px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            Sign In to Real Workspace
          </a>
        </div>
      )}
      <Dashboard />
    </div>
  );
}
