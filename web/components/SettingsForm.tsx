'use client';

import { useState } from 'react';

interface Workspace {
  id: string;
  name: string;
  slackWebhookUrl: string | null;
}

export default function SettingsForm({ initialWorkspace }: { initialWorkspace: Workspace | null }) {
  const [name, setName] = useState(initialWorkspace?.name || '');
  const [webhookUrl, setWebhookUrl] = useState(initialWorkspace?.slackWebhookUrl || '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slackWebhookUrl: webhookUrl }),
      });

      if (!res.ok) throw new Error('Failed to update settings');
      
      setStatus('success');
      setMessage('Workspace settings updated successfully.');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke GitHub access? This will stop all AI provenance tracking.')) {
      return;
    }

    setStatus('saving');
    try {
      const res = await fetch('/api/settings', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to revoke access');
      
      setStatus('success');
      setMessage('GitHub access revoked successfully.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="glass-card p-8 space-y-8 border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
        
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">Workspace Configuration</h2>
              <p className="text-xs text-white/40">Identity and environment settings for your team.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/70 block ml-1">Workspace Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-xl"
              placeholder="e.g. Acme Engineering"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/70 block ml-1">Slack Webhook URL</label>
            <input 
              type="url" 
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="glass-input w-full px-4 py-3 rounded-xl font-mono text-sm"
              placeholder="https://hooks.slack.com/services/..."
            />
            <div className="flex items-center gap-2 px-1 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[11px] text-white/40 italic">PR summaries and high-confidence signals are pushed to this hook.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm">
            {status === 'success' && <span className="text-emerald-400 flex items-center gap-2 animate-fade-in">✨ {message}</span>}
            {status === 'error' && <span className="text-red-400 flex items-center gap-2 animate-fade-in">⚠️ {message}</span>}
          </div>
          
          <button 
            type="submit" 
            disabled={status === 'saving'}
            className={`glass-button flex items-center gap-3 px-8 py-3 font-bold group ${status === 'saving' ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}`}
          >
            {status === 'saving' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Save Changes</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="glass-card p-8 border-red-500/10 bg-red-500/5 group">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
            <p className="text-xs text-red-500/40">Irreversible actions that affect your tracking subscription.</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-xl border border-red-500/10 bg-black/20">
          <div>
            <p className="font-bold text-sm">Disconnect GitHub Installation</p>
            <p className="text-xs text-white/40 mt-1 max-w-sm">This will immediately revoke access and stop all AI provenance tracking for this workspace.</p>
          </div>
          <button 
            type="button"
            onClick={handleRevoke}
            className="glass-button border-red-500/20 text-red-400 hover:bg-red-500/10 h-fit py-2.5 px-6 whitespace-nowrap"
          >
            Revoke Access
          </button>
        </div>
      </div>
    </form>
  );
}
