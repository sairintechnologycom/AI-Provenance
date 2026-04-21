'use client';

import { useState } from 'react';

interface BillingSettingsProps {
  subscription: any;
}

export default function BillingSettings({ subscription }: BillingSettingsProps) {
  const [loading, setLoading] = useState(false);

  const handleBilling = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Billing error:', error);
    } finally {
      setLoading(false);
    }
  };

  const status = subscription?.status || 'inactive';
  const isActive = status === 'active';

  return (
    <div className="glass-card overflow-hidden border-white/10">
      <div className="bg-white/[0.02] px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white uppercase tracking-tight">Subscription & Billing</h3>
          <p className="text-sm text-white/40">Manage your workspace plan and payment methods.</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-white/40 border border-white/10'
        }`}>
          {status}
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Current Plan</p>
            <div className="space-y-1">
              <h4 className="text-2xl font-black text-white">{isActive ? 'Pro Plan' : 'Free Beta'}</h4>
              <p className="text-sm text-white/50">
                {isActive 
                  ? 'Access to private repositories and priority analysis enabled.' 
                  : 'Limited to public repositories. Upgrade to analyze private code.'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Billing Cycle</p>
            <div className="space-y-1">
              <h4 className="text-md font-bold text-white">
                {subscription?.currentPeriodEnd 
                  ? `Next billing date: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` 
                  : 'N/A'}
              </h4>
              <p className="text-xs text-white/40 italic">Managed securely via Stripe</p>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleBilling}
            disabled={loading}
            className={`w-full md:w-auto px-10 py-3 rounded-xl font-bold transition-all shadow-xl flex items-center justify-center gap-3 ${
              isActive 
                ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' 
                : 'bg-primary hover:bg-primary-dark text-white shadow-primary/20'
            }`}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isActive ? 'Manage Subscription' : 'Upgrade to Pro'}</span>
                {!isActive && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
