import React, { useState } from 'react';
import { X, MessageSquare, Send } from 'lucide-react';
import { api } from '../services/api';

export default function CreateRfqModal({ onClose, onSuccess, showToast }) {
  const [formData, setFormData] = useState({
    product_id: 1,
    vendor_id: 2,
    target_price: '',
    quantity: '50',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        product_id: Number(formData.product_id),
        vendor_id: Number(formData.vendor_id),
        target_price: Number(formData.target_price),
        quantity: Number(formData.quantity)
      };

      const res = await api.createRfq(payload);
      showToast('🎉 Custom RFQ quotation contract proposed to vendor!', 'success');
      onSuccess(res.rfq);
      onClose();
    } catch (err) {
      showToast(`❌ Failed to propose RFQ: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        <div className="flex items-center gap-2 text-ali-gold font-bold text-xs uppercase mb-1">
          <MessageSquare size={16} />
          <span>Section 2.2 — Initialize Custom Trade Negotiation</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-4">Propose Custom RFQ Contract</h2>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Target Product SKU ID *</label>
              <input 
                type="number" 
                required 
                className="form-input font-mono" 
                value={formData.product_id} 
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Target Vendor Persona ID *</label>
              <input 
                type="number" 
                required 
                className="form-input font-mono" 
                value={formData.vendor_id} 
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Proposed Unit Rate (ETB) *</label>
              <input 
                type="number" 
                required 
                className="form-input font-mono text-ali-gold" 
                placeholder="e.g. 3200"
                value={formData.target_price} 
                onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bulk Target Volume *</label>
              <input 
                type="number" 
                required 
                className="form-input font-mono" 
                value={formData.quantity} 
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Trade Specification Notes / Terms</label>
            <textarea 
              className="form-textarea" 
              placeholder="e.g. Need customized gold embroidery for Habesha dresses delivered to Adama terminal..."
              value={formData.notes} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-red" disabled={loading}>
              <Send size={16} />
              <span>{loading ? 'Proposing...' : 'Propose RFQ Contract'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
