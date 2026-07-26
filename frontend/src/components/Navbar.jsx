import React, { useState, useRef, useEffect } from 'react';
import { Search, ShieldCheck, User, ShoppingBag, Radio, Sparkles, Filter, Zap, LogOut, ChevronDown, Package, MessageSquare, Truck, Lock } from 'lucide-react';

export default function Navbar({ 
  currentPersona, 
  activeTab, 
  onTabChange, 
  onSearchJsonb,
  cartCount,
  onOpenAdmin,
  onOpenCreateProduct,
  onOpenRegister,
  onSignOut,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeChip, setActiveChip] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const isGuest = !currentPersona;

  const categories = [
    { id: 'All', label: 'All Wholesale Catalogs', icon: '🌍' },
    { id: 'Apparel/Boutiques', label: 'Habesha Wear & Textiles', icon: '👘' },
    { id: 'Electronics', label: 'Solar & Electronics', icon: '⚡' },
    { id: 'FMCG', label: 'Export Coffee & FMCG', icon: '☕' },
    { id: 'Hotel Room/Dorm Bookings', label: 'Resort Suites & Hospitality', icon: '🏨' },
  ];

  const handleChipClick = (label, jsonQuery) => {
    if (activeChip === label) {
      setActiveChip(null);
      onSearchJsonb(null);
    } else {
      setActiveChip(label);
      onSearchJsonb(jsonQuery);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Role pill config
  const roleMeta = {
    buyer:  { label: '🛒 Buyer',  cls: 'role-buyer' },
    vendor: { label: '🏪 Vendor', cls: 'role-vendor' },
    admin:  { label: '⚖️ Admin',  cls: 'role-admin' },
  };
  const myRole = currentPersona ? (roleMeta[currentPersona.role] || roleMeta.buyer) : null;

  return (
    <header>
      {/* Top Announcement Bar */}
      <div className="top-announcement">
        <div className="top-badge-guarantee">
          <ShieldCheck size={16} className="text-ali-red" />
          <span>AliExpress-Style Escrow Guarantee: 100% Chapa & Telebirr Capital Protection</span>
        </div>
        <div className="top-announcement-links">
          <span>🇪🇹 Addis Ababa Terminal Hub</span>
          <span>⚡ Pessimistic Lock (SQL FOR UPDATE) Active</span>
          <span>v2.0.0-PRO</span>
        </div>
      </div>

      {/* AliExpress Mega Header */}
      <div className="mega-header">
        <div className="mega-header-top">
          {/* Brand Logo */}
          <a href="#" className="brand-logo" onClick={() => { onTabChange('catalog'); setActiveChip(null); onSearchJsonb(null); }}>
            <span className="gradient-text-red">B2B</span>
            <span className="gradient-text-gold">WOLE</span>
            <span className="ali-badge">WHOLESALE ESCROW</span>
          </a>

          {/* AliExpress Search Bar */}
          <div className="search-container">
            <div className="search-box-wrapper">
              <select 
                className="search-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
              <input 
                type="text" 
                className="search-input"
                placeholder="Search bulk apparel, 5kW solar inverters, Yirgacheffe coffee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="search-btn">
                <Search size={18} />
                <span>Search</span>
              </button>
            </div>

            {/* JSONB Containment (@>) Quick Filter Shortcuts */}
            <div className="jsonb-shortcuts-bar">
              <span className="flex items-center gap-1 font-semibold text-text-muted">
                <Filter size={12} /> JSONB Containment (@&gt;):
              </span>
              <button 
                className={`jsonb-chip ${activeChip === 'Size 32' ? 'active' : ''}`}
                onClick={() => handleChipClick('Size 32', { size: '32' })}
              >
                👘 Size: 32 (Apparel)
              </button>
              <button 
                className={`jsonb-chip ${activeChip === 'Wifi' ? 'active' : ''}`}
                onClick={() => handleChipClick('Wifi', { has_wifi: true })}
              >
                🏨 Has Wifi (Resort)
              </button>
              <button 
                className={`jsonb-chip ${activeChip === 'Lithium' ? 'active' : ''}`}
                onClick={() => handleChipClick('Lithium', { battery: 'Lithium' })}
              >
                ⚡ Lithium Battery
              </button>
              {activeChip && (
                <button 
                  className="text-xs text-ali-red underline font-bold ml-1"
                  onClick={() => { setActiveChip(null); onSearchJsonb(null); }}
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          {/* Header Controls */}
          <div className="header-controls">

            {/* ===== GUEST: Sign In / Register Button ===== */}
            {isGuest && (
              <div className="guest-auth-area">
                <button
                  id="navbar-signin-btn"
                  className="ali-signin-btn"
                  onClick={() => onOpenRegister('signin')}
                >
                  <div className="ali-signin-icon">
                    <User size={20} />
                  </div>
                  <div className="ali-signin-text">
                    <span className="ali-signin-welcome">Welcome</span>
                    <span className="ali-signin-cta">Sign in / Register</span>
                  </div>
                  <ChevronDown size={14} className="ali-signin-chevron" />
                </button>
                {/* Mini dropdown on hover */}
                <div className="ali-guest-dropdown">
                  <button
                    className="ali-dropdown-btn-primary"
                    onClick={() => onOpenRegister('signin')}
                  >
                    🔑 Sign In (ግባ)
                  </button>
                  <button
                    className="ali-dropdown-btn-secondary"
                    onClick={() => onOpenRegister('register')}
                  >
                    ✨ Register (ተመዝገብ)
                  </button>
                  <div className="ali-guest-dropdown-footer">
                    <ShieldCheck size={13} /> 100% Secure & Free
                  </div>
                </div>
              </div>
            )}

            {/* ===== LOGGED IN: AliExpress-style "Hi, Name / Account" ===== */}
            {!isGuest && (
              <div className="profile-area" ref={profileRef}>
                {/* AliExpress-style: User icon + "Hi, [FirstName]" + "Account ▾" */}
                <button
                  id="navbar-profile-btn"
                  className={`ali-account-btn ${profileOpen ? 'open' : ''}`}
                  onClick={() => setProfileOpen(o => !o)}
                >
                  <User size={20} className="ali-account-icon" />
                  <div className="ali-account-text">
                    <span className="ali-account-hi">Hi, {currentPersona.name?.split(' ')[0]}</span>
                    <span className="ali-account-label">
                      Account <ChevronDown size={11} className={`inline-block transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </div>
                </button>

                {profileOpen && (
                  <div className="ali-profile-dropdown">
                    {/* Profile header */}
                    <div className="ali-profile-header">
                      <div className="ali-profile-avatar-lg">
                        {currentPersona.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="ali-profile-fullname">{currentPersona.name}</div>
                        <div className="ali-profile-phone">{currentPersona.phone || `ID: ${currentPersona.id}`}</div>
                        <span className={`role-badge ${myRole?.cls} mt-1 inline-block`}>{myRole?.label}</span>
                      </div>
                    </div>

                    <div className="ali-profile-divider" />

                    {/* Quick links */}
                    <div className="ali-profile-links">
                      <button className="ali-profile-link" onClick={() => { onTabChange('orders'); setProfileOpen(false); }}>
                        <Package size={15} /> My Orders & Escrow
                      </button>
                      <button className="ali-profile-link" onClick={() => { onTabChange('rfq'); setProfileOpen(false); }}>
                        <MessageSquare size={15} /> RFQ Negotiations
                      </button>
                      <button className="ali-profile-link" onClick={() => { onTabChange('freight'); setProfileOpen(false); }}>
                        <Truck size={15} /> Freight Pools
                      </button>
                      {currentPersona.role === 'admin' && (
                        <button className="ali-profile-link admin" onClick={() => { onOpenAdmin(); setProfileOpen(false); }}>
                          <Lock size={15} /> Admin Panel
                        </button>
                      )}
                    </div>

                    <div className="ali-profile-divider" />

                    {/* Vendor action */}
                    {currentPersona.role === 'vendor' && (
                      <button
                        className="ali-profile-publish-btn"
                        onClick={() => { onOpenCreateProduct(); setProfileOpen(false); }}
                      >
                        <Sparkles size={14} /> Publish New SKU
                      </button>
                    )}

                    {/* Sign out */}
                    <button
                      id="navbar-signout-btn"
                      className="ali-signout-btn"
                      onClick={() => { onSignOut(); setProfileOpen(false); }}
                    >
                      <LogOut size={14} /> Sign Out (ውጣ)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Cart / Escrow Ledger */}
            <button className="btn btn-secondary btn-sm" onClick={() => onTabChange('orders')}>
              <ShoppingBag size={18} className="text-ali-red" />
              <span>Escrow Ledger</span>
              {cartCount > 0 && <span className="bg-ali-red text-white text-xs px-2 py-0.5 rounded-full font-bold">{cartCount}</span>}
            </button>
          </div>
        </div>

        {/* AliExpress Category Navigation Tabs */}
        <nav className="category-nav">
          <button 
            className={`cat-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => onTabChange('catalog')}
          >
            🔥 Wholesale Flash Catalog
          </button>
          <button 
            className={`cat-tab-btn ${activeTab === 'rfq' ? 'active' : ''}`}
            onClick={() => onTabChange('rfq')}
          >
            💬 RFQ Negotiations & Contracts
          </button>
          <button 
            className={`cat-tab-btn ${activeTab === 'freight' ? 'active' : ''}`}
            onClick={() => onTabChange('freight')}
          >
            🚚 Isuzu Freight Pooling & Splits
          </button>
          <button 
            className={`cat-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => onTabChange('orders')}
          >
            🔒 Escrow Tracking Timeline
          </button>
          <button 
            className={`cat-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => onTabChange('admin')}
          >
            ⚙️ Security Audit & System Guardrails
          </button>
        </nav>
      </div>
    </header>
  );
}
