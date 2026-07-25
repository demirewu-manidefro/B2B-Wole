/**
 * Main Frontend State Controller & UI Renderer
 */
class AppController {
  constructor() {
    this.users = [];
    this.categories = [];
    this.products = [];
    this.orders = [];
    this.rfqs = [];
    this.pools = [];
    this.activeUser = null;
    this.activeTab = 'catalogView';
    this.currentModalProduct = null;
    this.currentChatRfq = null;
  }

  async init() {
    console.log('🚀 Initializing Ethiopian B2B Marketplace UI...');
    await this.loadReferenceData();
    this.setupEventListeners();
    this.setupSocketListeners();
    this.switchTab('catalogView');
    this.showToast('Welcome to the Ethiopian B2B Wholesale & Escrow Marketplace!', 'success');
  }

  async loadReferenceData() {
    try {
      const usersRes = await API.getUsers();
      this.users = usersRes.users || [];
      const catRes = await API.getCategories();
      this.categories = catRes.categories || [];

      // Populate persona selector
      const selector = document.getElementById('persona-select');
      if (selector && this.users.length > 0) {
        selector.innerHTML = this.users.map(u => `
          <option value="${u.id}" ${u.id === 1 ? 'selected' : ''}>
            ${u.name} (${u.role.toUpperCase()}${u.is_verified ? ' ⭐' : ''})
          </option>
        `).join('');
        this.setUser(1); // Default to Abebe Kebede
      }
    } catch (err) {
      console.error('Failed to load reference data:', err);
      this.showToast('Error connecting to backend server.', 'danger');
    }
  }

  setUser(userId) {
    const id = parseInt(userId, 10);
    this.activeUser = this.users.find(u => u.id === id) || this.users[0];
    API.setUserId(id);
    document.getElementById('active-role-badge').textContent = `${this.activeUser.role.toUpperCase()}`;
    document.getElementById('active-role-badge').className = `brand-badge role-${this.activeUser.role}`;

    // Show/hide admin tab
    const adminBtn = document.getElementById('tab-btn-admin');
    if (adminBtn) {
      adminBtn.style.display = this.activeUser.role === 'admin' ? 'flex' : 'none';
    }

    console.log(`👤 Active persona switched to: ${this.activeUser.name} (${this.activeUser.role})`);
    this.refreshCurrentView();
  }

  setupEventListeners() {
    // Persona Switcher
    const personaSelect = document.getElementById('persona-select');
    if (personaSelect) {
      personaSelect.addEventListener('change', (e) => this.setUser(e.target.value));
    }

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        this.switchTab(targetView);
      });
    });

    // Catalog Filter Buttons
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filterType = chip.getAttribute('data-type');
        const filterVal = chip.getAttribute('data-val');
        this.loadCatalog(filterType, filterVal);
      });
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    // Pricing Modal Sliders & Toggles
    const qtySlider = document.getElementById('modal-qty-slider');
    const sampleToggle = document.getElementById('modal-sample-toggle');
    if (qtySlider) {
      qtySlider.addEventListener('input', (e) => {
        document.getElementById('modal-qty-val').textContent = e.target.value;
        if (sampleToggle && sampleToggle.checked) sampleToggle.checked = false;
        this.updateModalPriceCalculation();
      });
    }
    if (sampleToggle) {
      sampleToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          qtySlider.value = 1;
          document.getElementById('modal-qty-val').textContent = '1 (Sample Unit)';
        } else {
          qtySlider.value = this.currentModalProduct ? this.currentModalProduct.moq : 10;
          document.getElementById('modal-qty-val').textContent = qtySlider.value;
        }
        this.updateModalPriceCalculation();
      });
    }

    // Checkout Submit
    const checkoutBtn = document.getElementById('btn-modal-checkout');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => this.executeCheckout());
    }

    // RFQ Submit
    const rfqBtn = document.getElementById('btn-modal-rfq-submit');
    if (rfqBtn) {
      rfqBtn.addEventListener('click', () => this.submitRfqProposal());
    }

    // Chat Send Message
    const chatForm = document.getElementById('chat-input-form');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input-text');
        if (input.value.trim() && this.currentChatRfq) {
          SOCKET.sendMessage(input.value.trim(), this.activeUser.id, this.activeUser.name, this.activeUser.role);
          input.value = '';
        }
      });
    }

    // Test Scrubber Shortcuts in Chat
    document.getElementById('btn-test-phone-scrub')?.addEventListener('click', () => {
      const input = document.getElementById('chat-input-text');
      input.value = 'Call me directly on my offline phone 0911223344 or +251911223344 to avoid platform fee!';
      chatForm.dispatchEvent(new Event('submit'));
    });
    document.getElementById('btn-test-bank-scrub')?.addEventListener('click', () => {
      const input = document.getElementById('chat-input-text');
      input.value = 'Transfer to my CBE bank account 1000123456789 or telebirr me!';
      chatForm.dispatchEvent(new Event('submit'));
    });

    // Create Freight Pool Modal
    document.getElementById('btn-open-create-pool')?.addEventListener('click', () => {
      document.getElementById('modal-create-pool').classList.add('active');
    });
    document.getElementById('form-create-pool')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitCreateFreightPool();
    });

    // Create Product Modal (Vendor)
    document.getElementById('btn-open-create-product')?.addEventListener('click', () => {
      document.getElementById('modal-create-product').classList.add('active');
    });
    document.getElementById('form-create-product')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitCreateProduct();
    });

    // Maintenance Toggle
    document.getElementById('toggle-maintenance-mode')?.addEventListener('change', async (e) => {
      try {
        const res = await API.toggleMaintenance(e.target.checked);
        this.showToast(res.message, e.target.checked ? 'warning' : 'success');
        this.loadAuditLogs();
      } catch (err) {
        this.showToast(err.message, 'danger');
        e.target.checked = !e.target.checked;
      }
    });

    // Dispute Resolution Modal Submit
    document.getElementById('form-resolve-dispute')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitDisputeResolution();
    });
  }

  setupSocketListeners() {
    window.addEventListener('socket_receive_message', (e) => {
      this.appendChatMessage(e.detail);
    });

    window.addEventListener('socket_system_notice', (e) => {
      this.appendChatSystemMessage(e.detail.message);
    });

    window.addEventListener('socket_security_alert', (e) => {
      const alert = e.detail;
      this.showToast(`🛡️ ${alert.title}: ${alert.message}`, 'warning');
    });

    window.addEventListener('socket_order_broadcast', (e) => {
      const data = e.detail;
      this.showToast(`🔔 Order ${data.tx_ref} transitioned to '${data.status}' by ${data.updated_by}.`, 'success');
      if (this.activeTab === 'escrowView') this.loadOrders();
    });

    window.addEventListener('platform_maintenance_active', (e) => {
      const overlay = document.getElementById('maintenance-overlay');
      if (overlay) overlay.classList.add('active');
    });
  }

  switchTab(viewId) {
    this.activeTab = viewId;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
    });
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === viewId);
    });

    // Show/hide vendor action buttons in catalog
    const vendorActionContainer = document.getElementById('vendor-catalog-actions');
    if (vendorActionContainer) {
      vendorActionContainer.style.display = (this.activeUser && (this.activeUser.role === 'vendor' || this.activeUser.role === 'admin')) ? 'flex' : 'none';
    }

    this.refreshCurrentView();
  }

  refreshCurrentView() {
    if (this.activeTab === 'catalogView') this.loadCatalog();
    else if (this.activeTab === 'rfqView') this.loadRfqs();
    else if (this.activeTab === 'freightView') this.loadFreightPools();
    else if (this.activeTab === 'escrowView') this.loadOrders();
    else if (this.activeTab === 'adminView') this.loadAdminCenter();
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="font-size: 1.2rem;">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '🚨'}</div>
      <div>
        <div style="font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--accent-gold);">${type}</div>
        <div style="font-size: 0.9rem;">${message}</div>
      </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  /* --- Catalog View --- */
  async loadCatalog(filterType = null, filterVal = null) {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">⏳ Loading global Ethiopian marketplace inventory...</div>';

    try {
      const params = {};
      if (filterType === 'category') params.category_slug = filterVal;
      else if (filterType === 'attr') {
        const [k, v] = filterVal.split(':');
        params.attr = JSON.stringify({ [k]: v });
      } else if (filterType === 'spec') {
        const [k, v] = filterVal.split(':');
        params.spec = JSON.stringify({ [k]: v === 'true' ? true : v });
      }

      const res = await API.getProducts(params);
      this.products = res.products || [];

      if (this.products.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No products match the selected JSONB containment filter (@>).</div>';
        return;
      }

      grid.innerHTML = this.products.map(p => {
        const firstVariant = (p.variants && p.variants.length > 0) ? p.variants[0] : null;
        const imgUrl = firstVariant?.image_url || 'https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=600&q=80';
        const totalStock = (p.variants || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
        const minPrice = p.wholesale_prices && p.wholesale_prices.length > 0 ? Math.min(...p.wholesale_prices.map(t => parseFloat(t.price))) : 0;
        const maxPrice = p.wholesale_prices && p.wholesale_prices.length > 0 ? Math.max(...p.wholesale_prices.map(t => parseFloat(t.price))) : 0;

        return `
          <div class="card">
            <div class="card-img-wrapper">
              <img src="${imgUrl}" alt="${p.title}" class="card-img" />
              <div class="card-badge">${p.category_name || 'B2B Wholesale'}</div>
              <div class="card-moq-badge">${p.moq === 1 ? '🏨 Rental / Nights' : `📦 MOQ: ${p.moq} Units`}</div>
            </div>
            <div class="card-body">
              <h3 class="card-title">${p.title}</h3>
              <p class="card-desc">${p.description || ''}</p>
              
              <div class="card-price-matrix">
                <div class="price-row"><span>Wholesale Range:</span> <span class="price-val">${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()} ETB</span></div>
                <div class="price-row"><span>Available Stock:</span> <span style="color: #fff; font-weight: 700;">${totalStock} Units</span></div>
                <div class="price-row"><span>Vendor:</span> <span style="color: var(--accent-gold);">${p.vendor_name} ${p.vendor_verified ? '⭐' : ''}</span></div>
              </div>

              <div class="card-actions">
                <button class="btn btn-primary w-full" onclick="APP.openPricingModal(${p.id})">
                  ⚡ Calculate / Order Sample
                </button>
                <button class="btn btn-secondary" onclick="APP.openRfqModal(${p.id})" title="Request for Quotation Negotiation">
                  💬 RFQ
                </button>
                ${(this.activeUser && (this.activeUser.role === 'admin' || this.activeUser.id === p.vendor_id)) ? `
                  <button class="btn btn-danger btn-sm" onclick="APP.deleteProduct(${p.id})" title="Delete Product & Clean Cloud Storage Blobs">🗑️</button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--accent-rose);">❌ Failed to load catalog: ${err.message}</div>`;
    }
  }

  async deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product? This will trigger Section 4 automated cloud storage deletion calls (supabase.storage.from().remove()) to purge orphaned video blobs!")) return;
    try {
      const res = await API.deleteProduct(id);
      this.showToast(res.message, 'success');
      this.loadCatalog();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  /* --- Pricing & Sample Order Modal --- */
  openPricingModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    this.currentModalProduct = product;

    document.getElementById('modal-title').textContent = product.title;
    document.getElementById('modal-vendor-name').textContent = `${product.vendor_name} ${product.vendor_verified ? '(Gold Supplier ⭐)' : ''}`;
    document.getElementById('modal-moq-val').textContent = product.moq === 1 ? '1 Night (Duration Based)' : `${product.moq} Units`;

    // Populate variant selector
    const varSelect = document.getElementById('modal-variant-select');
    varSelect.innerHTML = (product.variants || []).map(v => `
      <option value="${v.id}" data-stock="${v.stock_quantity}">
        SKU: ${v.sku} - ${Object.entries(v.attributes || {}).map(([key, val]) => `${key}: ${val}`).join(', ')} (${v.stock_quantity} in stock)
      </option>
    `).join('');

    // Populate wholesale tiers table
    const tiersBody = document.getElementById('modal-tiers-body');
    const isHospitality = product.moq === 1;
    tiersBody.innerHTML = (product.wholesale_prices || []).map(t => `
      <tr>
        <td>${t.min} - ${t.max !== undefined && t.max !== null ? t.max : '∞'} ${isHospitality ? 'Nights' : 'Units'}</td>
        <td style="color: var(--accent-emerald); font-weight: 700; font-family: var(--font-code);">${parseFloat(t.price).toLocaleString()} ETB / ${isHospitality ? 'Night' : 'Unit'}</td>
      </tr>
    `).join('');

    // Reset slider and toggle
    const slider = document.getElementById('modal-qty-slider');
    const sampleToggle = document.getElementById('modal-sample-toggle');
    slider.min = 1;
    slider.max = 200;
    slider.value = product.moq;
    document.getElementById('modal-qty-val').textContent = product.moq;
    if (sampleToggle) {
      sampleToggle.checked = false;
      sampleToggle.disabled = isHospitality; // No sample toggle needed for hospitality rentals
      document.getElementById('sample-toggle-container').style.display = isHospitality ? 'none' : 'flex';
    }

    this.updateModalPriceCalculation();
    document.getElementById('modal-pricing').classList.add('active');
  }

  updateModalPriceCalculation() {
    if (!this.currentModalProduct) return;
    const slider = document.getElementById('modal-qty-slider');
    const sampleToggle = document.getElementById('modal-sample-toggle');
    const isSample = sampleToggle && sampleToggle.checked;
    const quantity = isSample ? 1 : parseInt(slider.value, 10);

    const tiers = this.currentModalProduct.wholesale_prices || [];
    let unitPrice = 0;

    if (isSample && tiers.length > 0) {
      // Sample unit uses base tier price
      unitPrice = parseFloat(tiers[0].price);
    } else {
      // Resolve tier
      for (const t of tiers) {
        const min = parseInt(t.min, 10) || 0;
        const max = t.max !== undefined && t.max !== null ? parseInt(t.max, 10) : Infinity;
        if (quantity >= min && quantity <= max) {
          unitPrice = parseFloat(t.price);
          break;
        }
      }
      if (unitPrice === 0 && tiers.length > 0) {
        const sorted = [...tiers].sort((a, b) => (b.min || 0) - (a.min || 0));
        unitPrice = parseFloat(sorted[0].price);
      }
    }

    const total = parseFloat((quantity * unitPrice).toFixed(2));
    document.getElementById('calc-unit-price').textContent = `${unitPrice.toLocaleString()} ETB`;
    document.getElementById('calc-total-price').textContent = `${total.toLocaleString()} ETB`;
  }

  async executeCheckout() {
    if (!this.currentModalProduct) return;
    const varSelect = document.getElementById('modal-variant-select');
    const variantId = parseInt(varSelect.value, 10);
    const sampleToggle = document.getElementById('modal-sample-toggle');
    const isSample = sampleToggle && sampleToggle.checked;
    const quantity = isSample ? 1 : parseInt(document.getElementById('modal-qty-slider').value, 10);

    const addressInput = document.getElementById('modal-shipping-address');
    const address = addressInput ? addressInput.value.trim() : 'Addis Ababa Central Commercial Terminal';

    try {
      this.showToast('⏳ Acquiring database concurrency lock (SELECT FOR UPDATE)...', 'warning');
      const res = await API.checkout({
        vendor_id: this.currentModalProduct.vendor_id,
        items: [{ variant_id: variantId, quantity }],
        is_sample: isSample,
        shipping_address: address
      });

      this.showToast(`🎉 ${res.message} (tx_ref: ${res.order.tx_ref})`, 'success');
      this.closeAllModals();
      this.switchTab('escrowView');
    } catch (err) {
      this.showToast(`🚨 Checkout Failed: ${err.message}`, 'danger');
    }
  }

  /* --- RFQ & Negotiation Engine --- */
  openRfqModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    this.currentModalProduct = product;
    document.getElementById('rfq-product-title').textContent = product.title;
    document.getElementById('rfq-vendor-id').value = product.vendor_id;
    document.getElementById('rfq-product-id').value = product.id;
    document.getElementById('modal-rfq').classList.add('active');
  }

  async submitRfqProposal() {
    const vendorId = document.getElementById('rfq-vendor-id').value;
    const productId = document.getElementById('rfq-product-id').value;
    const targetQty = document.getElementById('rfq-target-qty').value;
    const propPrice = document.getElementById('rfq-proposed-price').value;
    const notes = document.getElementById('rfq-notes').value;

    try {
      const res = await API.createRfq({
        vendor_id: vendorId,
        product_id: productId,
        target_quantity: targetQty,
        proposed_unit_price: propPrice,
        notes
      });
      this.showToast(res.message, 'success');
      if (res.security_notice) this.showToast(`🛡️ ${res.security_notice}`, 'warning');
      this.closeAllModals();
      this.switchTab('rfqView');
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  async loadRfqs() {
    const container = document.getElementById('rfq-list-container');
    if (!container) return;
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">⏳ Loading RFQ negotiation ledger...</div>';

    try {
      const res = await API.getRfqs();
      this.rfqs = res.rfqs || [];
      if (this.rfqs.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);">No active RFQ negotiations found in your token perimeter.</div>';
        return;
      }

      container.innerHTML = this.rfqs.map(r => `
        <div class="card" style="margin-bottom: 1rem; padding: 1.5rem; flex-direction: row; justify-content: space-between; align-items: center;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <span class="brand-badge role-${r.status.toLowerCase()}">${r.status.toUpperCase()}</span>
              <h4 style="color: #fff; margin: 0;">${r.product_title}</h4>
            </div>
            <div style="font-size: 0.9rem; color: var(--text-muted);">
              Buyer: <strong style="color: #fff;">${r.buyer_name}</strong> | Vendor: <strong style="color: var(--accent-gold);">${r.vendor_name}</strong>
            </div>
            <div style="font-size: 0.9rem; margin-top: 0.5rem;">
              Target Qty: <strong style="color: #fff;">${r.target_quantity} Units</strong> | Proposed Rate: <strong style="color: var(--accent-emerald); font-family: var(--font-code);">${parseFloat(r.proposed_unit_price).toLocaleString()} ETB/unit</strong>
            </div>
            ${r.notes ? `<div style="font-size: 0.8rem; background: rgba(0,0,0,0.4); padding: 0.5rem; border-radius: 8px; margin-top: 0.5rem; color: var(--text-muted); white-space: pre-wrap;">${r.notes}</div>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; min-width: 200px;">
            <button class="btn btn-gold" onclick="APP.openChatRoom(${r.id}, '${r.product_title.replace(/'/g, "")}')">
              💬 Open Real-Time Chat
            </button>
            ${(this.activeUser && (this.activeUser.role === 'vendor' || this.activeUser.role === 'admin') && r.status === 'Pending') ? `
              <button class="btn btn-primary btn-sm" onclick="APP.approveRfq(${r.id}, ${r.proposed_unit_price})">
                ✅ Approve Custom Contract
              </button>
              <button class="btn btn-danger btn-sm" onclick="APP.rejectRfq(${r.id})">
                ❌ Reject Proposal
              </button>
            ` : ''}
            ${(r.status === 'Approved' && this.activeUser && this.activeUser.role === 'buyer') ? `
              <button class="btn btn-primary btn-sm" onclick="APP.checkoutRfqOverride(${r.id}, ${r.product_id}, ${r.vendor_id}, ${r.target_quantity}, ${r.proposed_unit_price})">
                ⚡ Checkout Custom Override
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--accent-rose);">❌ Error loading RFQs: ${err.message}</div>`;
    }
  }

  openChatRoom(rfqId, title) {
    this.currentChatRfq = rfqId;
    document.getElementById('chat-room-title').textContent = `Room #${rfqId} - ${title}`;
    document.getElementById('chat-messages-container').innerHTML = '';
    
    // Join room via Socket.io
    SOCKET.joinRoom(rfqId, this.activeUser.id, this.activeUser.name, this.activeUser.role);
    document.getElementById('modal-chat').classList.add('active');
  }

  appendChatMessage(msg) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    const isMine = msg.sender_id === this.activeUser.id;
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isMine ? 'mine' : 'other'}`;
    bubble.innerHTML = `
      <div class="message-sender">${msg.sender_name} (${msg.sender_role.toUpperCase()})</div>
      <div>${msg.text}</div>
      ${msg.original_had_violation ? `<div class="scrubbed-badge">⚠️ Security Scrubber Activated (${msg.violations.join(', ')})</div>` : ''}
      <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
    `;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  appendChatSystemMessage(text) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble system';
    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  async approveRfq(rfqId, price) {
    try {
      const res = await API.updateRfqStatus(rfqId, { status: 'Approved', vendor_counter_price: price });
      this.showToast(res.message, 'success');
      this.loadRfqs();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  async rejectRfq(rfqId) {
    try {
      const res = await API.updateRfqStatus(rfqId, { status: 'Rejected' });
      this.showToast(res.message, 'warning');
      this.loadRfqs();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  async checkoutRfqOverride(rfqId, productId, vendorId, qty, price) {
    const product = this.products.find(p => p.id === productId) || { title: 'Custom RFQ Order', moq: 1, variants: [{ id: 1, sku: 'CUSTOM-RFQ-SKU' }] };
    this.openPricingModal(productId);
    // Auto-fill override values
    document.getElementById('modal-qty-slider').value = qty;
    document.getElementById('modal-qty-val').textContent = `${qty} (RFQ Custom Override)`;
    document.getElementById('calc-unit-price').textContent = `${parseFloat(price).toLocaleString()} ETB (Contract Override)`;
    document.getElementById('calc-total-price').textContent = `${(qty * parseFloat(price)).toLocaleString()} ETB`;
  }

  /* --- Shared-Freight Consolidation Hub --- */
  async loadFreightPools() {
    const tbody = document.getElementById('freight-pools-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">⏳ Loading shared-freight consolidation routes...</td></tr>';

    try {
      const res = await API.getFreightPools();
      this.pools = res.pools || [];
      if (this.pools.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No active shared-freight consolidation pools open.</td></tr>';
        return;
      }

      tbody.innerHTML = this.pools.map(p => {
        const isMember = (p.participants || []).some(m => m.user_id === this.activeUser.id);
        const costPerUser = parseFloat((p.total_rental_rate / p.current_participants).toFixed(2));
        return `
          <tr>
            <td>
              <strong style="color: #fff;">${p.origin}</strong> ➔ <strong style="color: var(--accent-gold);">${p.destination}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Departure: ${p.departure_window}</div>
            </td>
            <td>${p.vehicle_type}</td>
            <td style="font-family: var(--font-code); color: #fff;">${parseFloat(p.total_rental_rate).toLocaleString()} ETB</td>
            <td>
              <span class="brand-badge ${p.status === 'Open' ? 'role-buyer' : 'role-admin'}">
                ${p.current_participants} / ${p.max_participants} (${p.status})
              </span>
            </td>
            <td style="font-family: var(--font-code); color: var(--accent-emerald); font-weight: 700;">
              ${costPerUser.toLocaleString()} ETB / user
            </td>
            <td>
              <div style="font-size: 0.8rem; color: var(--text-muted);">
                ${(p.participants || []).map(m => `${m.name.split(' ')[0]} (${parseFloat(m.cost_share).toLocaleString()} ETB)`).join(', ')}
              </div>
            </td>
            <td>
              ${isMember ? `
                <span style="color: var(--accent-emerald); font-weight: 700;">✅ Joined Pool</span>
              ` : (p.status === 'Open' ? `
                <button class="btn btn-primary btn-sm" onclick="APP.joinPool(${p.id})">
                  🚚 Join & Split Cost
                </button>
              ` : `<span style="color: var(--text-muted);">Full</span>`)}
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--accent-rose);">❌ Error loading pools: ${err.message}</td></tr>`;
    }
  }

  async joinPool(poolId) {
    try {
      const res = await API.joinFreightPool(poolId);
      this.showToast(res.message, 'success');
      this.loadFreightPools();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  async submitCreateFreightPool() {
    const origin = document.getElementById('pool-origin').value;
    const dest = document.getElementById('pool-dest').value;
    const windowVal = document.getElementById('pool-window').value;
    const vehicle = document.getElementById('pool-vehicle').value;
    const rate = document.getElementById('pool-rate').value;
    const maxP = document.getElementById('pool-max').value;

    try {
      const res = await API.createFreightPool({
        origin, destination: dest, departure_window: windowVal, vehicle_type: vehicle, total_rental_rate: rate, max_participants: maxP
      });
      this.showToast(res.message, 'success');
      this.closeAllModals();
      this.loadFreightPools();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  /* --- Vendor Product Creation --- */
  async submitCreateProduct() {
    const title = document.getElementById('prod-title').value;
    const catId = document.getElementById('prod-category').value;
    const desc = document.getElementById('prod-desc').value;
    const videoUrl = document.getElementById('prod-video-url').value || 'https://ebzsmbwwxayngkwwldqf.supabase.co/storage/v1/object/public/videos/habesha-promo-30s.mp4';
    const moq = parseInt(document.getElementById('prod-moq').value, 10) || 10;
    const sku = document.getElementById('prod-sku').value || `SKU-${Date.now()}`;
    const stock = parseInt(document.getElementById('prod-stock').value, 10) || 50;
    const price = parseFloat(document.getElementById('prod-price').value) || 1000;

    try {
      const res = await API.createProduct({
        category_id: parseInt(catId, 10) || 1,
        title,
        description: desc,
        video_url: videoUrl,
        moq,
        wholesale_prices: [{ min: moq, max: 100, price: price }],
        specifications: { origin: "Addis Ababa", warranty: "24 Months" },
        variants: [{ sku, stock_quantity: stock, attributes: { color: "Standard Gold", size: "32" } }]
      });
      this.showToast(res.message, 'success');
      this.closeAllModals();
      this.switchTab('catalogView');
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  /* --- Escrow Transaction Tracker --- */
  async loadOrders() {
    const container = document.getElementById('escrow-list-container');
    if (!container) return;
    container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);">⏳ Loading Escrow transaction ledger (IDOR protected)...</div>';

    try {
      const res = await API.getOrders();
      this.orders = res.orders || [];
      if (this.orders.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);">No transaction ledgers found for your authenticated token perimeter.</div>';
        return;
      }

      const validStates = ['Created', 'Paid', 'Shipped', 'Delivered', 'Released'];

      container.innerHTML = this.orders.map(o => {
        const isDisputed = o.status === 'Disputed' || o.status === 'Refunded';
        const currentIdx = validStates.indexOf(o.status);

        return `
          <div class="card" style="margin-bottom: 2rem; padding: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-glass); padding-bottom: 1rem; margin-bottom: 1.5rem;">
              <div>
                <span class="brand-badge ${o.is_sample ? 'role-admin' : 'role-buyer'}">${o.is_sample ? '🧪 Retail Sample Order' : '📦 Bulk Wholesale Trade'}</span>
                <h3 style="color: #fff; margin: 0.5rem 0 0;">Transaction Ref: <span style="font-family: var(--font-code); color: var(--accent-gold);">${o.tx_ref}</span></h3>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.8rem; color: var(--text-muted);">Total Capital Held in Escrow:</div>
                <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent-emerald); font-family: var(--font-code);">${parseFloat(o.total_price).toLocaleString()} ETB</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Platform Commission (2.5%): ${parseFloat(o.commission_amount).toLocaleString()} ETB</div>
              </div>
            </div>

            <!-- Visual State Machine Timeline -->
            <div class="escrow-timeline">
              ${validStates.map((st, idx) => {
                let stepClass = '';
                if (isDisputed && (st === 'Released' || idx > currentIdx)) {
                  stepClass = 'disputed';
                } else if (o.status === st) {
                  stepClass = 'active';
                } else if (currentIdx > idx || o.status === 'Released') {
                  stepClass = 'completed';
                }
                return `
                  <div class="timeline-step ${stepClass}">
                    <div class="step-circle">${idx + 1}</div>
                    <div class="step-label">${isDisputed && st === 'Released' ? o.status : st}</div>
                  </div>
                  ${idx < validStates.length - 1 ? `<div class="timeline-bar ${currentIdx > idx || o.status === 'Released' ? 'completed' : ''}"></div>` : ''}
                `;
              }).join('')}
            </div>

            ${o.dispute_details ? `
              <div style="background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.4); padding: 1rem; border-radius: 12px; margin: 1rem 0; color: #fff;">
                <strong style="color: var(--accent-rose);">🚨 Arbitration Dispute Raised:</strong>
                <p style="font-size: 0.9rem; margin-top: 0.25rem;">${o.dispute_details}</p>
              </div>
            ` : ''}

            <!-- Action Controls based on State and Persona -->
            <div style="background: rgba(10, 14, 23, 0.5); padding: 1rem 1.5rem; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
              <div>
                <span style="font-size: 0.85rem; color: var(--text-muted);">Buyer: <strong style="color: #fff;">${o.buyer_name}</strong> | Vendor: <strong style="color: #fff;">${o.vendor_name}</strong></span>
                ${o.tracking_number ? `<div style="font-size: 0.85rem; color: var(--text-muted);">Logistics Tracking: <strong style="color: var(--accent-gold);">${o.tracking_number}</strong> ${o.shipping_manifest_url ? `| <a href="${o.shipping_manifest_url}" target="_blank" style="color: var(--accent-blue);">View Manifest Asset</a>` : ''}</div>` : ''}
              </div>

              <div style="display: flex; gap: 0.5rem;">
                <!-- 1. Created State Actions -->
                ${o.status === 'Created' ? `
                  <button class="btn btn-primary btn-sm" onclick="APP.simulateWebhook('${o.tx_ref.includes('TELEBIRR') ? 'Telebirr' : 'Chapa'}', '${o.tx_ref}', 'success', ${o.total_price})">
                    💳 Simulate ${o.tx_ref.includes('TELEBIRR') ? 'Telebirr' : 'Chapa'} Webhook (Capture Capital)
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="APP.simulateWebhook('Chapa', '${o.tx_ref}', 'success', ${o.total_price})" title="Trigger duplicate webhook to verify Idempotency Shield returns 200 OK without double counting">
                    🛡️ Test Duplicate Webhook (Idempotency)
                  </button>
                ` : ''}

                <!-- 2. Paid State Actions (Vendor dispatches fulfillment) -->
                ${(o.status === 'Paid' && (this.activeUser.role === 'vendor' || this.activeUser.role === 'admin')) ? `
                  <button class="btn btn-gold btn-sm" onclick="APP.dispatchFulfillment(${o.id})">
                    🚚 Dispatch Fulfillment (Commit Tracking & Manifest)
                  </button>
                ` : ''}

                <!-- 3. Shipped State Actions (Logistics arrival / confirmation) -->
                ${o.status === 'Shipped' ? `
                  <button class="btn btn-secondary btn-sm" onclick="APP.updateStatus(${o.id}, 'Delivered')">
                    📍 Confirm Destination Terminal Arrival
                  </button>
                ` : ''}

                <!-- 4. Release Protocol (Buyer inspects & releases funds) -->
                ${((o.status === 'Shipped' || o.status === 'Delivered') && (this.activeUser.role === 'buyer' || this.activeUser.role === 'admin')) ? `
                  <button class="btn btn-primary btn-sm" onclick="APP.releaseEscrow(${o.id})">
                    🎉 Inspect & Activate Release Protocol (Disburse Funds)
                  </button>
                ` : ''}

                <!-- 5. Dispute Button (Any party during active transit) -->
                ${(['Paid', 'Shipped', 'Delivered'].includes(o.status)) ? `
                  <button class="btn btn-danger btn-sm" onclick="APP.openDisputeModal(${o.id}, '${o.tx_ref}')">
                    🚨 Raise Dispute / Halts Countdown
                  </button>
                ` : ''}

                <!-- 6. Admin Arbitration Panel -->
                ${(o.status === 'Disputed' && this.activeUser.role === 'admin') ? `
                  <button class="btn btn-gold btn-sm" onclick="APP.resolveDispute(${o.id}, 'RELEASE_TO_VENDOR')">
                    ⚖️ Arbitrate: Force Settlement to Vendor
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="APP.resolveDispute(${o.id}, 'REFUND_TO_BUYER')">
                    ⚖️ Arbitrate: Total Refund to Buyer
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `<div style="text-align: center; color: var(--accent-rose);">❌ Error loading orders: ${err.message}</div>`;
    }
  }

  async simulateWebhook(provider, txRef, status, amount) {
    try {
      this.showToast(`📡 Transmitting cryptographically signed ${provider} webhook for ${txRef}...`, 'warning');
      const res = await API.simulateWebhook(provider, txRef, status, amount);
      if (res.idempotent_replay) {
        this.showToast(`🛡️ IDEMPOTENT SHIELD ACTIVATED: ${res.message}`, 'warning');
      } else {
        this.showToast(`💰 ${res.message || 'Webhook verified! Escrow capital captured.'}`, 'success');
        this.loadOrders();
      }
    } catch (err) {
      this.showToast(`Webhook failure: ${err.message}`, 'danger');
    }
  }

  async dispatchFulfillment(orderId) {
    const tracking = prompt("Enter commercial transit tracking number (e.g., ISUZU-TRANSIT-8812):", `ETH-LOG-${Date.now().toString().slice(-4)}`);
    if (!tracking) return;
    const manifestUrl = `https://ebzsmbwwxayngkwwldqf.supabase.co/storage/v1/object/public/manifests/manifest-${tracking}.pdf`;
    try {
      const res = await API.updateOrderStatus(orderId, { status: 'Shipped', tracking_number: tracking, shipping_manifest_url: manifestUrl });
      this.showToast(res.message, 'success');
      SOCKET.emitEscrowChange(orderId, res.order.tx_ref, 'Shipped', this.activeUser.name);
      this.loadOrders();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  async updateStatus(orderId, newStatus) {
    try {
      const res = await API.updateOrderStatus(orderId, { status: newStatus });
      this.showToast(res.message, 'success');
      SOCKET.emitEscrowChange(orderId, res.order.tx_ref, newStatus, this.activeUser.name);
      this.loadOrders();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  async releaseEscrow(orderId) {
    if (!confirm("Are you sure you want to release the held Escrow capital? Platform algorithms will disburse funds to the vendor minus the 2.5% localized platform commission.")) return;
    try {
      const res = await API.updateOrderStatus(orderId, { status: 'Released' });
      this.showToast("🎉 Capital disbursed to vendor! Escrow lifecycle completed.", 'success');
      SOCKET.emitEscrowChange(orderId, res.order.tx_ref, 'Released', this.activeUser.name);
      this.loadOrders();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  openDisputeModal(orderId, txRef) {
    document.getElementById('dispute-order-id').value = orderId;
    document.getElementById('dispute-tx-ref').textContent = txRef;
    document.getElementById('modal-dispute').classList.add('active');
  }

  async submitDisputeResolution() {
    const orderId = document.getElementById('dispute-order-id').value;
    const details = document.getElementById('dispute-details-text').value;
    if (!details) return;

    try {
      const res = await API.updateOrderStatus(orderId, { status: 'Disputed', dispute_details: details });
      this.showToast("🚨 Dispute raised! Countdown halted and transaction state locked.", 'warning');
      this.closeAllModals();
      SOCKET.emitEscrowChange(orderId, res.order.tx_ref, 'Disputed', this.activeUser.name);
      this.loadOrders();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  async resolveDispute(orderId, decision) {
    const notes = prompt(`Enter arbitration resolution summary for decision [${decision}]:`, "Photographic evidence reviewed by Admin. Settlement authorized.");
    if (!notes) return;
    try {
      const res = await API.resolveArbitration(orderId, { resolution_decision: decision, admin_notes: notes });
      this.showToast(`⚖️ Arbitration executed: Order transitioned to '${res.order.status}'.`, 'success');
      SOCKET.emitEscrowChange(orderId, res.order.tx_ref, res.order.status, 'Platform Administrator');
      this.loadOrders();
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }

  /* --- Admin Command Center --- */
  async loadAdminCenter() {
    if (!this.activeUser || this.activeUser.role !== 'admin') {
      document.getElementById('admin-container').innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--accent-rose);">❌ Access Restricted: Section 5 IDOR & Role Guardrails block non-admin inspection.</div>';
      return;
    }
    this.loadAuditLogs();
    this.loadSystemSettingsUI();
  }

  async loadAuditLogs() {
    const tbody = document.getElementById('audit-logs-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">⏳ Loading platform audit trails...</td></tr>';

    try {
      const res = await API.getAuditLogs({ limit: 50 });
      const logs = res.logs || [];
      if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No security or operational events logged yet.</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td style="font-family: var(--font-code); font-size: 0.75rem; color: var(--text-muted);">${new Date(l.created_at).toLocaleString()}</td>
          <td><span class="brand-badge ${l.severity === 'CRITICAL' ? 'role-admin' : l.severity === 'WARNING' ? 'role-vendor' : 'role-buyer'}">${l.severity}</span></td>
          <td style="font-weight: 700; color: #fff;">${l.event_type}</td>
          <td>${l.user_name ? `${l.user_name} (${l.user_role})` : 'System / Anonymous'}</td>
          <td style="font-size: 0.85rem; color: var(--text-muted); max-width: 450px;">${l.details}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--accent-rose);">❌ Error loading logs: ${err.message}</td></tr>`;
    }
  }

  async loadSystemSettingsUI() {
    try {
      const res = await API.getSettings();
      const settings = res.settings;
      const toggle = document.getElementById('toggle-maintenance-mode');
      if (toggle) toggle.checked = settings.maintenance_mode;
      document.getElementById('admin-app-version').textContent = settings.app_version || '1.0.0';
    } catch (err) {
      console.error('Failed to load settings UI:', err);
    }
  }
}

const APP = new AppController();
window.APP = APP;
document.addEventListener('DOMContentLoaded', () => APP.init());
