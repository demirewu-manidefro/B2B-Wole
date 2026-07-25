const db = require('../db');

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

module.exports = {
  getAuditLogs,
  toggleMaintenance,
  getSystemSettings,
  getUsers,
  getCategories
};
