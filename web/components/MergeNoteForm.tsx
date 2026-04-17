'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MergeNoteForm({ packetId, existingNote, currentStatus }: { packetId: string, existingNote?: string, currentStatus: string }) {
  const [note, setNote] = useState(existingNote || '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const router = useRouter();

  const handleSave = async () => {
    setStatus('saving');
    try {
      const res = await fetch(`/api/packets/${packetId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      if (res.ok) {
        setStatus('success');
        router.refresh();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reviewer Approval</h3>
        {currentStatus === 'APPROVED' && (
          <span className="flex items-center gap-1 text-xs font-bold text-green-600 uppercase">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
             </svg>
             Approved
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">Record a brief rationale for why this AI-generated code is acceptable for merge.</p>
      <textarea
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm h-32"
        placeholder="Reviewed the AST and logic. No dangerous side effects found."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-3">
        {status === 'success' && <span className="text-green-600 text-sm self-center">Note saved!</span>}
        <button
          onClick={handleSave}
          disabled={status === 'saving' || !note.trim()}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving...' : 'Submit Approval Note'}
        </button>
      </div>
    </div>
  );
}
