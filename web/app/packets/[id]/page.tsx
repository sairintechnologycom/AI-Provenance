import Link from 'next/link';
import MergeNoteForm from '@/components/MergeNoteForm';

export const dynamic = 'force-dynamic';

export default async function PacketDetail({ params }: { params: { id: string } }) {
  const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
  const res = await fetch(`${backendUrl}/api/packets/${params.id}`, { cache: 'no-store' });
  
  if (!res.ok) {
    return (
      <div className="glass-card p-20 text-center space-y-4 max-w-2xl mx-auto">
        <div className="text-4xl">🔎</div>
        <h2 className="text-2xl font-bold text-white">Analysis in Progress</h2>
        <p className="text-white/40">This packet is being synthesized. Please refresh in a moment.</p>
        <Link href="/" className="glass-button inline-flex mt-4">Return to Dashboard</Link>
      </div>
    );
  }

  const packet = await res.json();
  const repo = packet.pullRequest.repository;

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm font-medium text-white/40">
            <Link href="/" className="hover:text-primary transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href={`/${repo.owner}/${repo.name}`} className="hover:text-primary transition-colors">{repo.owner}/{repo.name}</Link>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
            PR #{packet.pullRequest.number}
            <span className="text-lg font-normal text-white/20 tracking-normal">MergeBrief Packet</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white/20 uppercase tracking-widest mb-1">Status</p>
            <p className="text-sm font-medium text-white/60">{new Date(packet.createdAt).toLocaleString()}</p>
          </div>
          <div className={`px-5 py-2 rounded-2xl font-bold shadow-2xl border ${
            packet.status === 'COMPLETED' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
            packet.status === 'FAILED' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
            'bg-primary/10 border-primary/30 text-primary'
          }`}>
            {packet.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          {/* Main Risk Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="glass-card p-8 space-y-6 md:col-span-2">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                   <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                  Executive Summary
                </h3>
                <span className="text-xs font-bold px-2 py-1 bg-white/5 border border-white/10 rounded-md text-white/40 uppercase tracking-widest">
                  v{packet.version}
                </span>
              </div>
              <p className="text-lg text-white/70 leading-relaxed font-medium">
                {packet.summary || 'Initial analysis pending...'}
              </p>
            </section>

            <section className="glass-card p-8 space-y-6">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider text-white/40 flex items-center gap-3">
                <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                Semantic Intent
              </h3>
              {packet.intents?.length > 0 ? (
                <ul className="space-y-4">
                  {packet.intents.map((intent: any) => (
                    <li key={intent.id} className="flex gap-3 text-white/60">
                      <span className="text-primary mt-1">▹</span>
                      <span className="font-medium">{intent.detail}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-white/20 italic">No intent data extracted.</p>
              )}
            </section>

             <section className="glass-card p-8 space-y-6">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider text-white/40 flex items-center gap-3">
                <span className="w-1.5 h-4 bg-risk-medium rounded-full"></span>
                Review Routing
              </h3>
              {packet.reviewerSuggestions?.length > 0 ? (
                <div className="space-y-4">
                  {packet.reviewerSuggestions.map((rev: any) => (
                    <div key={rev.id} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                        {rev.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white group-hover:text-primary transition-colors">@{rev.username}</p>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{rev.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/20 italic">No automated routing.</p>
              )}
            </section>
          </div>

          <section className="glass-card p-10 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10" />
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tight text-white">Risk Overlay Analysis</h3>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-risk-low"></div>
                <div className="w-2 h-2 rounded-full bg-risk-medium"></div>
                <div className="w-2 h-2 rounded-full bg-risk-high"></div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-4">
                  <span className="flex-none">Deterministic Overlays</span>
                  <div className="h-[1px] w-full bg-white/10" />
                </h4>
                {packet.tags.filter((t: any) => t.type === 'DETERMINISTIC').length === 0 ? (
                  <p className="text-sm text-white/20 italic">No environmental risks detected.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packet.tags.filter((t: any) => t.type === 'DETERMINISTIC').map((tag: any) => (
                      <div key={tag.id} className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl space-y-2 hover:bg-white/[0.05] transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                            {tag.category}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed font-medium">{tag.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-4">
                  <span className="flex-none">Inferred Risks (Blast Radius)</span>
                  <div className="h-[1px] w-full bg-white/10" />
                </h4>
                {packet.tags.filter((t: any) => t.type === 'INFERRED').length === 0 ? (
                  <p className="text-sm text-white/20 italic">No inference engine results.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packet.tags.filter((t: any) => t.type === 'INFERRED').map((tag: any) => (
                      <div key={tag.id} className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl space-y-2 hover:bg-white/[0.05] transition-colors">
                         <div className="flex justify-between items-center">
                          <span className="bg-risk-medium/20 text-risk-medium text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                            {tag.category}
                          </span>
                           <span className="w-2 h-2 rounded-full bg-risk-medium shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed font-medium">{tag.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-10">
          {/* Decision Panel */}
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-3xl -z-10 group-hover:bg-primary/30 transition-colors" />
            <MergeNoteForm 
              packetId={packet.id} 
              currentStatus={packet.pullRequest.status} 
              existingNote={packet.pullRequest.approvalNote} 
            />
          </div>

          {/* Authorship & Evidence */}
          <section className="glass-card p-8 space-y-8">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">AI Governance Score</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white glow-text">{packet.confidence || 0}%</span>
                <span className="text-xs font-bold text-white/20 uppercase tracking-widest">Evidence</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <span className="text-sm font-bold text-white/40 uppercase tracking-wider">Classification</span>
                <span className="text-sm font-bold text-white">{packet.aiTool || 'Copilot/LLM'}</span>
              </div>

               <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Verification Methods</h4>
                {packet.provenanceEvidence?.map((ev: any) => (
                  <div key={ev.id} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-white/60 uppercase tracking-wider">{ev.method} Analysis</span>
                      <span className="text-primary">{ev.confidence}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)] rounded-full transition-all duration-1000" 
                        style={{ width: `${ev.confidence}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Raw Data Toggle */}
          <details className="glass-card overflow-hidden group">
            <summary className="p-4 font-bold text-xs text-white/30 uppercase tracking-[0.2em] cursor-pointer hover:bg-white/5 transition-colors list-none flex justify-between items-center group-open:bg-white/5">
              <span>Raw Signal Dump</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 transform group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="p-6 bg-black/40">
              <pre className="text-[10px] text-white/40 font-mono leading-relaxed overflow-x-auto selection:bg-primary/40">
                {packet.rawPayload ? JSON.stringify(JSON.parse(packet.rawPayload), null, 2) : 'No audit log found.'}
              </pre>
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}

