import React from 'react';
import { ShieldCheck, Zap, Lock, Award, RefreshCw, Truck } from 'lucide-react';

export default function HeroBanner({ onExplore }) {
  return (
    <div className="ali-hero-banner">
      {/* Promo Card */}
      <div className="hero-promo-card">
        <div>
          <span className="inline-block bg-ali-red text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-3 shadow-lg">
            ⚡ FLASH BULK WHOLESALE & SAMPLE HUB
          </span>
          <h1 className="hero-title">
            Ethiopia's First <span className="gradient-text-red">Unified B2B</span> & <span className="gradient-text-gold">Escrow Market</span>
          </h1>
          <p className="hero-subtitle">
            Source directly from verified Habesha textile mills, solar distributors, Yirgacheffe coffee exporters, and Kuriftu resort block bookings—all under a single, schema-agnostic relational engine.
          </p>
        </div>

        <div>
          <div className="hero-badges-row">
            <div className="hero-badge-pill gold">
              <Award size={15} />
              <span>Verified Gold Suppliers ⭐</span>
            </div>
            <div className="hero-badge-pill emerald">
              <ShieldCheck size={15} />
              <span>100% Chapa / Telebirr Escrow Guaranteed</span>
            </div>
            <div className="hero-badge-pill">
              <Lock size={15} className="text-ali-red" />
              <span>SQL FOR UPDATE Pessimistic Locking</span>
            </div>
            <div className="hero-badge-pill">
              <Truck size={15} className="text-ali-gold" />
              <span>Shared Isuzu 5-Ton Freight Pooling</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button className="btn btn-red" onClick={onExplore}>
              <Zap size={18} />
              <span>Explore Wholesale Catalogs</span>
            </button>
            <span className="text-xs text-text-muted">
              💡 Tip: Try toggling the "Order Retail Audit Sample" checkbox to bypass MOQ barriers!
            </span>
          </div>
        </div>
      </div>

      {/* AliExpress Right Side Statistics & Security Panel */}
      <div className="hero-stats-panel">
        <div className="stat-card-ali">
          <div className="stat-icon-wrapper">
            <ShieldCheck size={26} className="text-ali-gold" />
          </div>
          <div>
            <div className="stat-val-ali">2.5%</div>
            <div className="stat-label-ali">Automated Escrow Commission</div>
          </div>
        </div>

        <div className="stat-card-ali">
          <div className="stat-icon-wrapper">
            <Lock size={26} className="text-ali-red" />
          </div>
          <div>
            <div className="stat-val-ali">0 Race</div>
            <div className="stat-label-ali">Negative Stock Conditions</div>
          </div>
        </div>

        <div className="stat-card-ali">
          <div className="stat-icon-wrapper">
            <RefreshCw size={26} className="text-accent-emerald" />
          </div>
          <div>
            <div className="stat-val-ali">100%</div>
            <div className="stat-label-ali">Idempotent Webhook Replay Shield</div>
          </div>
        </div>

        <div className="stat-card-ali">
          <div className="stat-icon-wrapper">
            <Award size={26} className="text-accent-purple" />
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
