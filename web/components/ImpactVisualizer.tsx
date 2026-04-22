import React from 'react';

interface ImpactVisualizerProps {
  shadowDeps: string[];
  blastRadius: string[];
  isDemo?: boolean;
}

const ImpactVisualizer: React.FC<ImpactVisualizerProps> = ({ 
  shadowDeps = [], 
  blastRadius = [],
  isDemo = false 
}) => {
  const hasShadowDeps = shadowDeps.length > 0;
  const hasBlastRadius = blastRadius.length > 0;

  if (!hasShadowDeps && !hasBlastRadius) {
    return (
      <div className="glass-card p-8 text-center border-dashed">
        <p className="text-white/20 italic">No significant architectural impact detected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Shadow Dependencies Section */}
      {hasShadowDeps && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
              👻
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Shadow Dependencies</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shadowDeps.map((dep, idx) => (
              <div key={idx} className="glass-card p-4 border-orange-500/30 flex items-center justify-between">
                <span className="font-mono text-orange-300">{dep}</span>
                <span className="text-[10px] font-black bg-orange-500 text-white px-2 py-0.5 rounded uppercase tracking-tighter">Missing in Manifest</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-orange-400/60 italic px-1">
            * These packages are imported but not declared in package.json. This can lead to silent runtime failures.
          </p>
        </section>
      )}

      {/* Blast Radius Section */}
      {hasBlastRadius && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              🌊
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Downstream Impact Zone</h3>
          </div>
          
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <span className="text-sm font-medium text-white/40">Affected Components</span>
              <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full">{blastRadius.length} files impacted</span>
            </div>
            
            <div className="space-y-3">
              {blastRadius.map((file, idx) => {
                const isCritical = /auth|db|security|config|server|core/i.test(file);
                return (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/5 ${isCritical ? 'border-l-2 border-red-500/50 bg-red-500/5' : ''}`}>
                    <span className="text-sm text-white/20">#{(idx + 1).toString().padStart(2, '0')}</span>
                    <span className={`text-sm font-mono flex-1 ${isCritical ? 'text-red-300' : 'text-white/60'}`}>{file}</span>
                    {isCritical && (
                      <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded uppercase tracking-tighter">Critical Path</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ImpactVisualizer;
