'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MergeNoteForm({ packetId, existingNote, currentStatus }: { packetId: string, existingNote?: string, currentStatus: string }) {
  const [note, setNote] = useState(existingNote || '');
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
        body: JSON.stringify({ note: note.trim() })
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

  return (
    <div className="glass-card p-8 space-y-6 relative overflow-hidden group">
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
      
      <p className="text-sm text-white/50 leading-relaxed font-medium">Record a human audit trail explaining why this AI-assisted logic is acceptable for deployment. This note is persisted as the source of truth for compliance.</p>
      
      <div className="relative">
        <textarea
          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all duration-300 text-sm h-44 resize-none leading-relaxed"
          placeholder="e.g. Reviewed the connection pooling logic personally. The AI correctly identified the contention issue and implemented a robust retry strategy."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="absolute bottom-4 right-4 text-[10px] font-bold text-white/20 uppercase tracking-widest pointer-events-none">
          {note.trim().length} / 10 min
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={handleSave}
          disabled={status === 'saving' || !note.trim() || note.trim().length < 10}
          className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:grayscale shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden relative"
        >
          {status === 'saving' ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="animate-pulse">Sealing Audit Trail...</span>
            </>
          ) : (
             <>
              <span>Commit Governance Decision</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
             </>
          )}
        </button>
        
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

