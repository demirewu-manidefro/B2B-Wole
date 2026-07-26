import React from 'react';
import { ShieldCheck, Zap, Lock, Award, RefreshCw, Truck } from 'lucide-react';

export default function HeroBanner({ onExplore }) {
  return (
    <div className="ali-hero-banner">
      {/* Main Promo Card — AliExpress blue banner style */}
      <div className="hero-promo-card">
        {/* Blue gradient background accent */}
        <div className="hero-promo-bg" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="hero-flash-tag">
            ⚡ FLASH BULK WHOLESALE & SAMPLE HUB
          </span>
          <h1 className="hero-title">
            Ethiopia's First{' '}
            <span className="hero-title-blue">Unified B2B</span>{' '}
            &{' '}
            <span className="hero-title-light">Escrow Market</span>
          </h1>
          <p className="hero-subtitle">
            Source directly from verified Habesha textile mills, solar distributors, Yirgacheffe coffee exporters, and Kuriftu resort block bookings—all under a single, schema-agnostic relational engine.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-badges-row">
            <div className="hero-badge-pill gold">
              <Award size={13} />
              <span>Verified Gold Suppliers ⭐</span>
            </div>
            <div className="hero-badge-pill emerald">
              <ShieldCheck size={13} />
              <span>100% Chapa / Telebirr Escrow</span>
            </div>
            <div className="hero-badge-pill">
              <Lock size={13} style={{ color: '#2563eb' }} />
              <span>Pessimistic Locking</span>
            </div>
            <div className="hero-badge-pill">
              <Truck size={13} style={{ color: '#2563eb' }} />
              <span>Isuzu 5-Ton Freight Pool</span>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="hero-explore-btn" onClick={onExplore}>
              <Zap size={17} />
              <span>Explore Wholesale Catalogs</span>
            </button>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              💡 Toggle "Order Retail Audit Sample" to bypass MOQ!
            </span>
          </div>
        </div>
      </div>

      {/* Right Side Stats Panel */}
      <div className="hero-stats-panel">
        <div className="stat-card-ali">
          <div className="stat-icon-wrapper">
            <ShieldCheck size={24} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <div className="stat-val-ali">2.5%</div>
            <div className="stat-label-ali">Automated Escrow Commission</div>
          </div>
        </div>

        <div className="stat-card-ali">
          <div className="stat-icon-wrapper">
            <Lock size={24} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <div className="stat-val-ali">0 Race</div>
            <div className="stat-label-ali">Negative Stock Conditions</div>
          </div>
        </div>

        <div className="stat-card-ali">
          <div className="stat-icon-wrapper">
            <RefreshCw size={24} style={{ color: '#10b981' }} />
          </div>
          <div>
            <div className="stat-val-ali">100%</div>
            <div className="stat-label-ali">Idempotent Webhook Replay Shield</div>
          </div>
        </div>

        <div className="stat-card-ali">
          <div className="stat-icon-wrapper">
            <Award size={24} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <div className="stat-val-ali">4 Domains</div>
            <div className="stat-label-ali">Unified in Single Relational Schema</div>
          </div>
        </div>
      </div>
    </div>
  );
}
