import React, { useState, useMemo } from 'react';
import { X, ShieldCheck, Lock, Award, Zap, AlertTriangle, Check, Box, Tag, Layers } from 'lucide-react';
import { api } from '../services/api';

export default function ProductModal({ product, onClose, onSuccess, onOpenChat, showToast }) {
  const [quantity, setQuantity] = useState(product ? product.moq : 1);
  const [isSample, setIsSample] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(product && product.variants && product.variants[0] ? product.variants[0].id : 1);
  const [loading, setLoading] = useState(false);

  if (!product) return null;

  const isResort = product.category === 'Hotel Room/Dorm Bookings';
  const unitLabel = isResort ? 'night' : 'unit';
  const prices = product.wholesale_prices || [];

  // Calculate resolved price based on Section 2.1 logic
  const resolvedUnitPrice = useMemo(() => {
    if (isSample) return Number(product.base_price);
    if (prices.length === 0) return Number(product.base_price);

    for (const tier of prices) {
      if (quantity >= tier.min && quantity <= tier.max) {
        return Number(tier.price);
      }
    }
    // If quantity is higher than highest tier max, give highest volume discount
    const maxTier = prices.reduce((prev, curr) => (curr.max > prev.max ? curr : prev), prices[0]);
    if (quantity > maxTier.max) return Number(maxTier.price);
    
    return Number(product.base_price);
  }, [quantity, isSample, prices, product.base_price]);

  const totalPrice = (resolvedUnitPrice * quantity).toFixed(2);
  const commission = (totalPrice * 0.025).toFixed(2);

  const handleSampleToggle = (checked) => {
    setIsSample(checked);
    if (checked) {
      setQuantity(1); // Section 2.3 sample is exactly 1 unit
      showToast('🧪 MOQ Sample Bypass Active! You can order 1 unit for physical quality audit.', 'success');
    } else {
      setQuantity(product.moq);
    }
  };

  const handleCheckout = async () => {
    if (!isSample && quantity < product.moq) {
      showToast(`❌ MOQ Violation: Minimum order quantity is ${product.moq} ${unitLabel}s unless ordering a Sample!`, 'danger');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        variant_id: selectedVariantId,
        quantity: Number(quantity),
        is_sample: isSample,
        payment_method: 'CHAPA',
        notes: `AliExpress Checkout - ${isSample ? 'Sample Order (Section 2.3)' : `Wholesale Volume Order (Tier Rate: ${resolvedUnitPrice} ETB)`}`
      };

      const res = await api.createOrder(orderData);
      showToast(`🎉 Escrow Order #${res.order.id} Committed! Capital locked under SQL FOR UPDATE concurrency guardrail.`, 'success');
      onSuccess(res.order);
      onClose();
    } catch (err) {
      showToast(`❌ Checkout Failed: ${err.message}`, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const selectedVariant = product.variants ? product.variants.find(v => v.id === Number(selectedVariantId)) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 text-ali-gold font-bold text-xs uppercase mb-1">
          <Award size={16} />
          <span>Verified Ethiopian B2B Wholesale Manifest ⭐</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">{product.title}</h2>
        <p className="text-sm text-text-muted mb-4">{product.description}</p>

        {/* Section 2.1 Volume Discount Matrix Table */}
        <div className="bg-bg-main p-4 rounded-2xl border border-border-glass mb-6 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-ali-red flex items-center gap-1.5">
              <Zap size={16} /> Section 2.1 Wholesale Volume Discount Matrix:
            </span>
            <span className="text-xs font-mono bg-bg-secondary px-2.5 py-1 rounded text-text-muted border border-border-glass">
              MOQ: {product.moq} {unitLabel}s
            </span>
          </div>

          <table className="ali-volume-table">
            <thead>
              <tr>
                <th>Volume Tier ({unitLabel}s)</th>
                <th>Unit Wholesale Rate</th>
                <th>Discount Savings</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((tier, idx) => {
                const isCurrentTier = !isSample && quantity >= tier.min && quantity <= tier.max;
                const savings = ((Number(product.base_price) - Number(tier.price)) / Number(product.base_price) * 100).toFixed(0);
                return (
                  <tr key={idx} className={isCurrentTier ? 'bg-ali-red/20 font-bold text-white' : ''}>
                    <td><strong>{tier.min} - {tier.max}</strong> {unitLabel}s</td>
                    <td className="font-mono text-ali-gold">{Number(tier.price).toLocaleString()} ETB</td>
                    <td className="text-accent-emerald">{savings > 0 ? `${savings}% OFF` : 'Base Rate'}</td>
                    <td>{isCurrentTier ? <span className="text-ali-red flex items-center gap-1 font-extrabold"><Check size={14}/> ACTIVE TIER</span> : <span className="text-text-muted">Available</span>}</td>
                  </tr>
                );
              })}
              {prices.length === 0 && (
                <tr>
                  <td>1+ {unitLabel}s</td>
                  <td className="font-mono text-ali-gold">{Number(product.base_price).toLocaleString()} ETB</td>
                  <td>Fixed Wholesale Rate</td>
                  <td><span className="text-ali-red font-bold">ACTIVE</span></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 2.3 MOQ Sample Bypass Toggle */}
        <div className="ali-sample-bypass-box">
          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              id="sampleBypass" 
              checked={isSample} 
              onChange={(e) => handleSampleToggle(e.target.checked)}
              className="w-5 h-5 accent-accent-emerald mt-0.5 cursor-pointer"
            />
            <div>
              <label htmlFor="sampleBypass" className="text-sm font-bold text-white cursor-pointer block">
                🧪 Section 2.3 Retail Sample Pipeline (MOQ Bypass)
              </label>
              <p className="text-xs text-text-muted mt-0.5">
                Need to audit physical fabric or inverter build quality before committing to bulk? Check this box to bypass the MOQ barrier and order exactly 1 sample unit at standard base rate!
              </p>
            </div>
          </div>
          <span className="bg-accent-emerald text-black font-extrabold text-xs px-3 py-1 rounded-full whitespace-nowrap shadow">
            {isSample ? 'BYPASS ACTIVE 🚀' : 'OFF'}
          </span>
        </div>

        {/* SKU Variant Selector */}
        {product.variants && product.variants.length > 0 && (
          <div className="form-group mb-4">
            <label className="form-label flex items-center justify-between">
              <span>Select SKU Variant / Specification:</span>
              {selectedVariant && <span className="text-accent-emerald font-mono text-xs">{selectedVariant.stock_quantity} in stock</span>}
            </label>
            <select 
              className="form-select"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(Number(e.target.value))}
            >
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku} — {v.attributes ? JSON.stringify(v.attributes) : 'Standard'} (Stock: {v.stock_quantity})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Interactive Quantity Slider & Calculator */}
        <div className="form-group mb-6">
          <label className="form-label flex items-center justify-between">
            <span>Order Volume Quantity ({unitLabel}s):</span>
            <span className="font-mono text-lg font-extrabold text-ali-gold">{quantity} {unitLabel}s</span>
          </label>
          <input 
            type="range" 
            min={1} 
            max={isSample ? 1 : 500} 
            value={quantity} 
            disabled={isSample}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full accent-ali-red cursor-pointer py-2"
          />
          <div className="flex justify-between text-xs text-text-muted mt-1 font-mono">
            <span>Min: 1</span>
            <span>MOQ Threshold: {product.moq}</span>
            <span>Max: 500+</span>
          </div>
        </div>

        {/* Financial Escrow Breakdown Card */}
        <div className="bg-bg-card p-5 rounded-2xl border border-border-glow mb-6 flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Resolved Unit Wholesale Rate:</span>
            <span className="font-mono font-bold text-white">{resolvedUnitPrice.toLocaleString()} ETB / {unitLabel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Subtotal Capital ({quantity} {unitLabel}s):</span>
            <span className="font-mono font-bold text-white">{Number(totalPrice).toLocaleString()} ETB</span>
          </div>
          <div className="flex justify-between text-xs text-ali-gold border-t border-border-glass pt-2 mt-1">
            <span className="flex items-center gap-1"><ShieldCheck size={14}/> Escrow 2.5% Platform Commission:</span>
            <span className="font-mono">{Number(commission).toLocaleString()} ETB (Deducted at Release)</span>
          </div>
          <div className="flex justify-between text-lg font-extrabold text-ali-red border-t border-border-glass pt-2 mt-1">
            <span>Total Escrow Commitment:</span>
            <span className="font-mono">{Number(totalPrice).toLocaleString()} ETB</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            className="btn btn-red flex-1 py-3 text-base"
            onClick={handleCheckout}
            disabled={loading}
          >
            <Lock size={18} />
            <span>{loading ? 'Locking Stock & Creating Escrow...' : `🔒 Commit Escrow Order (SQL FOR UPDATE)`}</span>
          </button>
          <button 
            className="btn btn-secondary px-5"
            onClick={() => { onClose(); onOpenChat(product); }}
            title="Open RFQ Supplier Negotiation Room"
          >
            💬 RFQ Chat
          </button>
        </div>

        <p className="text-center text-xs text-text-muted mt-3 flex items-center justify-center gap-1">
          <ShieldCheck size={13} className="text-ali-gold" /> Section 5.1: Transaction is isolated with pessimistic row locks to prevent race conditions.
        </p>
      </div>
    </div>
  );
}
