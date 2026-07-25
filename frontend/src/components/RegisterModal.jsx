import React, { useState } from 'react';
import { X, UserPlus, ShieldCheck, Phone, User, Briefcase } from 'lucide-react';
import { api } from '../services/api';

export default function RegisterModal({ onClose, onSuccess, showToast }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'buyer'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('❌ እባክዎ ስምና ስልክ ቁጥር በትክክል ያስገቡ! (Please enter name and phone number)', 'danger');
      return;
    }
    setLoading(true);
    try {
      const res = await api.registerUser(formData);
      showToast(`🎉 እንኳን ደህና መጡ! አዲስ ${formData.role === 'vendor' ? 'የጅምላ አቅራቢ/ሻጭ (Vendor)' : 'የችርቻሮ ገዢ (Buyer)'} አካውንት ተከፍቷል!`, 'success');
      onSuccess(res.user);
      onClose();
    } catch (err) {
      showToast(`❌ Account creation failed: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        
        <div className="flex items-center gap-2 text-ali-gold font-bold text-xs uppercase mb-1">
          <UserPlus size={16} />
          <span>የተጠቃሚ ምዝገባ (User Registration)</span>
        </div>
        
        <h2 className="text-2xl font-extrabold text-white mb-2">አዲስ አካውንት መክፈቻ</h2>
        <p className="text-sm text-text-muted mb-6">
          ማንኛውም ሰው በስምና በስልክ ቁጥር በፍጥነት አካውንት ከፍቶ ወደ ገበያው መቀላቀል ይችላል።
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <User size={14} className="text-ali-red" />
              <span>ሙሉ ስም (Full Name) *</span>
            </label>
            <input 
              type="text" 
              required 
              className="form-input" 
              placeholder="ለምሳሌ፦ አበበ ከበደ / Abebe Kebede"
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <Phone size={14} className="text-ali-red" />
              <span>ስልክ ቁጥር (Phone Number) *</span>
            </label>
            <input 
              type="tel" 
              required 
              className="form-input font-mono" 
              placeholder="0911...... ወይም 07......"
              value={formData.phone} 
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-1.5">
              <Briefcase size={14} className="text-ali-gold" />
              <span>የተጠቃሚ አይነት (Select Role) *</span>
            </label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                className={`p-3 rounded-xl border text-left transition-all ${formData.role === 'buyer' ? 'border-ali-gold bg-ali-gold/10 text-white shadow-md' : 'border-border-glass bg-bg-main text-text-muted hover:border-text-muted'}`}
                onClick={() => setFormData({ ...formData, role: 'buyer' })}
              >
                <div className="font-bold text-sm mb-0.5">🛒 የችርቻሮ ገዢ</div>
                <div className="text-[10px] opacity-80 leading-tight">Buyer (የጅምላ MOQ የሚያሟላ)</div>
              </button>

              <button
                type="button"
                className={`p-3 rounded-xl border text-left transition-all ${formData.role === 'vendor' ? 'border-ali-gold bg-ali-gold/10 text-white shadow-md' : 'border-border-glass bg-bg-main text-text-muted hover:border-text-muted'}`}
                onClick={() => setFormData({ ...formData, role: 'vendor' })}
              >
                <div className="font-bold text-sm mb-0.5">🏪 የጅምላ አቅራቢ</div>
                <div className="text-[10px] opacity-80 leading-tight">Vendor (ፎቶና 30s ቪዲዮ የሚጭን)</div>
              </button>
            </div>
          </div>

          <div className="bg-bg-main p-3 rounded-xl border border-border-glass flex items-center gap-2.5 text-xs text-text-muted my-2">
            <ShieldCheck size={18} className="text-accent-emerald shrink-0" />
            <span>አካውንትዎ እንደተከፈተ ወዲያውኑ ወደ አዲሱ ፕሮፋይል ይቀየራል (Automatic Persona Switch)።</span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-gold w-full py-3 text-base font-bold shadow-lg"
          >
            {loading ? 'እየመዘገበ ነው...' : '✨ አካውንት ክፈት (Open Account)'}
          </button>
        </form>
      </div>
    </div>
  );
}
