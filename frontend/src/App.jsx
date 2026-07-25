import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import CreateProductModal from './components/CreateProductModal';
import RfqView from './components/RfqView';
import RfqChatModal from './components/RfqChatModal';
import CreateRfqModal from './components/CreateRfqModal';
import FreightPoolView from './components/FreightPoolView';
import CreatePoolModal from './components/CreatePoolModal';
import EscrowTimelineView from './components/EscrowTimelineView';
import DisputeModal from './components/DisputeModal';
import AdminCenterView from './components/AdminCenterView';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import { api } from './services/api';
import { socketService } from './services/socket';
import { AlertCircle, CheckCircle, Info, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const [currentPersona, setCurrentPersona] = useState({ id: 1, role: 'buyer', name: 'Abebe Kebede' });
  const [activeTab, setActiveTab] = useState('catalog');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [chatProduct, setChatProduct] = useState(null);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateRfq, setShowCreateRfq] = useState(false);
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [disputeOrder, setDisputeOrder] = useState(null);

  // Maintenance & Security state
  const [maintenance, setMaintenance] = useState({ enabled: false, reason: '' });
  const [toasts, setToasts] = useState([]);

  const personasMap = {
    1: { id: 1, role: 'buyer', name: 'Abebe Kebede (Buyer 🏢)' },
    2: { id: 2, role: 'vendor', name: 'Sara Tadesse (Vendor 👘)' },
    3: { id: 3, role: 'vendor', name: 'Dawit Mengistu (Tech Vendor ⚡)' },
    4: { id: 4, role: 'admin', name: 'Platform Arbiter (Admin ⚖️)' }
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const handlePersonaChange = (newId) => {
    const persona = personasMap[newId] || personasMap[1];
    setCurrentPersona(persona);
    api.setUserId(newId);
    socketService.connect(newId);
    showToast(`👤 Persona Switched to: ${persona.name}. Authorizations updated!`, 'info');
  };

  const fetchProducts = async (category = null) => {
    setLoadingProducts(true);
    try {
      const data = await api.getProducts(category);
      setProducts(data.products || []);
    } catch (err) {
      if (err.status === 503) {
        setMaintenance({ enabled: true, reason: err.data?.message || 'Emergency API Freeze' });
      } else {
        showToast(`❌ Catalog Error: ${err.message}`, 'danger');
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSearchJsonb = async (jsonQuery) => {
    if (!jsonQuery) {
      fetchProducts();
      return;
    }
    setLoadingProducts(true);
    try {
      const data = await api.queryJsonbContainment(jsonQuery);
      setProducts(data.products || []);
      showToast(`⚡ Section 7 JSONB Containment (@>) executed! Found ${data.products?.length || 0} matching SKUs.`, 'success');
    } catch (err) {
      showToast(`❌ JSONB Query Error: ${err.message}`, 'danger');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    api.setUserId(currentPersona.id);
    socketService.connect(currentPersona.id);
    fetchProducts();
    api.getMaintenanceStatus().then(res => setMaintenance(res)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen pb-16">
      {/* Toast Notification Stack */}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item ${t.type}`}>
            {t.type === 'danger' ? <AlertCircle size={20} className="text-ali-red shrink-0" /> :
             t.type === 'warning' ? <Info size={20} className="text-ali-gold shrink-0" /> :
             <CheckCircle size={20} className="text-accent-emerald shrink-0" />}
            <div className="text-sm font-medium">{t.message}</div>
          </div>
        ))}
      </div>

      {/* Section 5.5 Emergency 503 Overlay */}
      {maintenance.enabled && currentPersona.role !== 'admin' && (
        <MaintenanceOverlay 
          reason={maintenance.reason} 
          onSwitchToAdmin={() => handlePersonaChange(4)} 
        />
      )}

      {/* Navigation Header */}
      <Navbar 
        currentPersona={currentPersona}
        onPersonaChange={handlePersonaChange}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); if (tab === 'catalog') fetchProducts(); }}
        onSearchJsonb={handleSearchJsonb}
        cartCount={cartCount}
        onOpenAdmin={() => setActiveTab('admin')}
        onOpenCreateProduct={() => setShowCreateProduct(true)}
      />

      {/* Main Content Body */}
      <main>
        {activeTab === 'catalog' && (
          <div className="container">
            <HeroBanner onExplore={() => window.scrollTo({ top: 500, behavior: 'smooth' })} />

            <div className="flex items-center justify-between mb-6 border-b border-border-glass pb-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                  <span>🔥 AliExpress Wholesale Flash Catalog & Sample Hub</span>
                </h2>
                <p className="text-xs text-text-muted mt-1">
                  Click any card to calculate volume discounts (Section 2.1) or test the MOQ Sample Bypass (Section 2.3).
                </p>
              </div>
              <span className="text-xs font-mono bg-bg-secondary px-3 py-1 rounded-full border border-border-glass text-ali-gold">
                {products.length} SKUs Listed
              </span>
            </div>

            {loadingProducts ? (
              <div className="text-center py-16 text-text-muted font-mono animate-pulse">⚡ Synchronizing database catalog...</div>
            ) : products.length === 0 ? (
              <div className="bg-bg-card border border-border-glass rounded-2xl p-12 text-center text-text-muted">
                <Zap size={48} className="mx-auto mb-3 text-ali-gold opacity-50" />
                <h3 className="text-lg font-bold text-white mb-1">No SKUs Match Your Search</h3>
                <p className="text-sm">Try clearing the JSONB containment filter or publishing a new product.</p>
              </div>
            ) : (
              <div className="product-grid">
                {products.map((p) => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onSelect={(prod) => setSelectedProduct(prod)}
                    onOpenChat={(prod) => setChatProduct(prod)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rfq' && (
          <RfqView 
            currentPersona={currentPersona}
            onOpenChat={(prod) => setChatProduct(prod)}
            onOpenCreateRfq={() => setShowCreateRfq(true)}
            showToast={showToast}
          />
        )}

        {activeTab === 'freight' && (
          <FreightPoolView 
            currentPersona={currentPersona}
            onOpenCreatePool={() => setShowCreatePool(true)}
            showToast={showToast}
          />
        )}

        {activeTab === 'orders' && (
          <EscrowTimelineView 
            currentPersona={currentPersona}
            onOpenDispute={(ord) => setDisputeOrder(ord)}
            showToast={showToast}
          />
        )}

        {activeTab === 'admin' && (
          <AdminCenterView 
            currentPersona={currentPersona}
            showToast={showToast}
            onMaintenanceChange={(enabled, reason) => setMaintenance({ enabled, reason })}
          />
        )}
      </main>

      {/* Modals & Overlays */}
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)}
          onSuccess={(newOrd) => { setCartCount(c => c + 1); setActiveTab('orders'); }}
          onOpenChat={(prod) => setChatProduct(prod)}
          showToast={showToast}
        />
      )}

      {chatProduct && (
        <RfqChatModal 
          product={chatProduct} 
          currentPersona={currentPersona}
          onClose={() => setChatProduct(null)}
          showToast={showToast}
        />
      )}

      {showCreateProduct && (
        <CreateProductModal 
          onClose={() => setShowCreateProduct(false)}
          onSuccess={() => fetchProducts()}
          showToast={showToast}
        />
      )}

      {showCreateRfq && (
        <CreateRfqModal 
          onClose={() => setShowCreateRfq(false)}
          onSuccess={() => setActiveTab('rfq')}
          showToast={showToast}
        />
      )}

      {showCreatePool && (
        <CreatePoolModal 
          onClose={() => setShowCreatePool(false)}
          onSuccess={() => setActiveTab('freight')}
          showToast={showToast}
        />
      )}

      {disputeOrder && (
        <DisputeModal 
          order={disputeOrder} 
          onClose={() => setDisputeOrder(null)}
          onSuccess={() => setActiveTab('orders')}
          showToast={showToast}
        />
      )}
    </div>
  );
}
