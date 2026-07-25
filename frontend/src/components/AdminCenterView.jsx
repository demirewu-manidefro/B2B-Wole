import React, { useState, useEffect } from 'react';
import { Radio, ShieldAlert, CheckCircle, AlertOctagon, Lock, RefreshCw, Eye } from 'lucide-react';
import { api } from '../services/api';

export default function AdminCenterView({ currentPersona, showToast, onMaintenanceChange }) {
  const [maintenance, setMaintenance] = useState({ enabled: false, reason: '' });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [mStatus, logsRes] = await Promise.all([
        api.getMaintenanceStatus(),
        api.getAuditLogs()
      ]);
      setMaintenance(mStatus);
      setAuditLogs(logsRes.logs || []);
    } catch (err) {
      showToast(`❌ Admin API Error: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentPersona.id]);

  const handleToggleMaintenance = async () => {
    const nextState = !maintenance.enabled;
    const reasonMsg = nextState ? 'Emergency Database Migration & Security Scrub Audit in Progress' : '';
    try {
      const res = await api.toggleMaintenance(nextState, reasonMsg);
      setMaintenance(res);
      onMaintenanceChange(res.enabled, res.reason);
      showToast(nextState ? '🚨 Section 5.5 Emergency 503 API Freeze ACTIVATED! All non-admin requests will be halted.' : '✅ 503 Freeze lifted. Normal marketplace APIs restored.', nextState ? 'danger' : 'success');
    } catch (err) {
      showToast(`❌ Toggle Failed: ${err.message}`, 'danger');
    }
  };

  if (currentPersona.role !== 'admin') {
    return (
      <div className="container py-12 text-center">
        <AlertOctagon size={64} className="mx-auto text-ali-red mb-3" />
        <h2 className="text-2xl font-bold text-white mb-1">Access Restricted</h2>
        <p className="text-text-muted">Please switch to the 'Platform Arbiter (Admin)' persona in the top header to view this control center.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <span>⚙️ Admin Security Command Center & Audit Trails</span>
          <span className="bg-ali-red/20 text-ali-red text-xs px-3 py-1 rounded-full border border-ali-red/40 uppercase font-mono">
            Section 5.3, 5.4, & 5.5
          </span>
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Monitor real-time security scrubber interceptions, review IDOR boundary attempts, and manage global emergency API freeze states.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Section 5.5 Emergency 503 API Freeze Card */}
        <div className={`bg-bg-card border rounded-2xl p-6 shadow-xl flex flex-col justify-between ${maintenance.enabled ? 'border-ali-red bg-ali-red/10' : 'border-border-glass'}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Section 5.5 Emergency Switch</span>
              <span className={`text-xs px-3 py-1 rounded-full font-extrabold uppercase ${maintenance.enabled ? 'bg-ali-red text-white animate-pulse' : 'bg-accent-emerald text-black'}`}>
                {maintenance.enabled ? '🚨 503 FREEZE ACTIVE' : '✅ APIS OPERATIONAL'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Global API Maintenance Freeze</h3>
            <p className="text-xs text-text-muted mb-4">
              When activated, all non-admin API requests (`/api/products`, `/api/orders`, `/api/rfq`) instantly return <code>503 Service Unavailable</code> to protect transaction integrity during security incidents.
            </p>
          </div>

          <button 
            className={`btn w-full ${maintenance.enabled ? 'btn-emerald' : 'btn-danger'}`}
            onClick={handleToggleMaintenance}
          >
            <Radio size={18} />
            <span>{maintenance.enabled ? 'Lift 503 Freeze & Restore APIs' : '🚨 ACTIVATE 503 EMERGENCY FREEZE'}</span>
          </button>
        </div>

        {/* Security Summary Cards */}
        <div className="bg-bg-card border border-border-glass rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Section 5.4 Interception Engine</div>
            <h3 className="text-xl font-bold text-white mb-1">Chat & Communication Scrubber</h3>
            <p className="text-xs text-text-muted mb-4">
              Scans 100% of Socket.io duplex negotiation rooms and RFQ notes for Ethiopian phone numbers (`09...`/`07...`) and CBE/Telebirr bank accounts (`1000...`), replacing them with <code>[PLATFORM PROTECTED INFO]</code>.
            </p>
          </div>
          <div className="bg-bg-main p-3 rounded-xl border border-border-glass flex items-center justify-between text-sm font-mono">
            <span className="text-ali-gold">Logged Violations:</span>
            <span className="text-white font-extrabold">{auditLogs.filter(l => l.event_type === 'CHAT_SECURITY_SCRUB').length} Incidents</span>
          </div>
        </div>

        <div className="bg-bg-card border border-border-glass rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Section 5.3 Perimeter Defense</div>
            <h3 className="text-xl font-bold text-white mb-1">IDOR Perimeter Shielding</h3>
            <p className="text-xs text-text-muted mb-4">
              Enforces strict <code>WHERE id = ? AND vendor_id = current_user_id</code> scoping on database operations, preventing horizontal privilege escalation across vendor catalogs.
            </p>
          </div>
          <div className="bg-bg-main p-3 rounded-xl border border-border-glass flex items-center justify-between text-sm font-mono">
            <span className="text-accent-emerald">Perimeter Status:</span>
            <span className="text-white font-extrabold">🔒 100% Token-Bound</span>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="ali-table-container">
        <div className="p-5 border-b border-border-glass flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-ali-red" />
            <span>Real-Time Security Audit Trails (`audit_logs` Table)</span>
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={fetchAdminData}>
            <RefreshCw size={14} /> Refresh Logs
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-muted font-mono animate-pulse">⚡ Synchronizing audit trails...</div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No security incidents recorded in the audit trail yet.</div>
        ) : (
          <table className="ali-data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>User ID</th>
                <th>Event Type</th>
                <th>Severity</th>
                <th>Security Interception Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="font-mono text-ali-gold font-bold">#{log.id}</td>
                  <td className="font-mono">User #{log.user_id}</td>
                  <td>
                    <span className="bg-ali-red/20 text-ali-red text-xs px-2.5 py-1 rounded font-mono border border-ali-red/40 font-bold">
                      {log.event_type}
                    </span>
                  </td>
                  <td>
                    <span className="text-ali-gold font-bold text-xs">{log.severity}</span>
                  </td>
                  <td className="text-xs font-mono text-text-main max-w-md">{log.details}</td>
                  <td className="text-xs text-text-muted font-mono">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
