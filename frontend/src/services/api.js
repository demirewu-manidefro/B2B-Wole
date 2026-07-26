// Client API Service for REST Communication with Express Backend
// Auth: JWT Bearer token stored in localStorage, sent on every authenticated request.

const API_BASE = '/api';
const TOKEN_KEY = 'b2bwole_token';
const USER_KEY  = 'b2bwole_user';

class ApiService {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY) || null;
    this.currentUserId = null; // resolved from token
  }

  // ── Token & Session Management ──────────────────────────────────────────────

  /** Save JWT + user object after login/register */
  saveSession(token, user) {
    this.token = token;
    this.currentUserId = user.id;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /** Clear session on sign-out */
  clearSession() {
    this.token = null;
    this.currentUserId = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /** Return cached user object (may be stale — verify with getMe if needed) */
  getCachedUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  /** True if a token exists in storage */
  hasSession() {
    return !!this.token;
  }

  // ── Header Builder ──────────────────────────────────────────────────────────

  getHeaders(customHeaders = {}) {
    const headers = { 'Content-Type': 'application/json', ...customHeaders };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    // Fallback x-user-id for routes that still rely on it (catalog reads, etc.)
    if (this.currentUserId) {
      headers['x-user-id'] = this.currentUserId;
    }
    return headers;
  }

  // ── Core Request ────────────────────────────────────────────────────────────

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

      // Token expired or revoked — clear session
      if (response.status === 401) {
        this.clearSession();
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

  // ── Auth Endpoints ──────────────────────────────────────────────────────────

  /** POST /api/auth/login — returns { user, token } */
  async loginUser(credentials) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.token && res.user) {
      this.saveSession(res.token, res.user);
    }
    return res;
  }

  /** POST /api/users — register new user, returns { user, token } */
  async registerUser(userData) {
    const res = await this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (res.token && res.user) {
      this.saveSession(res.token, res.user);
    }
    return res;
  }

  /** GET /api/auth/me — validate token & get fresh user profile */
  getMe() {
    return this.request('/auth/me');
  }

  // ── Catalog Endpoints ───────────────────────────────────────────────────────

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

  // ── Orders & Escrow ─────────────────────────────────────────────────────────

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

  // ── RFQ Negotiations ────────────────────────────────────────────────────────

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

  // ── Freight Pools ───────────────────────────────────────────────────────────

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

  // ── Admin & System ──────────────────────────────────────────────────────────

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

  getAdminStats() {
    return this.request('/admin/stats');
  }

  createCategory(categoryData) {
    return this.request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  getUsers() {
    return this.request('/users');
  }

  // Legacy — kept for compatibility
  setUserId(id) {
    this.currentUserId = id;
  }
}

export const api = new ApiService();
