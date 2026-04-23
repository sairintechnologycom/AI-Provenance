'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MergeNoteForm({ 
  packetId, 
  existingNote, 
  currentStatus, 
  isDemo,
  suggestedNotes 
}: { 
  packetId: string, 
  existingNote?: string, 
  currentStatus: string, 
  isDemo?: boolean,
  suggestedNotes?: { whatChanged: string, whyAI: string, verificationSteps: string[] }
}) {
  const [note, setNote] = useState(existingNote || '');
  const [intent, setIntent] = useState<'VERIFIED' | 'ACCEPTED_AS_IS' | 'PARTIAL'>('VERIFIED');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const router = useRouter();

  const handleSave = async () => {
    if (!note.trim() || note.trim().length < 10) {
      alert("Please provide a more detailed rationale (at least 10 characters).");
      return;
    }

    setStatus('saving');
    try {
      const res = await fetch(`/api/packets/${packetId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          note: note.trim(),
          intent: {
            type: intent,
            timestamp: new Date().toISOString(),
            segmentsVerified: intent === 'VERIFIED' ? 'ALL' : 'PARTIAL'
          }
        })
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 5000);
        router.refresh();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const intents = [
    { id: 'VERIFIED', label: 'Verified', icon: '🔍', desc: 'I tested the logic personally.' },
    { id: 'PARTIAL', label: 'Spot Check', icon: '⚡', desc: 'Verified logic flow only.' },
    { id: 'ACCEPTED_AS_IS', label: 'Risk Accepted', icon: '⚠️', desc: 'Accepting AI risk for this PR.' },
  ];

  return (
    <div className="glass-card p-8 space-y-8 relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white tracking-tight">Governance Decision</h3>
        {currentStatus === 'APPROVED' && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-[10px] font-black text-green-400 uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.2)]">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
             </svg>
             Audit Record Active
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Review Intent</p>
        <div className="grid grid-cols-3 gap-3">
          {intents.map((item) => (
            <button
              key={item.id}
              onClick={() => setIntent(item.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 group/item ${
                intent === item.id 
                  ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                  : 'bg-white/5 border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex flex-col gap-2">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className={`text-xs font-bold ${intent === item.id ? 'text-primary' : 'text-white'}`}>{item.label}</p>
                  <p className="text-[9px] text-white/40 font-medium leading-tight mt-1">{item.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Audit Trail Rationale</p>
          {suggestedNotes && !existingNote && (
            <button 
              onClick={() => {
                const formatted = `What Changed: ${suggestedNotes.whatChanged}\nWhy AI: ${suggestedNotes.whyAI}\nVerification: ${suggestedNotes.verificationSteps.join(', ')}`;
                setNote(formatted);
              }}
              className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
            >
              <span>✨ Use AI Suggestion</span>
            </button>
          )}
        </div>
        <div className="relative">
          <textarea
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all duration-300 text-sm h-40 resize-none leading-relaxed"
            placeholder="e.g. Reviewed the connection pooling logic personally. The AI correctly identified the contention issue and implemented a robust retry strategy."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="absolute bottom-4 right-4 text-[10px] font-bold text-white/20 uppercase tracking-widest pointer-events-none">
            {note.trim().length} / 10 min
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={handleSave}
          disabled={isDemo || status === 'saving' || !note.trim() || note.trim().length < 10}
          className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:grayscale shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden relative"
        >
          {status === 'saving' ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="animate-pulse">Sealing Audit Trail...</span>
            </>
          ) : isDemo ? (
            <span>Read-Only Demo Mode</span>
          ) : (
             <>
              <span>Commit Governance Decision</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
             </>
          )}
        </button>
        
        {isDemo && (
          <p className="text-[10px] text-center text-white/40 font-bold uppercase tracking-widest animate-pulse">
            Sign in to your own workspace to commit decisions
          </p>
        )}
        
        {status === 'success' && (
          <div className="text-center animate-slide-up">
            <span className="text-green-400 text-xs font-bold uppercase tracking-widest">✓ Audit Trail Updated Successfully</span>
          </div>
        )}
        {status === 'error' && (
          <div className="text-center animate-slide-up">
            <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Failed to persist decision. Try again.</span>
          </div>
        )}
      </div>
    </div>
  );
}

