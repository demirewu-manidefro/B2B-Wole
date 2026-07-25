/**
 * Client API Wrapper
 * Communicates with backend REST endpoints and injects active persona token headers.
 */
class ApiService {
  constructor() {
    this.baseUrl = '/api';
    this.userId = 1; // Default to Abebe Kebede (Buyer ID 1)
  }

  setUserId(id) {
    this.userId = parseInt(id, 10) || 1;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': this.userId.toString(),
      'x-app-version': '1.0.0',
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (response.status === 503 && data.maintenance_mode) {
        window.dispatchEvent(new CustomEvent('platform_maintenance_active', { detail: data }));
        throw new Error(data.message || 'Service Unavailable due to Global Maintenance.');
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Reference Data
  async getUsers() { return this.request('/users'); }
  async getCategories() { return this.request('/categories'); }
  async getSettings() { return this.request('/admin/settings'); }

  // Catalog & JSONB Querying (@>)
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products?${query}`);
  }
  async getProductById(id) { return this.request(`/products/${id}`); }
  async calculatePrice(payload) { return this.request('/products/calculate-price', { method: 'POST', body: JSON.stringify(payload) }); }
  async createProduct(payload) { return this.request('/products', { method: 'POST', body: JSON.stringify(payload) }); }
  async deleteProduct(id) { return this.request(`/products/${id}`, { method: 'DELETE' }); }

  // Escrow Lifecycle & Checkout
  async checkout(payload) { return this.request('/orders/checkout', { method: 'POST', body: JSON.stringify(payload) }); }
  async getOrders() { return this.request('/orders'); }
  async getOrderById(id) { return this.request(`/orders/${id}`); }
  async updateOrderStatus(id, payload) { return this.request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }); }
  async resolveArbitration(id, payload) { return this.request(`/orders/${id}/arbitration`, { method: 'POST', body: JSON.stringify(payload) }); }

  // Idempotent Payment Webhooks
  async simulateWebhook(provider, tx_ref, status = 'success', amount = 45000) {
    const endpoint = provider.toLowerCase() === 'telebirr' ? '/webhooks/telebirr' : '/webhooks/chapa';
    return this.request(endpoint, {
      method: 'POST',
      headers: { 'x-sandbox-webhook': 'true' },
      body: JSON.stringify({ tx_ref, status, amount, currency: 'ETB' })
    });
  }

  // RFQ & Negotiation Engine
  async createRfq(payload) { return this.request('/rfq', { method: 'POST', body: JSON.stringify(payload) }); }
  async getRfqs() { return this.request('/rfq'); }
  async updateRfqStatus(id, payload) { return this.request(`/rfq/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }); }

  // Shared-Freight Pooling
  async getFreightPools(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/freight/pools?${query}`);
  }
  async createFreightPool(payload) { return this.request('/freight/pools', { method: 'POST', body: JSON.stringify(payload) }); }
  async joinFreightPool(id) { return this.request(`/freight/pools/${id}/join`, { method: 'POST' }); }

  // Admin Control Center
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/audit-logs?${query}`);
  }
  async toggleMaintenance(maintenance_mode) { return this.request('/admin/maintenance', { method: 'POST', body: JSON.stringify({ maintenance_mode }) }); }
}

const API = new ApiService();
window.API = API;
