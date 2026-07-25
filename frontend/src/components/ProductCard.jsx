import React from 'react';
import { Award, Zap, MessageSquare, Box, Tag, CheckCircle2 } from 'lucide-react';

export default function ProductCard({ product, onSelect, onOpenChat }) {
  // Extract variant stock and SKU info
  const variant = product.variants && product.variants[0] ? product.variants[0] : { sku: 'N/A', stock_quantity: 0 };
  const totalStock = product.variants ? product.variants.reduce((acc, v) => acc + (v.stock_quantity || 0), 0) : 0;
  
  // Extract wholesale price range from JSONB array
  const prices = product.wholesale_prices || [];
  const minPrice = prices.length > 0 ? Math.min(...prices.map(p => Number(p.price))) : product.base_price;
  const maxPrice = prices.length > 0 ? Math.max(...prices.map(p => Number(p.price))) : product.base_price;

  const isResort = product.category === 'Hotel Room/Dorm Bookings';
  const unitLabel = isResort ? 'night' : 'unit';

  // Fallback image based on category
  const getFallbackImg = (cat) => {
    if (cat === 'Apparel/Boutiques') return 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80';
    if (cat === 'Electronics') return 'https://images.unsplash.com/photo-1509391365360-fb0ad92444f6?auto=format&fit=crop&w=600&q=80';
    if (cat === 'FMCG') return 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80';
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
  };

  const imgUrl = product.media_urls && product.media_urls[0] ? product.media_urls[0] : getFallbackImg(product.category);

  return (
    <div className="ali-card">
      <div className="card-img-container">
        <img src={imgUrl} alt={product.title} className="card-img" />
        <span className="bulk-deal-badge">🔥 BULK DEAL</span>
        <span className="moq-pill-badge">MOQ: {product.moq} {unitLabel}s</span>
      </div>

      <div className="card-content-body">
        <div className="supplier-verified-row">
          <Award size={16} className="text-ali-gold" />
          <span>Verified Gold Supplier ⭐</span>
          <span className="text-text-muted text-xs ml-auto">ID: #{product.vendor_id}</span>
        </div>

        <h3 className="card-prod-title">{product.title}</h3>
        <p className="text-xs text-text-muted mb-3 line-clamp-2">{product.description}</p>

        {/* AliExpress Wholesale Volume Matrix Preview */}
        <div className="wholesale-preview-matrix">
          <div className="text-xs font-bold text-ali-gold mb-1 flex items-center justify-between">
            <span>⚡ Section 2.1 Tiered Pricing Matrix:</span>
            <span className="text-text-muted font-normal">Base: {Number(product.base_price).toLocaleString()} ETB</span>
          </div>
          {prices.slice(0, 3).map((tier, idx) => (
            <div key={idx} className="matrix-row">
              <span>{tier.min} - {tier.max} {unitLabel}s:</span>
              <span className="matrix-price-val">{Number(tier.price).toLocaleString()} ETB</span>
            </div>
          ))}
          {prices.length === 0 && (
            <div className="matrix-row">
              <span>Standard Fixed Wholesale Rate:</span>
              <span className="matrix-price-val">{Number(product.base_price).toLocaleString()} ETB</span>
            </div>
          )}
        </div>

        {/* Attributes / Stock Info */}
        <div className="flex items-center justify-between text-xs text-text-muted mb-4 pb-2 border-b border-border-glass">
          <span className="flex items-center gap-1">
            <Box size={14} className="text-accent-emerald" />
            <strong className="text-white">{totalStock}</strong> {unitLabel}s in terminal stock
          </span>
          <span className="bg-bg-secondary px-2 py-0.5 rounded border border-border-glass text-ali-gold font-mono text-xs">
            SKU: {variant.sku}
          </span>
        </div>

        {/* AliExpress Action Buttons */}
        <div className="card-actions-row">
          <button className="btn btn-red flex-1 btn-sm" onClick={() => onSelect(product)}>
            <Zap size={16} />
            <span>Order Tiers / Sample</span>
          </button>
          <button 
            className="btn btn-secondary btn-sm" 
            title="Open RFQ Supplier Chat"
            onClick={() => onOpenChat(product)}
          >
            <MessageSquare size={16} className="text-ali-gold" />
          </button>
        </div>
      </div>
    </div>
  );
}
