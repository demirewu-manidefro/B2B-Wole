import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export default function CreateProductModal({ onClose, onSuccess, showToast }) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Apparel/Boutiques',
    base_price: '',
    moq: '10',
    description: '',
    media_urls: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80',
    variants: [{ sku: 'NEW-SKU-001', stock_quantity: 100, attributes: { size: '32', color: 'Gold' } }],
    wholesale_prices: [
      { min: 10, max: 49, price: '' },
      { min: 50, max: 100, price: '' },
      { min: 101, max: 500, price: '' }
    ]
  });
  const [loading, setLoading] = useState(false);

  const categories = ['Apparel/Boutiques', 'Electronics', 'FMCG', 'Hotel Room/Dorm Bookings'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        base_price: Number(formData.base_price),
        moq: Number(formData.moq),
        media_urls: [formData.media_urls],
        wholesale_prices: formData.wholesale_prices.filter(p => p.price !== '').map(p => ({
          min: Number(p.min),
          max: Number(p.max),
          price: Number(p.price)
        }))
      };

      const res = await api.createProduct(payload);
      showToast('🎉 New B2B SKU successfully published to the marketplace catalog!', 'success');
      onSuccess(res.product);
      onClose();
    } catch (err) {
      showToast(`❌ Failed to create product: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        <div className="flex items-center gap-2 text-ali-gold font-bold text-xs uppercase mb-1">
          <Sparkles size={16} />
          <span>Vendor Center — Publish New B2B SKU</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-4">Create Wholesale Product Manifest</h2>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Product Title *</label>
              <input 
                type="text" 
                required 
                className="form-input" 
                placeholder="e.g. Habesha Kemis Royal Gold"
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category Domain *</label>
              <select 
                className="form-select"
                value={formData.category} 
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Base Wholesale Rate (ETB) *</label>
              <input 
                type="number" 
                required 
                className="form-input font-mono" 
                placeholder="4500"
                value={formData.base_price} 
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Minimum Order Quantity (MOQ) *</label>
              <input 
                type="number" 
                required 
                className="form-input font-mono" 
                placeholder="10"
                value={formData.moq} 
                onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Product Description</label>
            <textarea 
              className="form-textarea" 
              placeholder="Detailed wholesale specifications, textile weave, or solar inverter output..."
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Media URL Pointer (Section 4 Cloud Storage)</label>
            <input 
              type="url" 
              className="form-input" 
              value={formData.media_urls} 
              onChange={(e) => setFormData({ ...formData, media_urls: e.target.value })}
            />
          </div>

          <div className="bg-bg-main p-4 rounded-xl border border-border-glass mb-6">
            <h4 className="text-sm font-bold text-ali-gold mb-3">⚡ Section 2.1 Wholesale Volume Discount Tiers (Optional)</h4>
            {formData.wholesale_prices.map((tier, idx) => (
              <div key={idx} className="flex gap-3 mb-2 items-center">
                <input 
                  type="number" 
                  placeholder="Min Qty" 
                  className="form-input text-xs font-mono"
                  value={tier.min} 
                  onChange={(e) => {
                    const newTiers = [...formData.wholesale_prices];
                    newTiers[idx].min = e.target.value;
                    setFormData({ ...formData, wholesale_prices: newTiers });
                  }}
                />
                <span className="text-text-muted">to</span>
                <input 
                  type="number" 
                  placeholder="Max Qty" 
                  className="form-input text-xs font-mono"
                  value={tier.max} 
                  onChange={(e) => {
                    const newTiers = [...formData.wholesale_prices];
                    newTiers[idx].max = e.target.value;
                    setFormData({ ...formData, wholesale_prices: newTiers });
                  }}
                />
                <span className="text-text-muted">@</span>
                <input 
                  type="number" 
                  placeholder="Price ETB" 
                  className="form-input text-xs font-mono text-ali-gold"
                  value={tier.price} 
                  onChange={(e) => {
                    const newTiers = [...formData.wholesale_prices];
                    newTiers[idx].price = e.target.value;
                    setFormData({ ...formData, wholesale_prices: newTiers });
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={loading}>
              <Sparkles size={16} />
              <span>{loading ? 'Publishing...' : 'Publish to Catalog'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
