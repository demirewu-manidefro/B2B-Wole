// Client API Service for REST Communication with Express Backend (Section 1-7)

const API_BASE = '/api';

class ApiService {
  constructor() {
    this.currentUserId = 1; // Default: Abebe Kebede (Buyer)
  }

  setUserId(id) {
    this.currentUserId = id;
    console.log(`[Persona Switched] Active User ID set to ${id}`);
  }

  getHeaders(customHeaders = {}) {
    return {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUserId,
      ...customHeaders,
    };
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: this.getHeaders(options.headers),
      });

      if (response.status === 503) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(errorData.message || '503 Service Unavailable - Emergency API Freeze Active');
        err.status = 503;
        err.data = errorData;
        throw err;
      }

      const data = await response.json();
      if (!response.ok) {
        const err = new Error(data.error || data.message || `HTTP ${response.status}`);
        err.status = response.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error.message);
      throw error;
    }
  }

  // --- Catalog Endpoints ---
  getProducts(category = null) {
    const query = category ? `?category_slug=${encodeURIComponent(category)}` : '';
    return this.request(`/products${query}`);
  }

  queryJsonbContainment(attributesJson) {
    return this.request(`/products?attr=${encodeURIComponent(JSON.stringify(attributesJson))}`);
  }

  createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  // --- Orders & Escrow Endpoints (Section 3 & 5.1) ---
  getOrders() {
    return this.request('/orders');
  }

  createOrder(orderData) {
    return this.request('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  updateOrderStatus(orderId, status) {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // --- RFQ Negotiations (Section 2.2) ---
  getRfqNegotiations() {
    return this.request('/rfq');
  }

  createRfq(rfqData) {
    return this.request('/rfq', {
      method: 'POST',
      body: JSON.stringify(rfqData),
    });
  }

  updateRfqStatus(id, status, targetPrice = null) {
    return this.request(`/rfq/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, target_price: targetPrice }),
    });
  }

  // --- Freight Consolidation Pools (Section 2.4) ---
  getFreightPools() {
    return this.request('/freight/pools');
  }

  createFreightPool(poolData) {
    return this.request('/freight/pools', {
      method: 'POST',
      body: JSON.stringify(poolData),
    });
  }

  joinFreightPool(poolId, volumeCbm, weightKg) {
    return this.request(`/freight/pools/${poolId}/join`, {
      method: 'POST',
      body: JSON.stringify({ volume_cbm: volumeCbm, weight_kg: weightKg }),
    });
  }

  // --- Security & Webhooks (Section 5.2, 5.5) ---
  simulateWebhook(webhookData) {
    return fetch(`${API_BASE}/webhooks/chapa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-chapa-signature': 'simulated-hmac-sha256-signature',
      },
      body: JSON.stringify(webhookData),
    }).then(res => res.json());
  }

  getAuditLogs() {
    return this.request('/admin/audit-logs');
  }

  getMaintenanceStatus() {
    return this.request('/admin/settings').then(res => ({
      enabled: res.settings?.maintenance_mode || false,
      reason: res.settings?.maintenance_mode ? '503 API Freeze Active' : ''
    }));
  }

  toggleMaintenance(enabled, reason) {
    return this.request('/admin/maintenance', {
      method: 'POST',
      body: JSON.stringify({ maintenance_mode: enabled, reason }),
    }).then(res => ({
      enabled: res.maintenance_mode || false,
      reason: res.maintenance_mode ? reason || '503 API Freeze Active' : ''
    }));
  }

  registerUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  loginUser(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  getAdminStats() {
    return this.request('/admin/stats');
  }

  createCategory(categoryData) {
    return this.request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }
}

export const api = new ApiService();
