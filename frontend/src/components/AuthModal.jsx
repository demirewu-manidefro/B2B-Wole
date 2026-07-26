import React, { useState } from 'react';
import { X, ShieldCheck, User, Lock, Phone, ArrowRight, Store } from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({ onClose, onSuccess, showToast, initialTab = 'signin' }) {
  const [step, setStep] = useState('main'); // 'main' | 'signin' | 'register'
  const [loading, setLoading] = useState(false);

  // Sign-in fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('buyer');

  const loginWith = async (phoneNum, pass) => {
    if (!phoneNum.trim()) {
      showToast('❌ Please enter your phone number.', 'danger');
      return;
    }
    if (!pass.trim()) {
      showToast('❌ Please enter your password.', 'danger');
      return;
    }
    setLoading(true);
    try {
      const res = await api.loginUser({ phone: phoneNum, password: pass });
      showToast(`✅ Welcome back, ${res.user.name}!`, 'success');
      onSuccess(res.user);
      onClose();
    } catch {
      showToast('❌ Incorrect phone or password. Please try again.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    loginWith(phone, password);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) {
      showToast('❌ Please enter your name and phone number.', 'danger');
      return;
    }
    setLoading(true);
    try {
      const res = await api.registerUser({ name: regName, phone: regPhone, role: regRole });
      showToast(`✅ Account created! Welcome, ${res.user.name}!`, 'success');
      onSuccess(res.user);
      onClose();
    } catch (err) {
      showToast(`❌ ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>

        {/* Close */}
        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {/* ─── MAIN LANDING ─── */}
        {step === 'main' && (
          <div className="auth-main-step">
            {/* Logo / Brand */}
            <div className="auth-brand">
              <div className="auth-brand-icon">🏢</div>
              <div>
                <div className="auth-brand-name">B2Bwole</div>
                <div className="auth-brand-tagline">Ethiopia's Wholesale Marketplace</div>
              </div>
            </div>

            <div className="auth-security-badge">
              <ShieldCheck size={14} />
              <span>Your information is protected</span>
            </div>

            <h2 className="auth-main-title">Sign in or create account</h2>
            <p className="auth-main-subtitle">
              Access wholesale pricing, manage orders, and grow your business.
            </p>

            <div className="auth-main-actions">
              <button className="auth-btn-primary" onClick={() => setStep('signin')}>
                <Lock size={18} />
                Sign In
              </button>
              <button className="auth-btn-secondary" onClick={() => setStep('register')}>
                <User size={18} />
                Create Account
              </button>
            </div>

            <p className="auth-legal">
              By continuing, you confirm you are an adult and have read our{' '}
              <span className="auth-legal-link">Membership Agreement</span> and{' '}
              <span className="auth-legal-link">Privacy Policy</span>.
            </p>

            <div className="auth-location">
              <span>🇪🇹</span>
              <span>Location: <strong>Ethiopia</strong></span>
            </div>
          </div>
        )}

        {/* ─── SIGN IN ─── */}
        {step === 'signin' && (
          <div className="auth-form-step">
            <button className="auth-back-btn" onClick={() => setStep('main')}>
              ← Back
            </button>

            <div className="auth-step-header">
              <div className="auth-step-icon">
                <Lock size={22} />
              </div>
              <div>
                <h2 className="auth-step-title">Sign In</h2>
                <p className="auth-step-subtitle">Enter your registered phone and password</p>
              </div>
            </div>

            <form onSubmit={handleSignIn} className="auth-form">
              {/* Phone */}
              <div className="auth-field-group">
                <label className="auth-label">Phone Number</label>
                <div className="auth-phone-row">
                  <span className="auth-phone-prefix">🇪🇹 +251</span>
                  <input
                    type="tel"
                    className="auth-phone-input"
                    placeholder="e.g. 0911000001"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-field-group">
                <label className="auth-label">Password</label>
                <input
                  type="password"
                  className="auth-text-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? (
                  <span className="auth-spinner" />
                ) : (
                  <>Sign In <ArrowRight size={17} /></>
                )}
              </button>
            </form>

            <div className="auth-switch-row">
              <span>Don't have an account?</span>
              <button className="auth-switch-link" onClick={() => setStep('register')}>
                Register
              </button>
            </div>
          </div>
        )}

        {/* ─── REGISTER ─── */}
        {step === 'register' && (
          <div className="auth-form-step">
            <button className="auth-back-btn" onClick={() => setStep('main')}>
              ← Back
            </button>

            <div className="auth-step-header">
              <div className="auth-step-icon">
                <User size={22} />
              </div>
              <div>
                <h2 className="auth-step-title">Create Account</h2>
                <p className="auth-step-subtitle">Free membership — instant access</p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="auth-form">
              {/* Full Name */}
              <div className="auth-field-group">
                <label className="auth-label">Full Name</label>
                <input
                  type="text"
                  className="auth-text-input"
                  placeholder="e.g. Abebe Kebede"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Phone */}
              <div className="auth-field-group">
                <label className="auth-label">Phone Number</label>
                <div className="auth-phone-row">
                  <span className="auth-phone-prefix">🇪🇹 +251</span>
                  <input
                    type="tel"
                    className="auth-phone-input"
                    placeholder="e.g. 0912345678"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Role Picker */}
              <div className="auth-field-group">
                <label className="auth-label">I want to</label>
                <div className="auth-role-picker">
                  <button
                    type="button"
                    className={`auth-role-btn ${regRole === 'buyer' ? 'active' : ''}`}
                    onClick={() => setRegRole('buyer')}
                  >
                    <span className="auth-role-icon">🛒</span>
                    <span className="auth-role-label">Buy</span>
                    <span className="auth-role-desc">Shop wholesale</span>
                  </button>
                  <button
                    type="button"
                    className={`auth-role-btn ${regRole === 'vendor' ? 'active' : ''}`}
                    onClick={() => setRegRole('vendor')}
                  >
                    <span className="auth-role-icon"><Store size={20} /></span>
                    <span className="auth-role-label">Sell</span>
                    <span className="auth-role-desc">List products</span>
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? (
                  <span className="auth-spinner" />
                ) : (
                  <>Create Account & Sign In <ArrowRight size={17} /></>
                )}
              </button>
            </form>

            <div className="auth-switch-row">
              <span>Already have an account?</span>
              <button className="auth-switch-link" onClick={() => setStep('signin')}>
                Sign In
              </button>
            </div>

            <p className="auth-legal" style={{ marginTop: '1rem' }}>
              By registering, you agree to our{' '}
              <span className="auth-legal-link">Membership Agreement</span> and{' '}
              <span className="auth-legal-link">Privacy Policy</span>.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
