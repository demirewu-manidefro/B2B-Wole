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
import AuthModal from './components/AuthModal';
import { api } from './services/api';
import { socketService } from './services/socket';
import { AlertCircle, CheckCircle, Info, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  // null = guest (not signed in), object = logged-in user
  const [currentPersona, setCurrentPersona] = useState(null);
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
  const [showAuth, setShowAuth] = useState(false); // false, 'signin', or 'register'

  // Maintenance & Security state
  const [maintenance, setMaintenance] = useState({ enabled: false, reason: '' });
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  // Called after successful sign-in or register
  const handleLoginSuccess = (newUser) => {
    const persona = {
      id: newUser.id,
      role: newUser.role,
      name: newUser.name,
      phone: newUser.phone,
    };
    setCurrentPersona(persona);
    api.setUserId(newUser.id);  // also sets currentUserId for x-user-id header fallback
    socketService.connect(newUser.id);
    showToast(`🎉 Welcome, ${newUser.name}! Signed in as ${newUser.role}.`, 'success');
  };

  // Sign out - go back to guest
  const handleSignOut = () => {
    api.clearSession();
    setCurrentPersona(null);
    setCartCount(0);
    setActiveTab('catalog');
    showToast('👋 Signed out successfully. See you again!', 'info');
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
      showToast(`⚡ JSONB Containment (@>) executed! Found ${data.products?.length || 0} matching SKUs.`, 'success');
    } catch (err) {
      showToast(`❌ JSONB Query Error: ${err.message}`, 'danger');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    // Restore session from localStorage JWT token (survives page refresh)
    if (api.hasSession()) {
      const cached = api.getCachedUser();
      if (cached) {
        // Optimistically show cached user, then verify with server
        setCurrentPersona(cached);
        api.setUserId(cached.id);
        socketService.connect(cached.id);
        // Verify token is still valid
        api.getMe()
          .then(res => {
            setCurrentPersona(res.user);
            api.setUserId(res.user.id);
          })
          .catch(() => {
            // Token expired/invalid — clear session
            api.clearSession();
            setCurrentPersona(null);
          });
      }
    }
    fetchProducts();
    api.getMaintenanceStatus().then(res => setMaintenance(res)).catch(() => {});
  }, []);

  // Guard: require sign-in for protected tabs
  const handleTabChange = (tab) => {
    const protectedTabs = ['rfq', 'freight', 'orders', 'admin'];
    if (protectedTabs.includes(tab) && !currentPersona) {
      setShowAuth('signin');
      showToast('🔑 Please sign in to access this feature.', 'warning');
      return;
    }
    setActiveTab(tab);
  };

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
      {maintenance.enabled && currentPersona?.role !== 'admin' && (
        <MaintenanceOverlay 
          reason={maintenance.reason} 
          onSwitchToAdmin={() => setShowAuth('signin')} 
        />
      )}

      {/* Navigation Header */}
      <Navbar 
        currentPersona={currentPersona} 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        onSearchJsonb={handleSearchJsonb}
        cartCount={cartCount}
        onOpenAdmin={() => handleTabChange('admin')}
        onOpenCreateProduct={() => {
          if (!currentPersona) { setShowAuth('signin'); return; }
          setShowCreateProduct(true);
        }}
        onOpenRegister={(tab = 'signin') => setShowAuth(tab)}
        onSignOut={handleSignOut}
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
                    onSelect={(prod) => {
                      if (!currentPersona) { setShowAuth('signin'); showToast('🔑 Sign in to view product details.', 'warning'); return; }
                      setSelectedProduct(prod);
                    }}
                    onOpenChat={(prod) => {
                      if (!currentPersona) { setShowAuth('signin'); showToast('🔑 Sign in to chat with suppliers.', 'warning'); return; }
                      setChatProduct(prod);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rfq' && currentPersona && (
          <RfqView 
            currentPersona={currentPersona}
            onOpenChat={(prod) => setChatProduct(prod)}
            onOpenCreateRfq={() => setShowCreateRfq(true)}
            showToast={showToast}
          />
        )}

        {activeTab === 'freight' && currentPersona && (
          <FreightPoolView 
            currentPersona={currentPersona}
            onOpenCreatePool={() => setShowCreatePool(true)}
            showToast={showToast}
          />
        )}

        {activeTab === 'orders' && currentPersona && (
          <EscrowTimelineView 
            currentPersona={currentPersona}
            onOpenDispute={(ord) => setDisputeOrder(ord)}
            showToast={showToast}
          />
        )}

        {activeTab === 'admin' && currentPersona && (
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

      {showAuth && (
        <AuthModal 
          initialTab={typeof showAuth === 'string' ? showAuth : 'signin'}
          onClose={() => setShowAuth(false)}
          onSuccess={handleLoginSuccess}
          showToast={showToast}
        />
      )}
    </div>
  );
}
