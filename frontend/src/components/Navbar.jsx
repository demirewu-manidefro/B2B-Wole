import React, { useState } from 'react';
import { Search, ShieldCheck, User, ShoppingBag, Radio, Sparkles, Filter, Zap, UserPlus } from 'lucide-react';

export default function Navbar({ 
  currentPersona, 
  onPersonaChange, 
  allPersonas = [],
  activeTab, 
  onTabChange, 
  onSearchJsonb,
  cartCount,
  onOpenAdmin,
  onOpenCreateProduct,
  onOpenRegister
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeChip, setActiveChip] = useState(null);

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

  return (
    <header>
      {/* Top Announcement Bar */}
      <div className="top-announcement">
        <div className="top-badge-guarantee">
          <ShieldCheck size={16} className="text-ali-gold" />
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

          {/* AliExpress Search Bar with Category Select & JSONB Containment Shortcuts */}
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

          {/* Persona Switcher & Action Controls */}
          <div className="header-controls">
            <div className="persona-selector">
              <User size={16} className="text-ali-gold" />
              <select 
                className="persona-select"
                value={currentPersona.id}
                onChange={(e) => onPersonaChange(Number(e.target.value))}
              >
                {allPersonas.length > 0 ? (
                  allPersonas.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))
                ) : (
                  <>
                    <option value={1}>Abebe Kebede (Buyer 🏢)</option>
                    <option value={2}>Sara Tadesse (Vendor 👘)</option>
                    <option value={3}>Dawit Mengistu (Tech Vendor ⚡)</option>
                    <option value={4}>Platform Arbiter (Admin ⚖️)</option>
                  </>
                )}
              </select>
              <span className={`role-badge role-${currentPersona.role}`}>
                {currentPersona.role}
              </span>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={onOpenRegister} title="አዲስ አካውንት ክፈት (Open Account with Name & Phone)">
              <UserPlus size={16} className="text-ali-gold" />
              <span className="hidden xl:inline">አካውንት ክፈት</span>
            </button>

            {currentPersona.role === 'vendor' && (
              <button className="btn btn-gold btn-sm" onClick={onOpenCreateProduct}>
                <Sparkles size={16} /> Publish SKU
              </button>
            )}

            {currentPersona.role === 'admin' && (
              <button className="btn btn-red btn-sm" onClick={onOpenAdmin}>
                <Radio size={16} /> 503 Freeze Hub
              </button>
            )}

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
