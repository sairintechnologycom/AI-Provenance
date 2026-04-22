'use client';

export default function RiskHeatmap({ lineRisks }: { lineRisks: any[] }) {
  if (!lineRisks || lineRisks.length === 0) return null;

  // Group risks by file
  const risksByFile = lineRisks.reduce((acc: any, risk: any) => {
    if (!acc[risk.file]) acc[risk.file] = [];
    acc[risk.file].push(risk);
    return acc;
  }, {});

  return (
    <section className="glass-card p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider text-white/40 flex items-center gap-3">
          <span className="w-1.5 h-4 bg-red-500 rounded-full"></span>
          Contextual Attention Map
        </h3>
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Heatmap v1.0</span>
      </div>
      
      <div className="space-y-6">
        {Object.entries(risksByFile).map(([file, risks]: [string, any]) => (
          <div key={file} className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-white/50 truncate max-w-[70%]" title={file}>
                {file.split('/').pop()}
              </span>
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                {risks.length} {risks.length === 1 ? 'Alert' : 'Alerts'}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {risks.sort((a: any, b: any) => a.line - b.line).map((risk: any, i: number) => (
                <div 
                  key={i}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:scale-105 cursor-help border flex flex-col gap-0.5 ${
                    risk.score >= 90 ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]' :
                    risk.score >= 70 ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                    'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  }`}
                  title={risk.reason}
                >
                  <span className="text-[9px] opacity-40 leading-none">Line</span>
                  <span className="leading-none">{risk.line}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-6 border-t border-white/5 grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/30">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div> Critical
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/30">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div> High
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/30">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]"></div> Moderate
          </div>
        </div>
      </div>
    </section>
  );
}
