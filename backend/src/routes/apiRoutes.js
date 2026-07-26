const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const webhookController = require('../controllers/webhookController');
const rfqController = require('../controllers/rfqController');
const freightController = require('../controllers/freightController');
const adminController = require('../controllers/adminController');

// --- Auth Routes ---
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.post('/auth/login', adminController.loginUser);
router.get('/auth/me', auth.authenticate, adminController.getMe);
router.get('/categories', adminController.getCategories);
router.get('/admin/settings', adminController.getSystemSettings);
router.get('/admin/stats', auth.authenticate, auth.requireRole('admin'), adminController.getAdminDashboardStats);
router.post('/admin/categories', auth.authenticate, auth.requireRole('admin'), adminController.createCategory);

// --- Section 6 & 7: Product Catalog & JSONB Querying (@>) ---
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products/calculate-price', productController.calculatePrice);
router.post('/products', auth.authenticate, productController.createProduct);
router.delete('/products/:id', auth.authenticate, productController.deleteProduct);

// --- Section 3 & 5.1 & 7: Escrow Lifecycle & Concurrency Locked Checkout ---
router.post('/orders/checkout', auth.authenticate, orderController.checkout);
router.get('/orders', auth.authenticate, orderController.getOrders);
router.get('/orders/:id', auth.authenticate, orderController.getOrderById);
router.patch('/orders/:id/status', auth.authenticate, orderController.updateOrderStatus);
router.post('/orders/:id/arbitration', auth.authenticate, auth.requireRole('admin'), orderController.resolveArbitration);

// --- Section 5.2: Idempotent Payment Webhooks ---
router.post('/webhooks/chapa', webhookController.handlePaymentWebhook);
router.post('/webhooks/telebirr', webhookController.handlePaymentWebhook);

// --- Section 2.2: Request for Quotation (RFQ) Negotiation ---
router.post('/rfq', auth.authenticate, rfqController.createRfq);
router.get('/rfq', auth.authenticate, rfqController.getRfqs);
router.patch('/rfq/:id/status', auth.authenticate, rfqController.updateRfqStatus);

// --- Section 2.4: Shared-Freight Pooling ---
router.get('/freight/pools', freightController.getFreightPools);
router.post('/freight/pools', auth.authenticate, freightController.createFreightPool);
router.post('/freight/pools/:id/join', auth.authenticate, freightController.joinFreightPool);

// --- Section 5.5 & Audit Trails: Admin Control Center ---
router.get('/admin/audit-logs', auth.authenticate, auth.requireRole('admin'), adminController.getAuditLogs);
router.post('/admin/maintenance', auth.authenticate, auth.requireRole('admin'), adminController.toggleMaintenance);

module.exports = router;
