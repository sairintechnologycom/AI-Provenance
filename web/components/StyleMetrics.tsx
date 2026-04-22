import React from 'react';

interface StyleFinding {
  category: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

interface StyleMetricsProps {
  styleVariance: {
    score: number;
    consistency: number;
    findings: StyleFinding[];
  } | null;
}

const StyleMetrics: React.FC<StyleMetricsProps> = ({ styleVariance }) => {
  if (!styleVariance) return null;

  const { score, consistency, findings } = styleVariance;
  
  // Color mapping based on consistency
  const getStatusColor = (val: number) => {
    if (val >= 90) return 'text-green-400';
    if (val >= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <section className="glass-card p-8 space-y-8 animate-fade-in relative overflow-hidden">
      {/* Background Polish Effect */}
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] -z-10 opacity-20 ${consistency >= 80 ? 'bg-green-500' : 'bg-red-500'}`} />

      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">Style Consistency</h3>
          <p className={`text-5xl font-black ${getStatusColor(consistency)}`}>{consistency}%</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black bg-white/5 border border-white/10 text-white/40 px-2 py-1 rounded uppercase tracking-widest">
            Ghost Authorship Audit
          </span>
        </div>
      </div>

      {/* Consistency Meter Bar */}
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 rounded-full ${consistency >= 80 ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]'}`}
          style={{ width: `${consistency}%` }}
        />
      </div>

      {findings.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Stylistic Deviations</h4>
          <div className="space-y-3">
            {findings.map((finding, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${finding.severity === 'high' ? 'bg-red-500' : 'bg-orange-500'}`} />
                <div className="space-y-1">
                   <div className="flex items-center gap-3">
                     <span className="text-xs font-bold text-white/80">{finding.category.replace('-', ' ').toUpperCase()}</span>
                     <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter ${getSeverityColor(finding.severity)}`}>
                       {finding.severity}
                     </span>
                   </div>
                   <p className="text-sm text-white/50 leading-relaxed font-medium">{finding.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-6 rounded-2xl bg-green-500/5 border border-green-500/20">
          <span className="text-2xl">✨</span>
          <p className="text-sm font-medium text-green-400/80">Excellent stylistic alignment. The AI code perfectly matches your project's coding DNA.</p>
        </div>
      )}
    </section>
  );
};

export default StyleMetrics;
