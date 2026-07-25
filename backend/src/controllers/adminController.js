const db = require('../db');
const bcrypt = require('bcryptjs');

/**
 * Admin & System Controller
 * Handles global maintenance mode toggling (Section 5.5), audit logs viewing,
 * and general reference data (users, categories).
 */

/**
 * GET /api/admin/audit-logs
 * Fetches platform security and operational audit logs.
 */
async function getAuditLogs(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only System Administrators can inspect audit trails.' });
    }

    const { limit = 50, severity } = req.query;
    let queryText = `
      SELECT al.*, u.name as user_name, u.role as user_role, u.phone as user_phone
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (severity) {
      queryText += ` AND al.severity = $${paramIdx++}`;
      params.push(severity.toUpperCase());
    }

    queryText += ` ORDER BY al.created_at DESC LIMIT $${paramIdx++};`;
    params.push(parseInt(limit, 10));

    const result = await db.query(queryText, params);
    return res.json({ count: result.rows.length, logs: result.rows });
  } catch (err) {
    console.error('getAuditLogs error:', err.message);
    return res.status(500).json({ error: 'Database Query Error', message: err.message });
  }
}

/**
 * POST /api/admin/maintenance
 * Toggles global maintenance mode (Section 5.5).
 */
async function toggleMaintenance(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only System Administrators can toggle global maintenance mode.' });
    }

    const { maintenance_mode } = req.body;
    const isMaintenance = maintenance_mode === true || maintenance_mode === 'true';

    await db.query(`UPDATE system_settings SET maintenance_mode = $1 WHERE id = 1;`, [isMaintenance]);

    // Log to audit trails
    await db.query(
      `INSERT INTO audit_logs (user_id, event_type, severity, details) VALUES ($1, $2, $3, $4);`,
      [req.user.id, 'MAINTENANCE_TOGGLE', 'CRITICAL', `Global Maintenance Mode toggled to: ${isMaintenance.toString().toUpperCase()} by Admin ID ${req.user.id}.`]
    );

    console.log(`🛑 [Global Control] Maintenance Mode toggled to ${isMaintenance} by Admin ID ${req.user.id}`);

    return res.json({
      message: `Global Maintenance Mode is now ${isMaintenance ? 'ACTIVE (503 API freeze enforced for non-admins)' : 'DISABLED (Normal operations resumed)'}.`,
      maintenance_mode: isMaintenance
    });
  } catch (err) {
    console.error('toggleMaintenance error:', err.message);
    return res.status(500).json({ error: 'Settings Update Error', message: err.message });
  }
}

/**
 * GET /api/admin/settings
 * Returns global system settings.
 */
async function getSystemSettings(req, res) {
  try {
    const result = await db.query('SELECT * FROM system_settings WHERE id = 1;');
    return res.json({ settings: result.rows[0] || { app_version: '1.0.0', maintenance_mode: false } });
  } catch (err) {
    console.error('getSystemSettings error:', err.message);
    return res.status(500).json({ error: 'Database Query Error', message: err.message });
  }
}

/**
 * GET /api/users
 * Lists users for persona switcher and RFQ targeting in UI.
 */
async function getUsers(req, res) {
  try {
    const result = await db.query('SELECT id, name, phone, role, is_verified, created_at FROM users ORDER BY id ASC;');
    return res.json({ count: result.rows.length, users: result.rows });
  } catch (err) {
    console.error('getUsers error:', err.message);
    return res.status(500).json({ error: 'Database Query Error', message: err.message });
  }
}

/**
 * GET /api/categories
 * Lists hierarchical category tree.
 */
async function getCategories(req, res) {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY parent_id ASC NULLS FIRST, name ASC;');
    return res.json({ count: result.rows.length, categories: result.rows });
  } catch (err) {
    console.error('getCategories error:', err.message);
    return res.status(500).json({ error: 'Database Query Error', message: err.message });
  }
}

/**
 * POST /api/users
 * Allows anyone to open an account with name and phone number (Buyer or Vendor).
 */
async function createUser(req, res) {
  try {
    const { name, phone, role } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Invalid Payload', message: 'Name and phone number are required.' });
    }
    const userRole = role === 'vendor' ? 'vendor' : 'buyer';
    
    // Check if phone already exists
    const existing = await db.query('SELECT id, name, phone, role, is_verified FROM users WHERE phone = $1;', [phone]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Duplicate Phone', message: 'An account with this phone number already exists.', user: existing.rows[0] });
    }

    const passHash = await bcrypt.hash('default123', 10);
    const result = await db.query(
      `INSERT INTO users (name, phone, password_hash, role, is_verified) VALUES ($1, $2, $3, $4, true) RETURNING id, name, phone, role, is_verified, created_at;`,
      [name, phone, passHash, userRole]
    );

    const newUser = result.rows[0];
    await db.query(
      `INSERT INTO audit_logs (user_id, event_type, severity, details) VALUES ($1, $2, $3, $4);`,
      [newUser.id, 'USER_REGISTRATION', 'INFO', `New ${userRole.toUpperCase()} account opened by ${name} (${phone}).`]
    );

    return res.status(201).json({ message: 'Account opened successfully.', user: newUser });
  } catch (err) {
    console.error('createUser error:', err.message);
    return res.status(500).json({ error: 'Registration Error', message: err.message });
  }
}

/**
 * POST /api/admin/categories
 * Admin adds a new category domain.
 */
async function createCategory(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only System Administrators can create new categories.' });
    }
    const { name, parent_id, slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'Invalid Payload', message: 'Category name and slug are required.' });
    }
    const result = await db.query(
      `INSERT INTO categories (name, parent_id, slug) VALUES ($1, $2, $3) RETURNING *;`,
      [name, parent_id || null, slug]
    );
    return res.status(201).json({ message: 'Category added successfully.', category: result.rows[0] });
  } catch (err) {
    console.error('createCategory error:', err.message);
    return res.status(500).json({ error: 'Category Creation Error', message: err.message });
  }
}

/**
 * GET /api/admin/stats
 * Admin dashboard overview stats: entire market, payments, escrow volume, categories, and recent orders.
 */
async function getAdminDashboardStats(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only System Administrators can access central dashboard analytics.' });
    }

    const [usersRes, productsRes, ordersRes, escrowRes, recentOrdersRes] = await Promise.all([
      db.query(`SELECT role, COUNT(*) as count FROM users GROUP BY role;`),
      db.query(`SELECT status, COUNT(*) as count FROM products GROUP BY status;`),
      db.query(`SELECT status, COUNT(*) as count FROM orders GROUP BY status;`),
      db.query(`SELECT COALESCE(SUM(total_price), 0) as total_escrow_volume, COALESCE(SUM(commission_amount), 0) as total_fees FROM orders WHERE status NOT IN ('Refunded', 'Created');`),
      db.query(`
        SELECT o.id, o.total_price as total_amount, o.status, 
               CASE WHEN o.tx_ref LIKE 'CHAPA%' THEN 'Chapa 💳' WHEN o.tx_ref LIKE 'TELEBIRR%' THEN 'Telebirr 📱' ELSE 'Escrow Gateway 🏦' END as payment_method, 
               o.created_at,
               b.name as buyer_name, v.name as vendor_name, 
               COALESCE(o.items->0->>'title', 'Wholesale B2B Order') as product_title
        FROM orders o
        JOIN users b ON o.buyer_id = b.id
        JOIN users v ON o.vendor_id = v.id
        ORDER BY o.created_at DESC LIMIT 10;
      `)
    ]);

    const usersBreakdown = usersRes.rows.reduce((acc, r) => ({ ...acc, [r.role]: parseInt(r.count, 10) }), {});
    const totalUsers = Object.values(usersBreakdown).reduce((a, b) => a + b, 0);

    const productsBreakdown = productsRes.rows.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count, 10) }), {});
    const totalProducts = Object.values(productsBreakdown).reduce((a, b) => a + b, 0);

    const ordersBreakdown = ordersRes.rows.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count, 10) }), {});
    const totalOrders = Object.values(ordersBreakdown).reduce((a, b) => a + b, 0);

    return res.json({
      stats: {
        totalUsers,
        usersBreakdown,
        totalProducts,
        productsBreakdown,
        totalOrders,
        ordersBreakdown,
        escrowVolume: parseFloat(escrowRes.rows[0].total_escrow_volume),
        platformFees: parseFloat(escrowRes.rows[0].total_fees),
        recentOrders: recentOrdersRes.rows
      }
    });
  } catch (err) {
    console.error('getAdminDashboardStats error:', err.message);
    return res.status(500).json({ error: 'Analytics Error', message: err.message });
  }
}

/**
 * POST /api/auth/login
 * Authenticates user by phone number (and optional password check for demo flexibility).
 */
async function loginUser(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Invalid Payload', message: 'Phone number is required to login.' });
    }
    const result = await db.query('SELECT id, name, phone, role, is_verified, password_hash FROM users WHERE phone = $1;', [phone]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User Not Found', message: 'No account registered with this phone number. Please register as a new user.' });
    }
    const user = result.rows[0];
    
    // In demo mode, if password is provided, check with bcrypt, or allow demo bypass if typed 'password123', 'admin123', 'default123', or 'demo'
    if (password) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match && password !== 'password123' && password !== 'admin123' && password !== 'default123' && password !== 'demo') {
        return res.status(401).json({ error: 'Unauthorized', message: 'Incorrect password.' });
      }
    }

    await db.query(
      `INSERT INTO audit_logs (user_id, event_type, severity, details) VALUES ($1, $2, $3, $4);`,
      [user.id, 'USER_LOGIN', 'INFO', `User ${user.name} (${user.phone}) logged in successfully via AliExpress-style Sign in / Register Auth UI.`]
    );

    const { password_hash, ...safeUser } = user;
    return res.status(200).json({ message: 'Login successful!', user: safeUser });
  } catch (err) {
    console.error('loginUser error:', err.message);
    return res.status(500).json({ error: 'Login Error', message: err.message });
  }
}

module.exports = {
  getAuditLogs,
  toggleMaintenance,
  getSystemSettings,
  getUsers,
  getCategories,
  createUser,
  loginUser,
  createCategory,
  getAdminDashboardStats
};
