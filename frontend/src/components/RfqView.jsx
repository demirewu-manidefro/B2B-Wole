import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, XCircle, Plus, FileText, Award, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function RfqView({ currentPersona, onOpenChat, onOpenCreateRfq, showToast }) {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRfqs = async () => {
    setLoading(true);
    try {
      const data = await api.getRfqNegotiations();
      setRfqs(data.rfqs || []);
    } catch (err) {
      showToast(`❌ Failed to fetch RFQs: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
  }, [currentPersona.id]);

  const handleStatusUpdate = async (id, status, targetPrice = null) => {
    try {
      await api.updateRfqStatus(id, status, targetPrice);
      showToast(`✅ RFQ Contract #${id} status updated to ${status}! Overrides standard pricing matrix on checkout.`, 'success');
      fetchRfqs();
    } catch (err) {
      showToast(`❌ Failed to update RFQ status: ${err.message}`, 'danger');
    }
  };

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span>💬 RFQ Negotiations & Custom Trade Contracts</span>
            <span className="bg-ali-red/20 text-ali-red text-xs px-3 py-1 rounded-full border border-ali-red/40 uppercase font-mono">
              Section 2.2 & 5.4 Duplex Engine
            </span>
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Propose custom unit rates for bulk volume orders. Approved RFQ contracts override standard checkout pricing arrays!
          </p>
        </div>

        {currentPersona.role === 'buyer' && (
          <button className="btn btn-red" onClick={onOpenCreateRfq}>
            <Plus size={18} />
            <span>Propose Custom RFQ</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted font-mono animate-pulse">⚡ Loading RFQ Negotiations...</div>
      ) : rfqs.length === 0 ? (
        <div className="bg-bg-card border border-border-glass rounded-2xl p-12 text-center text-text-muted">
          <FileText size={48} className="mx-auto mb-3 text-ali-gold opacity-50" />
          <h3 className="text-lg font-bold text-white mb-1">No Active RFQ Contracts Found</h3>
          <p className="text-sm">Propose a custom bulk price quote or switch personas to view vendor negotiations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rfqs.map((rfq) => (
            <div key={rfq.id} className="bg-bg-card border border-border-glass rounded-2xl p-6 flex items-center justify-between gap-6 hover:border-ali-gold/50 transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-ali-gold font-bold text-sm">RFQ #{rfq.id}</span>
                  <span className={`text-xs px-3 py-0.5 rounded-full font-extrabold uppercase ${
                    rfq.status === 'Approved' ? 'bg-accent-emerald text-black shadow-lg shadow-accent-emerald/20' :
                    rfq.status === 'Rejected' ? 'bg-ali-red text-white' : 'bg-ali-gold/20 text-ali-gold border border-ali-gold/40'
                  }`}>
                    {rfq.status}
                  </span>
                  <span className="text-xs text-text-muted font-mono">Created: {new Date(rfq.created_at).toLocaleDateString()}</span>
                </div>

                <h3 className="text-xl font-bold text-white mb-1">Target Rate: <span className="text-ali-gold font-mono">{Number(rfq.target_price).toLocaleString()} ETB / unit</span></h3>
                <p className="text-sm text-text-muted mb-2 font-mono bg-bg-main/50 p-2.5 rounded-lg border border-border-glass">
                  "{rfq.notes || 'No specifications provided'}"
                </p>

                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>Buyer ID: #{rfq.buyer_id}</span>
                  <span>•</span>
                  <span>Vendor ID: #{rfq.vendor_id}</span>
                  <span>•</span>
                  <span className="text-accent-emerald font-semibold">🔒 Escrow Protected Communication Room</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                <button 
                  className="btn btn-secondary w-full"
                  onClick={() => onOpenChat({ id: rfq.product_id, title: `RFQ #${rfq.id} Negotiation Room`, vendor_id: rfq.vendor_id })}
                >
                  <MessageSquare size={16} className="text-ali-gold" />
                  <span>Open Duplex Chat</span>
                </button>

                {currentPersona.role === 'vendor' && rfq.status === 'Pending' && (
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-emerald flex-1 btn-sm"
                      onClick={() => handleStatusUpdate(rfq.id, 'Approved', rfq.target_price)}
                    >
                      <CheckCircle size={15} /> Approve Rate
                    </button>
                    <button 
                      className="btn btn-danger flex-1 btn-sm"
                      onClick={() => handleStatusUpdate(rfq.id, 'Rejected')}
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
