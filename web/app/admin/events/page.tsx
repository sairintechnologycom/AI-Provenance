'use client';

import { useState, useEffect } from 'react';

export default function EventsAdminPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch events:', err);
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
        <h1 className="text-3xl font-black tracking-tight text-white">System Events</h1>
        <p className="text-white/40 mt-2">Monitor internal application activities and audit logs.</p>
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="glass-card p-20 text-center text-white/20 italic">No events recorded.</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="glass-card p-6 border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      event.event.includes('fail') ? 'bg-red-500/10 text-red-400' : 'bg-primary/10 text-primary'
                    } uppercase tracking-widest`}>
                      {event.event}
                    </span>
                    <span className="text-[10px] font-mono text-white/20">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-white/80 font-medium font-mono text-xs break-all">
                    ID: {event.id}
                  </div>
                </div>

                <div className="flex-1 max-w-2xl bg-black/20 rounded-lg p-3 border border-white/5">
                  <pre className="text-[11px] text-white/40 font-mono overflow-x-auto">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
