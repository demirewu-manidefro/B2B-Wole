const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_ethiopia_b2b_2026';

/**
 * Authentication & Role Authorization Middleware
 *
 * Priority order for resolving user identity:
 *  1. Authorization: Bearer <JWT>   — preferred (issued at login/register)
 *  2. x-user-id header              — legacy fallback for internal demo calls
 */
async function authenticate(req, res, next) {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    const fallbackUserId = req.headers['x-user-id'];

    // 1. Try JWT Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Token present but invalid/expired — hard reject, do NOT fall through
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication token is invalid or expired. Please sign in again.'
        });
      }
    }

    // 2. Fallback: x-user-id header (demo / internal tooling)
    if (!userId && fallbackUserId) {
      const parsed = parseInt(fallbackUserId, 10);
      if (!isNaN(parsed) && parsed > 0) {
        userId = parsed;
      }
    }

    // 3. No valid identity found — reject
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please sign in to access this feature.'
      });
    }

    // 4. Hydrate user from DB
    const userResult = await db.query(
      'SELECT id, name, phone, role, is_verified FROM users WHERE id = $1;',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account not found. It may have been removed.'
      });
    }

    req.user = userResult.rows[0];
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service failure.'
    });
  }
}

/**
 * Optional auth — populates req.user if a valid token/header is present,
 * but does NOT reject the request if no identity is found.
 * Used for routes that work for both guests and signed-in users.
 */
async function optionalAuthenticate(req, res, next) {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    const fallbackUserId = req.headers['x-user-id'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch {
        // Ignore invalid token for optional routes
      }
    }

    if (!userId && fallbackUserId) {
      const parsed = parseInt(fallbackUserId, 10);
      if (!isNaN(parsed) && parsed > 0) userId = parsed;
    }

    if (userId) {
      const userResult = await db.query(
        'SELECT id, name, phone, role, is_verified FROM users WHERE id = $1;',
        [userId]
      );
      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
      }
    }

    next();
  } catch (err) {
    // Never block on optional auth errors
    next();
  }
}

/**
 * Role checking middleware factory
 * @param  {...string} allowedRoles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role(s): [${allowedRoles.join(', ')}]. Your role: '${req.user ? req.user.role : 'guest'}'.`
      });
    }
    next();
  };
}

/**
 * Generates a signed JWT for a given user object.
 * @param {{ id: number, role: string, name: string }} user
 * @returns {string} signed JWT
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  generateToken,
  JWT_SECRET
};
