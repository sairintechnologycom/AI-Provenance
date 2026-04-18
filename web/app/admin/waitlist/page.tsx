'use client';

import { useState, useEffect } from 'react';

export default function WaitlistAdminPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/leads')
      .then(res => res.json())
      .then(data => {
        setLeads(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch leads:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Waitlist Management</h1>
        <p className="text-white/40 mt-2">Track prospective design partners and early-access leads.</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Contact</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Company / Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Team</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Interest</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-white/20 italic">No leads found.</td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-bold text-white group-hover:text-primary transition-colors">{lead.name}</div>
                      <div className="text-xs text-white/40">{lead.email}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm text-white/70 font-medium">{lead.company}</div>
                      <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{lead.role}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-white/60">
                        {lead.teamSize}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-white/50 max-w-xs truncate">
                      {lead.interest || '-'}
                    </td>
                    <td className="px-6 py-5 text-[10px] font-mono text-white/20">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
