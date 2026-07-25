const db = require('../db');
const scrubber = require('../utils/scrubber');

/**
 * Section 2.2 Request for Quotation (RFQ) & Negotiation Engine
 * Enables buyers to bypass standard wholesale tiers for large batches or custom contracts.
 * Finalized RFQ contracts override default pricing arrays during checkout sessions.
 */

/**
 * POST /api/rfq
 * Buyer initializes an RFQ state machine.
 */
async function createRfq(req, res) {
  try {
    if (req.user.role !== 'buyer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only registered buyers can initialize an RFQ negotiation.' });
    }

    const { vendor_id, product_id, target_quantity, proposed_unit_price, notes } = req.body;
    const buyerId = req.user.id;

    if (!vendor_id || !product_id || !target_quantity || !proposed_unit_price) {
      return res.status(400).json({ error: 'Missing Parameters', message: 'RFQ requires vendor_id, product_id, target_quantity, and proposed_unit_price.' });
    }

    // Section 5.4: Scrub notes for offline phone/bank negotiation attempts
    const scrubbed = await scrubber.scrubAndAudit(notes || '', buyerId, 'RFQ_INITIATION_NOTE');

    const insertRes = await db.query(`
      INSERT INTO rfq_negotiations (buyer_id, vendor_id, product_id, target_quantity, proposed_unit_price, status, notes)
      VALUES ($1, $2, $3, $4, $5, 'Pending', $6)
      RETURNING *;
    `, [buyerId, parseInt(vendor_id, 10), parseInt(product_id, 10), parseInt(target_quantity, 10), parseFloat(proposed_unit_price), scrubbed.scrubbedText]);

    return res.status(201).json({
      message: 'RFQ state machine initialized. Proposal sent to vendor for review.',
      rfq: insertRes.rows[0],
      security_notice: scrubbed.hasViolation ? 'Your note contained restricted contact details which were scrubbed to protect escrow integrity.' : null
    });
  } catch (err) {
    console.error('createRfq error:', err.message);
    return res.status(500).json({ error: 'RFQ Initialization Error', message: err.message });
  }
}

/**
 * GET /api/rfq
 * Fetches RFQs scoped to authenticated user token perimeter (Section 5.3 IDOR).
 */
async function getRfqs(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let queryText = `
      SELECT r.*, p.title as product_title, p.moq as product_moq, b.name as buyer_name, v.name as vendor_name
      FROM rfq_negotiations r
      JOIN products p ON r.product_id = p.id
      JOIN users b ON r.buyer_id = b.id
      JOIN users v ON r.vendor_id = v.id
    `;
    const params = [];

    if (userRole === 'buyer') {
      queryText += ` WHERE r.buyer_id = $1`;
      params.push(userId);
    } else if (userRole === 'vendor') {
      queryText += ` WHERE r.vendor_id = $1`;
      params.push(userId);
    } else if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized role.' });
    }

    queryText += ` ORDER BY r.created_at DESC;`;
    const result = await db.query(queryText, params);
    return res.json({ count: result.rows.length, rfqs: result.rows });
  } catch (err) {
    console.error('getRfqs error:', err.message);
    return res.status(500).json({ error: 'Database Query Error', message: err.message });
  }
}

/**
 * PATCH /api/rfq/:id/status
 * Vendor finalizes/approves an RFQ, creating a custom trade contract override for checkout.
 */
async function updateRfqStatus(req, res) {
  try {
    const rfqId = parseInt(req.params.id, 10);
    const { status, vendor_counter_price, notes } = req.body; // 'Approved', 'Rejected'

    if (!['Approved', 'Rejected', 'Completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid Status', message: 'RFQ status must be Approved, Rejected, or Completed.' });
    }

    const rfqRes = await db.query('SELECT * FROM rfq_negotiations WHERE id = $1;', [rfqId]);
    if (rfqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'RFQ record not found.' });
    }

    const rfq = rfqRes.rows[0];
    if (req.user.role !== 'admin' && req.user.id !== rfq.vendor_id) {
      return res.status(403).json({ error: 'Forbidden (IDOR)', message: 'Only the designated vendor can approve or reject this RFQ quotation.' });
    }

    let unitPrice = rfq.proposed_unit_price;
    if (vendor_counter_price && !isNaN(vendor_counter_price)) {
      unitPrice = parseFloat(vendor_counter_price);
    }

    let updatedNotes = rfq.notes || '';
    if (notes) {
      const scrubbed = await scrubber.scrubAndAudit(notes, req.user.id, 'RFQ_COUNTER_NOTE');
      updatedNotes += `\n[Vendor Note (${status})]: ${scrubbed.scrubbedText}`;
    }

    const updatedRes = await db.query(`
      UPDATE rfq_negotiations
      SET status = $1, proposed_unit_price = $2, notes = $3
      WHERE id = $4
      RETURNING *;
    `, [status, unitPrice, updatedNotes, rfqId]);

    const updatedRfq = updatedRes.rows[0];

    // Log to audit trails
    if (status === 'Approved') {
      await db.query(
        `INSERT INTO audit_logs (user_id, event_type, severity, details) VALUES ($1, $2, $3, $4);`,
        [req.user.id, 'RFQ_CONTRACT_FINALIZED', 'INFO', `Vendor ID ${req.user.id} finalized RFQ ID ${rfqId}. Custom contract override established at ${unitPrice} ETB/unit for ${rfq.target_quantity} units.`]
      );
    }

    return res.json({
      message: `RFQ negotiation ${status.toLowerCase()} successfully. ${status === 'Approved' ? 'Custom trade contract manifest active for checkout override.' : ''}`,
      rfq: updatedRfq
    });
  } catch (err) {
    console.error('updateRfqStatus error:', err.message);
    return res.status(500).json({ error: 'RFQ Update Error', message: err.message });
  }
}

module.exports = {
  createRfq,
  getRfqs,
  updateRfqStatus
};
