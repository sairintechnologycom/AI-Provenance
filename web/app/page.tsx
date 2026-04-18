'use client';

import { useSession } from "next-auth/react";
import { useSearchParams } from 'next/navigation';
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  const showDashboard = session || isDemo;

  if (showDashboard) {
    return (
      <div className="space-y-8 animate-fade-in">
        {isDemo && !session && (
          <div className="glass-card bg-primary/10 border-primary/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">✨</span>
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-wider">Demo Environment</p>
                <p className="text-xs text-white/40">You are viewing a simulated workspace with pre-seeded AI provenance data.</p>
              </div>
            </div>
            <a href="/api/auth/signin" className="glass-button text-[10px] py-1 px-3 uppercase tracking-widest font-black">
              Sign In to Real Workspace
            </a>
          </div>
        )}
        <Dashboard />
      </div>
    );
  }

  return <LandingPage />;
}

