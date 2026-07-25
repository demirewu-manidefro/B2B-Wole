const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_ethiopia_b2b_2026';

/**
 * Authentication & Role Authorization Middleware
 * Resolves user identity from Bearer token or fallback x-user-id header (for easy UI demo testing).
 */
async function authenticate(req, res, next) {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    const fallbackUserId = req.headers['x-user-id'] || req.query.user_id;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // If JWT fails, check fallback for demo simplicity
        if (!fallbackUserId) {
          return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired authentication token.' });
        }
      }
    }

    if (!userId && fallbackUserId) {
      userId = parseInt(fallbackUserId, 10);
    }

    if (!userId) {
      // Default to Buyer Abebe (ID 1) if no header passed in demo mode, or reject
      if (process.env.NODE_ENV === 'test' && !req.headers['x-strict-auth']) {
        userId = 1;
      } else {
        return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required. Provide Bearer token or x-user-id header.' });
      }
    }

    // Fetch user from DB
    const userResult = await db.query('SELECT id, name, phone, role, is_verified FROM users WHERE id = $1;', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User account not found in system ledger.' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Authentication service failure.' });
  }
}

/**
 * Role checking middleware factory
 * @param  {...string} allowedRoles - e.g. 'admin', 'vendor', 'buyer'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role(s): [${allowedRoles.join(', ')}]. Current role: '${req.user ? req.user.role : 'none'}'.`
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  JWT_SECRET
};
