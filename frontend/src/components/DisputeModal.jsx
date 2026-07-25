import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export default function DisputeModal({ order, onClose, onSuccess, showToast }) {
  const [reason, setReason] = useState('Quality Defect / Textile Weave Mismatch');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateOrderStatus(order.id, 'Disputed');
      showToast(`🚨 Arbitration Dispute Raised for Order #${order.id}! Funds frozen in Escrow trust account.`, 'warning');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(`❌ Failed to raise dispute: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        <div className="flex items-center gap-2 text-accent-rose font-bold text-xs uppercase mb-1">
          <AlertTriangle size={16} />
          <span>Section 3 — Escrow Arbitration Protocol</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-4">Raise Formal Arbitration Dispute</h2>
        <p className="text-sm text-text-muted mb-4">
          Raising a dispute halts the transaction countdown and freezes the <strong>{Number(order.total_price).toLocaleString()} ETB</strong> in the trust account. Platform Arbiters will review duplex chat transcripts and terminal delivery records.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Dispute Category *</label>
            <select 
              className="form-select"
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="Quality Defect / Textile Weave Mismatch">Quality Defect / Textile Weave Mismatch</option>
              <option value="Quantity Shortage at Terminal Hub">Quantity Shortage at Terminal Hub</option>
              <option value="Inverter Specification Mismatch">Inverter Specification Mismatch</option>
              <option value="Delivery Delay / Freight Damage">Delivery Delay / Freight Damage</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Explanation & Evidence *</label>
            <textarea 
              required
              className="form-textarea" 
              placeholder="Describe the discrepancy found during terminal inspection..."
              value={details} 
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              <ShieldAlert size={16} />
              <span>{loading ? 'Submitting...' : 'Freeze Escrow & Dispute'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
