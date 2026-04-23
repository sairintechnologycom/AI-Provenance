'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PolicySettingsForm({ repoId, currentPolicy, isDemo }: { repoId: string, currentPolicy: any, isDemo?: boolean }) {
  const [mode, setMode] = useState(currentPolicy?.mode || 'ADVISORY');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const router = useRouter();

  const handleSave = async () => {
    setStatus('saving');
    try {
      const res = await fetch(`/api/repos/policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoId,
          policy: {
            ...currentPolicy,
            mode
          }
        })
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
        router.refresh();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const modes = [
    { id: 'OBSERVE', label: 'Observe', icon: '👁️', desc: 'Report only. No enforcement.' },
    { id: 'ADVISORY', label: 'Advisory', icon: '📢', desc: 'Warn on risk. Non-blocking.' },
    { id: 'BLOCK', label: 'Enforce', icon: '🛡️', desc: 'Fail checks on high risk.' },
  ];

  return (
    <div className="glass-card p-10 space-y-10 relative overflow-hidden">
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-white tracking-tight">AI Enforcement Mode</h3>
        <p className="text-white/40 text-sm">Select how MergeBrief should respond to AI-assisted risk.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`p-6 rounded-3xl border text-left transition-all duration-300 group ${
              mode === m.id 
                ? 'bg-primary/20 border-primary shadow-[0_0_30px_rgba(59,130,246,0.2)]' 
                : 'bg-white/5 border-white/10 hover:border-white/30'
            }`}
          >
            <div className="flex flex-col gap-4">
              <span className="text-3xl">{m.icon}</span>
              <div>
                <p className={`text-lg font-black ${mode === m.id ? 'text-primary' : 'text-white'}`}>{m.label}</p>
                <p className="text-xs text-white/40 font-medium leading-relaxed mt-1">{m.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="pt-6 border-t border-white/5 flex items-center justify-between">
        <div className="flex flex-col">
           {status === 'success' && <span className="text-green-400 text-xs font-bold uppercase tracking-widest animate-fade-in">✓ Configuration Saved</span>}
           {status === 'error' && <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Failed to save settings</span>}
        </div>
        
        <button
          onClick={handleSave}
          disabled={isDemo || status === 'saving' || mode === currentPolicy?.mode}
          className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-30 shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95"
        >
          {status === 'saving' ? 'Applying...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
