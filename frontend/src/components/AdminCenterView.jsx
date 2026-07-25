import React, { useState, useEffect } from 'react';
import { Radio, ShieldAlert, CheckCircle, AlertOctagon, Lock, RefreshCw, Eye, Users, Package, ShoppingCart, DollarSign, FolderPlus, Activity, Plus } from 'lucide-react';
import { api } from '../services/api';

export default function AdminCenterView({ currentPersona, showToast, onMaintenanceChange }) {
  const [maintenance, setMaintenance] = useState({ enabled: false, reason: '' });
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAdminTab, setActiveAdminTab] = useState('overview');

  // New Category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [mStatus, logsRes, statsRes, catsRes] = await Promise.all([
        api.getMaintenanceStatus(),
        api.getAuditLogs(),
        api.getAdminStats().catch(() => null),
        api.request('/categories').catch(() => ({ categories: [] }))
      ]);
      setMaintenance(mStatus);
      setAuditLogs(logsRes.logs || []);
      if (statsRes && statsRes.stats) setStats(statsRes.stats);
      if (catsRes && catsRes.categories) setCategories(catsRes.categories);
    } catch (err) {
      showToast(`❌ Admin API Error: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPersona.role === 'admin') {
      fetchAdminData();
    }
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

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) {
      showToast('❌ እባክዎ የካቴጎሪ ስምና ስለግ ያስገቡ!', 'danger');
      return;
    }
    setCreatingCat(true);
    try {
      const res = await api.createCategory({ name: newCatName, slug: newCatSlug });
      showToast(`🎉 አዲስ ካቴጎሪ '${newCatName}' ተጨምሯል!`, 'success');
      setCategories(prev => [...prev, res.category]);
      setNewCatName('');
      setNewCatSlug('');
    } catch (err) {
      showToast(`❌ Failed to add category: ${err.message}`, 'danger');
    } finally {
      setCreatingCat(false);
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
          <span>👑 ዋናው ማኔጀር ማዕከላዊ ዳሽቦርድ (Admin Command Center)</span>
          <span className="bg-ali-red/20 text-ali-red text-xs px-3 py-1 rounded-full border border-ali-red/40 uppercase font-mono">
            Platform Arbiter
          </span>
        </h1>
        <p className="text-text-muted text-sm mt-1">
          ሙሉ ገበያውን፣ ክፍያዎችን፣ አዳዲስ የዕቃ ካቴጎሪዎችን እና አጠራጣሪ ተጠቃሚዎችን የምትቆጣጠርበት ማዕከላዊ ዳሽቦርድ።
        </p>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex gap-3 mb-6 border-b border-border-glass pb-3 overflow-x-auto">
        <button 
          className={`btn btn-sm ${activeAdminTab === 'overview' ? 'btn-gold' : 'btn-secondary'}`}
          onClick={() => setActiveAdminTab('overview')}
        >
          <Activity size={16} />
          <span>📊 ገበያና ክፍያዎች (Market & Payments)</span>
        </button>
        <button 
          className={`btn btn-sm ${activeAdminTab === 'categories' ? 'btn-gold' : 'btn-secondary'}`}
          onClick={() => setActiveAdminTab('categories')}
        >
          <FolderPlus size={16} />
          <span>📁 ካቴጎሪዎች (Categories)</span>
        </button>
        <button 
          className={`btn btn-sm ${activeAdminTab === 'security' ? 'btn-gold' : 'btn-secondary'}`}
          onClick={() => setActiveAdminTab('security')}
        >
          <ShieldAlert size={16} />
          <span>🛡️ የደህንነት ቁጥጥርና Audit Logs (Security & Freeze)</span>
        </button>
      </div>

      {activeAdminTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-bg-card border border-border-glass rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-text-muted text-xs font-bold uppercase mb-2">
                <span>አጠቃላይ ተጠቃሚዎች (Users)</span>
                <Users size={18} className="text-ali-gold" />
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">{stats ? stats.totalUsers : '...'}</div>
              <div className="text-xs text-text-muted font-mono">
                {stats && stats.usersBreakdown ? `🛒 Buyers: ${stats.usersBreakdown.buyer || 0} | 🏪 Vendors: ${stats.usersBreakdown.vendor || 0}` : 'Active ledger users'}
              </div>
            </div>

            <div className="bg-bg-card border border-border-glass rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-text-muted text-xs font-bold uppercase mb-2">
                <span>የምርት ብዛት (Products)</span>
                <Package size={18} className="text-accent-emerald" />
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">{stats ? stats.totalProducts : '...'}</div>
              <div className="text-xs text-text-muted font-mono">
                {stats && stats.productsBreakdown ? `✅ Active SKUs: ${stats.productsBreakdown.active || 0}` : 'Listed in wholesale catalog'}
              </div>
            </div>

            <div className="bg-bg-card border border-border-glass rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-text-muted text-xs font-bold uppercase mb-2">
                <span>የግብይት ትዕዛዞች (Orders)</span>
                <ShoppingCart size={18} className="text-ali-red" />
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">{stats ? stats.totalOrders : '...'}</div>
              <div className="text-xs text-text-muted font-mono">
                Escrow protected transactions
              </div>
            </div>

            <div className="bg-bg-card border border-ali-gold/30 rounded-2xl p-5 shadow-lg bg-ali-gold/5">
              <div className="flex items-center justify-between text-ali-gold text-xs font-bold uppercase mb-2">
                <span>የክፍያ መጠን (Escrow Volume)</span>
                <DollarSign size={18} className="text-ali-gold" />
              </div>
              <div className="text-3xl font-extrabold text-white mb-1">
                {stats ? `${stats.escrowVolume.toLocaleString()} ETB` : '...'}
              </div>
              <div className="text-xs text-ali-gold font-mono">
                💰 2.5% Platform Fees: {stats ? `${stats.platformFees.toLocaleString()} ETB` : '...'}
              </div>
            </div>
          </div>

          {/* Recent Payments / Orders */}
          <div className="ali-table-container mb-8">
            <div className="p-5 border-b border-border-glass flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign size={20} className="text-accent-emerald" />
                <span>የቅርብ ጊዜ ክፍያዎች እና ግብይቶች (Recent Escrow Payments & Orders)</span>
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={fetchAdminData}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            {!stats || !stats.recentOrders || stats.recentOrders.length === 0 ? (
              <div className="p-8 text-center text-text-muted">ምንም የቅርብ ጊዜ ግብይቶች የሉም። (No recent orders found)</div>
            ) : (
              <table className="ali-data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Buyer (ገዢ)</th>
                    <th>Vendor (ሻጭ)</th>
                    <th>Product Title</th>
                    <th>Payment</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-ali-gold font-bold">#{o.id}</td>
                      <td>{o.buyer_name}</td>
                      <td>{o.vendor_name}</td>
                      <td className="max-w-xs truncate">{o.product_title}</td>
                      <td className="font-mono text-xs"><span className="bg-bg-main px-2 py-1 rounded border border-border-glass">{o.payment_method}</span></td>
                      <td className="font-mono font-bold text-accent-emerald">{parseFloat(o.total_amount).toLocaleString()} ETB</td>
                      <td>
                        <span className={`status-badge status-${o.status.toLowerCase()}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeAdminTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Add Category Form */}
          <div className="bg-bg-card border border-border-glass rounded-2xl p-6 md:col-span-1 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Plus size={18} className="text-ali-gold" />
              <span>አዲስ ካቴጎሪ መጨመሪያ (Add Category)</span>
            </h3>
            <p className="text-xs text-text-muted mb-4">
              በገበያው ላይ አዳዲስ የዕቃ ዘርፎችን (ለምሳሌ የግብርና ምርቶች፣ መለዋወጫዎች) በቀላሉ ይጨምሩ።
            </p>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div className="form-group">
                <label className="form-label">የካቴጎሪ ስም (Category Name) *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder="ለምሳሌ፦ Coffee & Grains (ቡና እና እህል)"
                  value={newCatName} 
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">የዩአርኤል ስለግ (Slug URL) *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input font-mono text-xs" 
                  placeholder="coffee-grains"
                  value={newCatSlug} 
                  onChange={(e) => setNewCatSlug(e.target.value)}
                />
              </div>
              <button type="submit" disabled={creatingCat} className="btn btn-gold w-full py-2.5 font-bold">
                {creatingCat ? 'እየጨመረ ነው...' : '✨ ካቴጎሪ ጨምር (Add Category)'}
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="bg-bg-card border border-border-glass rounded-2xl p-6 md:col-span-2 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>የተመዘገቡ የዕቃ ካቴጎሪዎች (Existing Categories Tree)</span>
              <span className="text-xs font-mono bg-bg-main px-2 py-1 rounded text-ali-gold border border-border-glass">{categories.length} Categories</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {categories.map((c) => (
                <div key={c.id} className="p-3 bg-bg-main border border-border-glass rounded-xl flex items-center justify-between hover:border-ali-gold transition-all">
                  <div>
                    <div className="font-bold text-white text-sm">{c.name}</div>
                    <div className="text-xs text-text-muted font-mono">/{c.slug}</div>
                  </div>
                  <span className="text-[10px] bg-bg-secondary px-2 py-0.5 rounded font-mono text-text-muted border border-border-glass">
                    ID #{c.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'security' && (
        <>
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
                <span>Real-Time Security Audit Trails (`audit_logs` Table) — አጠራጣሪ እንቅስቃሴዎች መከታተያ</span>
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
        </>
      )}
    </div>
  );
}
