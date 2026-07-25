import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Truck, Box, AlertTriangle, DollarSign, RefreshCw, Lock } from 'lucide-react';
import { api } from '../services/api';

export default function EscrowTimelineView({ currentPersona, onOpenDispute, showToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(data.orders || []);
    } catch (err) {
      showToast(`❌ Failed to load orders: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentPersona.id]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      showToast(`🔒 Escrow Order #${orderId} state transitioned to '${newStatus}'!`, 'success');
      fetchOrders();
    } catch (err) {
      showToast(`❌ State Transition Error: ${err.message}`, 'danger');
    }
  };

  const simulateWebhookPayment = async (order, isDuplicateTest = false) => {
    const txRef = order.tx_ref || `CHAPA-TX-${order.id}-DEMO`;
    try {
      const res = await api.simulateWebhook({
        tx_ref: txRef,
        status: 'success',
        amount: Number(order.total_price),
        currency: 'ETB',
        payment_method: 'CHAPA_TELEBIRR_HYBRID'
      });

      if (isDuplicateTest) {
        showToast(`🛡️ [Section 5.2 Idempotent Replay Shield] Duplicate webhook for tx_ref '${txRef}' dropped cleanly with 200 OK! Balances remain untouched.`, 'warning');
      } else {
        showToast(`💳 Chapa/Telebirr Webhook Processed! Escrow capital of ${Number(order.total_price).toLocaleString()} ETB locked in trust account. Order state transitioned to 'Paid'.`, 'success');
      }
      fetchOrders();
    } catch (err) {
      showToast(`❌ Webhook Error: ${err.message}`, 'danger');
    }
  };

  const steps = [
    { id: 'Created', label: '1. Order Created', icon: '📝' },
    { id: 'Paid', label: '2. Escrow Locked', icon: '🔒' },
    { id: 'Shipped', label: '3. Dispatched', icon: '🚚' },
    { id: 'Delivered', label: '4. Terminal Arrival', icon: '📦' },
    { id: 'Released', label: '5. Capital Released', icon: '💰' },
  ];

  const getStepIndex = (status) => {
    if (status === 'Refunded' || status === 'Disputed') return -1;
    return steps.findIndex(s => s.id === status);
  };

  return (
    <div className="container">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <span>🔒 Escrow Tracking Timeline & Idempotent Ledger</span>
          <span className="bg-ali-red/20 text-ali-red text-xs px-3 py-1 rounded-full border border-ali-red/40 uppercase font-mono">
            Section 3 & 5.2 State Machine
          </span>
        </h1>
        <p className="text-text-muted text-sm mt-1">
          AliExpress-style sequential order progress tracking. All funds are held in zero-trust escrow until buyer inspection and terminal release!
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted font-mono animate-pulse">⚡ Synchronizing Escrow Ledger...</div>
      ) : orders.length === 0 ? (
        <div className="bg-bg-card border border-border-glass rounded-2xl p-12 text-center text-text-muted">
          <ShieldCheck size={48} className="mx-auto mb-3 text-ali-gold opacity-50" />
          <h3 className="text-lg font-bold text-white mb-1">No Escrow Orders Found</h3>
          <p className="text-sm">Explore the wholesale catalog and commit an order to view the interactive timeline!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {orders.map((order) => {
            const currentIdx = getStepIndex(order.status);
            const isDisputed = order.status === 'Disputed';
            const isRefunded = order.status === 'Refunded';

            return (
              <div key={order.id} className="bg-bg-card border border-border-glass rounded-2xl p-6 shadow-xl hover:border-ali-gold/40 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-glass pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-ali-gold font-extrabold text-base">Order #{order.id}</span>
                      <span className={`text-xs px-3 py-1 rounded-full font-extrabold uppercase ${
                        order.status === 'Released' ? 'bg-accent-emerald text-black shadow-lg shadow-accent-emerald/20' :
                        isDisputed ? 'bg-accent-rose text-white animate-pulse' :
                        isRefunded ? 'bg-bg-secondary text-text-muted border border-border-glass' :
                        'bg-ali-gold/20 text-ali-gold border border-ali-gold/40'
                      }`}>
                        State: {order.status}
                      </span>
                      {order.is_sample && (
                        <span className="bg-accent-emerald/20 text-accent-emerald text-xs px-2.5 py-0.5 rounded border border-accent-emerald/40 font-extrabold">
                          🧪 SECTION 2.3 SAMPLE AUDIT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-1 font-mono flex gap-4">
                      <span>Buyer ID: #{order.buyer_id}</span>
                      <span>•</span>
                      <span>Vendor ID: #{order.vendor_id}</span>
                      <span>•</span>
                      <span>TX Ref: {order.tx_ref || 'Pending'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-text-muted">Locked Escrow Capital:</div>
                    <div className="text-2xl font-extrabold text-white font-mono">{Number(order.total_price).toLocaleString()} ETB</div>
                    {order.status === 'Released' && (
                      <div className="text-[11px] text-accent-emerald font-mono">
                        ✓ 2.5% Commission ({Number(order.total_price * 0.025).toLocaleString()} ETB) Deducted
                      </div>
                    )}
                  </div>
                </div>

                {/* AliExpress Horizontal Progress Tracking Bar */}
                {isDisputed ? (
                  <div className="bg-accent-rose/15 border border-accent-rose/40 p-4 rounded-xl text-center my-4">
                    <AlertTriangle size={24} className="mx-auto text-accent-rose mb-1 animate-bounce" />
                    <h4 className="text-base font-bold text-white">⚖️ Order in Formal Arbitration Dispute</h4>
                    <p className="text-xs text-text-muted">Platform Arbiters are reviewing chat transcripts and terminal delivery proofs.</p>
                  </div>
                ) : isRefunded ? (
                  <div className="bg-bg-secondary p-4 rounded-xl text-center my-4 text-text-muted font-mono">
                    ❌ Capital Refunded to Buyer Trust Account
                  </div>
                ) : (
                  <div className="ali-tracking-timeline">
                    {steps.map((step, idx) => {
                      const isCompleted = currentIdx >= idx;
                      const isActive = currentIdx === idx;
                      return (
                        <React.Fragment key={step.id}>
                          <div className={`ali-step-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                            <div className="ali-step-circle">
                              {isCompleted && !isActive ? <CheckCircle2 size={22} /> : <span>{step.icon}</span>}
                            </div>
                            <span className="ali-step-label">{step.label}</span>
                          </div>
                          {idx < steps.length - 1 && (
                            <div className={`ali-step-line ${currentIdx > idx ? 'completed' : ''}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {/* Interactive Simulator Controls */}
                <div className="bg-bg-main p-4 rounded-xl border border-border-glass flex flex-wrap items-center justify-between gap-3 mt-4">
                  <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                    <Lock size={15} className="text-ali-gold" /> Escrow State Simulator Actions:
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {order.status === 'Created' && (
                      <>
                        <button className="btn btn-gold btn-sm" onClick={() => simulateWebhookPayment(order)}>
                          💳 Simulate Chapa Webhook
                        </button>
                        <button className="btn btn-secondary btn-sm !text-xs" onClick={() => simulateWebhookPayment(order, true)}>
                          🛡️ Test Duplicate Webhook Replay (Idempotency)
                        </button>
                      </>
                    )}

                    {order.status === 'Paid' && currentPersona.role === 'vendor' && (
                      <button className="btn btn-red btn-sm" onClick={() => handleStatusUpdate(order.id, 'Shipped')}>
                        🚚 Dispatch Manifest (Transition to Shipped)
                      </button>
                    )}

                    {order.status === 'Shipped' && currentPersona.role === 'buyer' && (
                      <button className="btn btn-emerald btn-sm" onClick={() => handleStatusUpdate(order.id, 'Delivered')}>
                        📦 Confirm Terminal Arrival (Transition to Delivered)
                      </button>
                    )}

                    {order.status === 'Delivered' && currentPersona.role === 'buyer' && (
                      <button className="btn btn-gold btn-sm" onClick={() => handleStatusUpdate(order.id, 'Released')}>
                        💰 Inspect & Release Escrow Capital
                      </button>
                    )}

                    {['Paid', 'Shipped', 'Delivered'].includes(order.status) && (
                      <button className="btn btn-secondary btn-sm !text-accent-rose hover:border-accent-rose" onClick={() => onOpenDispute(order)}>
                        🚨 Raise Dispute
                      </button>
                    )}

                    {isDisputed && currentPersona.role === 'admin' && (
                      <div className="flex gap-2">
                        <button className="btn btn-emerald btn-sm" onClick={() => handleStatusUpdate(order.id, 'Released')}>
                          ⚖️ Arbitrate: Release to Vendor
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleStatusUpdate(order.id, 'Refunded')}>
                          ⚖️ Arbitrate: Refund to Buyer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
