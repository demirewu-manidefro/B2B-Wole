import React, { useState } from 'react';
import { X, Truck, Plus } from 'lucide-react';
import { api } from '../services/api';

export default function CreatePoolModal({ onClose, onSuccess, showToast }) {
  const [formData, setFormData] = useState({
    origin: 'Addis Ababa (Mercato Terminal)',
    destination: 'Adama Commercial Hub',
    vehicle_type: 'Isuzu 5-Ton Truck',
    total_vehicle_cost: '15000',
    max_capacity_cbm: '15',
    departure_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        total_vehicle_cost: Number(formData.total_vehicle_cost),
        max_capacity_cbm: Number(formData.max_capacity_cbm)
      };

      const res = await api.createFreightPool(payload);
      showToast('🎉 New Isuzu Freight Consolidation Route initialized!', 'success');
      onSuccess(res.pool);
      onClose();
    } catch (err) {
      showToast(`❌ Failed to create pool: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        <div className="flex items-center gap-2 text-ali-gold font-bold text-xs uppercase mb-1">
          <Truck size={16} />
          <span>Section 2.4 — Shared Logistics Consolidation</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-4">Initialize Isuzu Consolidation Route</h2>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Origin Terminal *</label>
              <input 
                type="text" 
                required 
                className="form-input" 
                value={formData.origin} 
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Destination Hub *</label>
              <input 
                type="text" 
                required 
                className="form-input" 
                value={formData.destination} 
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Commercial Vehicle Type *</label>
              <select 
                className="form-select"
                value={formData.vehicle_type} 
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              >
                <option value="Isuzu 5-Ton Truck">Isuzu 5-Ton Truck (15 CBM)</option>
                <option value="Isuzu 10-Ton Truck">Isuzu 10-Ton Truck (30 CBM)</option>
                <option value="SinoTruck 20-Ton Trailer">SinoTruck 20-Ton Trailer (60 CBM)</option>
                <option value="Express Commercial Van">Express Commercial Van (8 CBM)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Departure Date *</label>
              <input 
                type="date" 
                required 
                className="form-input" 
                value={formData.departure_date} 
                onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Total Vehicle Rental Cost (ETB) *</label>
              <input 
                type="number" 
                required 
                className="form-input font-mono text-ali-gold" 
                value={formData.total_vehicle_cost} 
                onChange={(e) => setFormData({ ...formData, total_vehicle_cost: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Cargo Volume Capacity (CBM) *</label>
              <input 
                type="number" 
                required 
                className="form-input font-mono" 
                value={formData.max_capacity_cbm} 
                onChange={(e) => setFormData({ ...formData, max_capacity_cbm: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={loading}>
              <Plus size={16} />
              <span>{loading ? 'Initializing...' : 'Create Consolidation Route'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
