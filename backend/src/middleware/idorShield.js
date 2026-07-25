/**
 * Section 5.3 Insecure Direct Object Reference (IDOR) Shielding
 * Prevents malicious platform actors from altering client parameters (e.g., /api/orders/101 -> 102)
 * to harvest competitor trade data, pricing configs, or buyer phone numbers.
 * 
 * Enforces token-extracted identity scoping: WHERE id = ? AND vendor_id = current_user_id
 */

/**
 * Validates that an entity record belongs to the authenticated user token perimeter.
 * Admins bypass this check.
 * 
 * @param {Object} entity - The record fetched from the database (e.g., order, product, rfq).
 * @param {Object} user - The authenticated user from req.user ({ id, role }).
 * @param {Array<string>} ownerFields - The property names that map to user ID (e.g., ['vendor_id', 'buyer_id', 'user_id']).
 * @returns {boolean} True if access is allowed, false if IDOR violation.
 */
function checkIdorScope(entity, user, ownerFields = ['vendor_id', 'buyer_id', 'user_id']) {
  if (!entity || !user) return false;

  // System Administrators have platform-wide arbitration access
  if (user.role === 'admin') return true;

  for (const field of ownerFields) {
    if (entity[field] !== undefined && entity[field] === user.id) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware factory that verifies IDOR ownership of a resource before continuing.
 * @param {Function} fetcher - Async function (req) => entity object from DB.
 * @param {Array<string>} ownerFields - Allowed owner ID column names on entity.
 */
function shieldIdor(fetcher, ownerFields = ['vendor_id', 'buyer_id', 'user_id']) {
  return async (req, res, next) => {
    try {
      const entity = await fetcher(req);
      if (!entity) {
        return res.status(404).json({ error: 'Not Found', message: 'Requested resource object does not exist.' });
      }

      const isAllowed = checkIdorScope(entity, req.user, ownerFields);
      if (!isAllowed) {
        console.warn(`🚨 [IDOR Violation Attempt] User ${req.user ? req.user.id : 'unknown'} attempted unauthorized access to resource ID ${entity.id}`);
        return res.status(403).json({
          error: 'Forbidden (IDOR Protection)',
          message: 'Security Shield: You cannot access data objects that fall outside your verified authentication token perimeter (WHERE id = ? AND vendor_id = current_user_id).'
        });
      }

      req.shieldedEntity = entity;
      next();
    } catch (err) {
      console.error('IDOR shield execution error:', err.message);
      return res.status(500).json({ error: 'Internal Server Error', message: 'IDOR perimeter validation failed.' });
    }
  };
}

module.exports = {
  checkIdorScope,
  shieldIdor
};
