'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/repos')
      .then(res => res.json())
      .then(data => {
        setRepos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-white/40 font-medium animate-pulse">Syncing repositories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-white">Project Overview</h2>
          <p className="text-white/50">Monitoring AI provenance across {repos.length} active repositories.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          LIVE ANALYSIS ENABLED
        </div>
      </div>
      
      {repos.length === 0 ? (
        <div className="glass-card p-20 text-center space-y-6">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-inner">
             <span className="text-4xl">📦</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No repositories detected</h3>
            <p className="text-white/40 max-w-sm mx-auto leading-relaxed">
              MergeBrief will begin tracking repositories once the GitHub App is installed and PR activity is detected.
            </p>
          </div>
          <Link href="https://github.com/apps/merge-brief" className="glass-button inline-flex py-3 px-8 text-sm">
            Setup GitHub App
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {repos.map((repo: any) => (
            <Link 
              key={repo.id} 
              href={`/${repo.owner}/${repo.name}`}
              className="glass-card p-8 group hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover:bg-primary/10 transition-colors" />
              
              <div className="flex flex-col h-full justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                      📂
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white/30 uppercase tracking-widest">{repo.owner}</span>
                      <h3 className="font-bold text-xl text-white group-hover:text-primary transition-colors">{repo.name}</h3>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Last Activity</p>
                    <p className="text-xs text-white/60 font-medium">
                      {new Date(repo.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/20 group-hover:text-primary group-hover:border-primary/30 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

