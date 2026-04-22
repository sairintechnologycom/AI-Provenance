'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface AuthWrapperProps {
  children: ReactNode;
  isDemo: boolean;
  session: any;
}

export default function AuthWrapper({ children, isDemo, session: serverSession }: AuthWrapperProps) {
  const { data: clientSession, status } = useSession();
  
  // Use server session for initial render, then client session for reactivity
  const session = clientSession || serverSession;

  return (
    <>
      {isDemo && !session && (
        <div className="glass-card flex items-center justify-between border-primary/20 bg-primary/10 p-4 mb-6 animate-slide-down">
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
      {children}
    </>
  );
}
