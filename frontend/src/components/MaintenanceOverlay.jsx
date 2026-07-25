import React from 'react';
import { AlertOctagon, ShieldAlert, Radio, Lock } from 'lucide-react';

export default function MaintenanceOverlay({ reason, onSwitchToAdmin }) {
  return (
    <div className="maintenance-screen">
      <div className="bg-bg-secondary border-2 border-ali-red p-8 rounded-3xl max-w-lg shadow-2xl text-center">
        <div className="w-20 h-20 bg-ali-red/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-ali-red/50 animate-pulse">
          <AlertOctagon size={44} className="text-ali-red" />
        </div>
        <span className="bg-ali-red text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
          ⚡ SECTION 5.5 GUARDRAIL ACTIVE
        </span>
        <h1 className="text-3xl font-extrabold text-white mb-2">503 Service Unavailable</h1>
        <h3 className="text-lg font-bold text-ali-gold mb-4">Emergency API Freeze in Effect</h3>
        
        <p className="text-sm text-text-muted mb-6 bg-bg-main p-4 rounded-xl border border-border-glass font-mono">
          "{reason || 'Global database maintenance and security audit in progress. All non-admin transactions are temporarily halted.'}"
        </p>

        <div className="text-xs text-text-muted mb-6 flex items-center justify-center gap-2">
          <Lock size={14} className="text-accent-emerald" />
          <span>Escrow capital and active lock tables remain 100% isolated and protected.</span>
        </div>

        <button 
          className="btn btn-red w-full py-3"
          onClick={onSwitchToAdmin}
        >
          <Radio size={18} />
          <span>Switch to Admin Persona to Inspect & Lift Freeze</span>
        </button>
      </div>
    </div>
  );
}
