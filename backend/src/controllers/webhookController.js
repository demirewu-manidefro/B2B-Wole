const crypto = require('crypto');
const db = require('../db');
require('dotenv').config();

const CHAPA_SECRET_HASH = process.env.CHAPA_SECRET_HASH || 'chapa_test_secret_key_12345';
const TELEBIRR_SECRET = process.env.TELEBIRR_SECRET || 'telebirr_test_secret_key_67890';

/**
 * Section 5.2 Idempotent Payment Webhooks
 * Handles payment verification from localized Ethiopian payment aggregators (Chapa / Telebirr).
 * Enforces cryptographic signature validation and strict tx_ref deduplication.
 */

/**
 * Verifies Chapa HMAC SHA256 webhook signature.
 */
function verifyChapaSignature(req) {
  const signature = req.headers['x-chapa-signature'] || req.headers['chapa-signature'];
  
  // In development/test mode, allow simulated sandbox pass if special bypass header exists
  if (req.headers['x-sandbox-webhook'] === 'true' && process.env.NODE_ENV !== 'production') {
    return true;
  }

  if (!signature) return false;

  try {
    const hash = crypto.createHmac('sha256', CHAPA_SECRET_HASH).update(JSON.stringify(req.body)).digest('hex');
    return hash === signature || signature === CHAPA_SECRET_HASH;
  } catch (err) {
    return false;
  }
}

/**
 * POST /api/webhooks/chapa
 * POST /api/webhooks/telebirr
 * Handler for payment webhook events.
 */
async function handlePaymentWebhook(req, res) {
  try {
    const provider = req.path.includes('telebirr') ? 'Telebirr' : 'Chapa';

    // 1. Cryptographic Signature Validation
    const isVerified = verifyChapaSignature(req);
    if (!isVerified) {
      console.warn(`🚨 [Webhook Security Alert] Unverified cryptographic signature on ${provider} endpoint from IP: ${req.ip}`);
      return res.status(401).json({ error: 'Unauthorized', message: 'Cryptographic webhook signature validation failed.' });
    }

    const { tx_ref, status, amount, currency } = req.body;

    if (!tx_ref) {
      return res.status(400).json({ error: 'Missing Parameter', message: 'Webhook payload must contain unique tx_ref string.' });
    }

    // 2. Section 5.2 Idempotency Enforcement & Database Ledger Check
    const orderRes = await db.query('SELECT * FROM orders WHERE tx_ref = $1;', [tx_ref]);
    if (orderRes.rows.length === 0) {
      console.warn(`⚠️ [Webhook Notice] Received ${provider} webhook for unrecognized tx_ref: ${tx_ref}`);
      // Return 200 OK to stop payment gateway from retrying indefinitely for orphaned tx_refs
      return res.status(200).json({ status: 'ignored', message: 'Transaction reference not found in Escrow ledger.' });
    }

    const order = orderRes.rows[0];

    // 3. Duplicate Webhook Drop-Out Mechanism
    // If order is already Paid, Shipped, Delivered, or Released, this is a duplicated network retry
    if (order.status !== 'Created') {
      console.log(`🛡️ [Idempotent Webhook Shield] Duplicate ${provider} webhook event intercepted for tx_ref: ${tx_ref}. Current state is '${order.status}'. Dropping out cleanly without multiplying balance records.`);
      // Return standard 200 OK handshake without modifying internal ledger records
      return res.status(200).json({
        status: 'success',
        idempotent_replay: true,
        message: `Idempotent handshake: Transaction ${tx_ref} is already registered in state '${order.status}'. Zero ledger multiplication enforced.`
      });
    }

    // 4. Validate Gateway Status
    if (status && (status.toLowerCase() === 'success' || status.toLowerCase() === 'paid')) {
      // Transition Escrow state to 'Paid' (Capital Intercepted and held in platform bank pool)
      await db.query(`UPDATE orders SET status = 'Paid' WHERE tx_ref = $1;`, [tx_ref]);

      const auditDetails = `${provider} payment webhook verified for tx_ref '${tx_ref}'. Amount: ${amount || order.total_price} ${currency || 'ETB'}. Escrow capital intercepted and secured in platform bank pool.`;
      await db.query(
        `INSERT INTO audit_logs (user_id, event_type, severity, details) VALUES ($1, $2, $3, $4);`,
        [order.buyer_id, 'PAYMENT_WEBHOOK_VERIFIED', 'INFO', auditDetails]
      );

      console.log(`💰 [Escrow Capital Capture] Order ID ${order.id} (${tx_ref}) transitioned to 'Paid' via ${provider} webhook.`);

      return res.status(200).json({
        status: 'success',
        message: `Escrow capital captured successfully for tx_ref ${tx_ref}. State updated to Paid.`
      });
    } else {
      console.log(`ℹ️ [Webhook Notice] ${provider} webhook reported non-success status '${status}' for tx_ref: ${tx_ref}`);
      return res.status(200).json({ status: 'acknowledged', message: `Webhook received with status: ${status}` });
    }
  } catch (err) {
    console.error('Webhook execution failure:', err.message);
    // Return 500 only on internal database failures so gateway retries
    return res.status(500).json({ error: 'Webhook Processing Error', message: err.message });
  }
}

module.exports = {
  handlePaymentWebhook,
  verifyChapaSignature
};
