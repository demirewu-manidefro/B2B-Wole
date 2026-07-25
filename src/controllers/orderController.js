const db = require('../db');
const productController = require('./productController');

/**
 * Section 3 Escrow Lifecycle & Transaction State Machine
 * Section 5.1 Concurrency Lock Engine (Pessimistic Locking SELECT FOR UPDATE)
 * Section 2.3 Retail Sample Pipeline (MOQ Bypass)
 */

const VALID_STATES = ['Created', 'Paid', 'Shipped', 'Delivered', 'Released', 'Disputed', 'Refunded'];

/**
 * POST /api/orders/checkout
 * Executes a transaction-wrapped bulk or sample checkout with pessimistic locking.
 */
async function checkout(req, res) {
  try {
    const { vendor_id, items, is_sample, shipping_address, freight_pool_id, custom_unit_price, rfq_id } = req.body;
    const buyerId = req.user.id;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid Payload', message: 'Order must contain at least one inventory item.' });
    }

    if (parseInt(vendor_id, 10) === buyerId) {
      return res.status(400).json({ error: 'Self-Dealing Rejected', message: 'Buyers cannot purchase wholesale inventory from their own vendor account.' });
    }

    // Section 7: Wrap checkout in explicit database transaction
    const orderResult = await db.withTransaction(async (tx) => {
      let totalOrderPrice = 0;
      const processedItems = [];

      for (const item of items) {
        const variantId = parseInt(item.variant_id, 10);
        const quantity = parseInt(item.quantity, 10);

        if (!variantId || !quantity || quantity <= 0) {
          throw new Error(`Invalid quantity (${quantity}) or variant ID (${variantId}).`);
        }

        // 1. Section 5.1 Pessimistic Locking: SELECT ... FOR UPDATE
        // Locks the respective variant record until transaction completes its validation and subtraction routine
        const varRes = await tx.query(`
          SELECT pv.id, pv.sku, pv.stock_quantity, pv.product_id, p.title, p.moq, p.wholesale_prices, p.vendor_id
          FROM product_variants pv
          JOIN products p ON pv.product_id = p.id
          WHERE pv.id = $1
          FOR UPDATE;
        `, [variantId]);

        if (varRes.rows.length === 0) {
          throw new Error(`Product variant ID ${variantId} not found in inventory ledger.`);
        }

        const variant = varRes.rows[0];

        // Ensure variant belongs to target vendor
        if (variant.vendor_id !== parseInt(vendor_id, 10)) {
          throw new Error(`Variant SKU ${variant.sku} does not belong to Vendor ID ${vendor_id}.`);
        }

        // 2. Section 5.1 Stock Validation Check: Prevent negative integer race conditions
        if (variant.stock_quantity < quantity) {
          throw new Error(`INSUFFICIENT_STOCK: SKU '${variant.sku}' has only ${variant.stock_quantity} units available. Requested ${quantity} units. Concurrency lock prevented over-allocation.`);
        }

        // 3. Section 2.3 Retail Sample Pipeline: MOQ Validation & Bypass
        // Programmatically bypasses MOQ barrier exclusively when transaction intent flag is explicitly set to SAMPLE
        if (is_sample === true || is_sample === 'true') {
          console.log(`🧪 [Retail Sample Pipeline] MOQ barrier (${variant.moq}) programmatically bypassed for SKU ${variant.sku}. Order intent is explicitly set to SAMPLE.`);
          if (quantity > 3) {
            throw new Error(`Sample orders are limited to a maximum of 3 audit units per SKU.`);
          }
        } else {
          // Standard wholesale MOQ enforcement
          if (quantity < variant.moq) {
            throw new Error(`MOQ_VIOLATION: SKU '${variant.sku}' requires a Minimum Order Quantity of ${variant.moq} units for standard wholesale trade. To order a single audit unit, check the 'Retail Sample Order' toggle.`);
          }
        }

        // 4. Resolve unit price (either RFQ custom override or dynamic wholesale tier array)
        let unitPrice = 0;
        if (custom_unit_price && !isNaN(custom_unit_price) && rfq_id) {
          unitPrice = parseFloat(custom_unit_price);
        } else {
          unitPrice = productController.resolveTieredPrice(variant.wholesale_prices, quantity);
        }

        const lineTotal = parseFloat((quantity * unitPrice).toFixed(2));
        totalOrderPrice += lineTotal;

        // 5. Execute Subtraction Routine
        await tx.query(`
          UPDATE product_variants
          SET stock_quantity = stock_quantity - $1
          WHERE id = $2;
        `, [quantity, variantId]);

        processedItems.push({
          variant_id: variantId,
          sku: variant.sku,
          title: variant.title,
          quantity: quantity,
          unit_price: unitPrice,
          line_total: lineTotal
        });
      }

      // Calculate localized platform commission (2.5% standard B2B rate)
      const commissionAmount = parseFloat((totalOrderPrice * 0.025).toFixed(2));

      // Mint unique immutable gateway transaction reference (tx_ref)
      const gatewayPrefix = Math.random() > 0.5 ? 'CHAPA' : 'TELEBIRR';
      const txRef = `${gatewayPrefix}-TX-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

      // 6. Insert Order Record into Ledger (Status initialized to 'Created')
      const insertRes = await tx.query(`
        INSERT INTO orders (
          buyer_id, vendor_id, total_price, tx_ref, status, items, is_sample,
          shipping_address, commission_amount, freight_pool_id
        ) VALUES ($1, $2, $3, $4, 'Created', $5::jsonb, $6, $7, $8, $9)
        RETURNING *;
      `, [
        buyerId,
        parseInt(vendor_id, 10),
        parseFloat(totalOrderPrice.toFixed(2)),
        txRef,
        JSON.stringify(processedItems),
        is_sample === true || is_sample === 'true',
        shipping_address || 'Addis Ababa Central Terminal',
        commissionAmount,
        freight_pool_id ? parseInt(freight_pool_id, 10) : null
      ]);

      // If tied to an RFQ negotiation, update RFQ status to Completed
      if (rfq_id) {
        await tx.query(`UPDATE rfq_negotiations SET status = 'Completed' WHERE id = $1;`, [parseInt(rfq_id, 10)]);
      }

      return insertRes.rows[0];
    });

    return res.status(201).json({
      message: 'Checkout transaction committed successfully under pessimistic concurrency locking. Escrow ledger initialized in Created state.',
      order: orderResult
    });
  } catch (err) {
    console.error('Checkout transaction failure:', err.message);
    if (err.message.includes('INSUFFICIENT_STOCK') || err.message.includes('MOQ_VIOLATION') || err.message.includes('Sample orders')) {
      return res.status(409).json({ error: 'Trade Rules Violation', message: err.message });
    }
    return res.status(500).json({ error: 'Checkout Transaction Error', message: err.message });
  }
}

/**
 * GET /api/orders
 * Fetches orders scoped to the authenticated user token perimeter (Section 5.3 IDOR).
 */
async function getOrders(req, res) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let queryText = `
      SELECT o.*, b.name as buyer_name, b.phone as buyer_phone, v.name as vendor_name, v.phone as vendor_phone
      FROM orders o
      JOIN users b ON o.buyer_id = b.id
      JOIN users v ON o.vendor_id = v.id
    `;
    const params = [];

    // Section 5.3 IDOR Shielding: Users can only see orders within their token perimeter
    if (userRole === 'buyer') {
      queryText += ` WHERE o.buyer_id = $1`;
      params.push(userId);
    } else if (userRole === 'vendor') {
      queryText += ` WHERE o.vendor_id = $1`;
      params.push(userId);
    } else if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Unauthorized role.' });
    }

    queryText += ` ORDER BY o.created_at DESC;`;
    const result = await db.query(queryText, params);
    return res.json({ count: result.rows.length, orders: result.rows });
  } catch (err) {
    console.error('getOrders error:', err.message);
    return res.status(500).json({ error: 'Database Query Error', message: err.message });
  }
}

/**
 * GET /api/orders/:id
 * Fetches single order by ID with IDOR check.
 */
async function getOrderById(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const result = await db.query(`
      SELECT o.*, b.name as buyer_name, b.phone as buyer_phone, v.name as vendor_name, v.phone as vendor_phone
      FROM orders o
      JOIN users b ON o.buyer_id = b.id
      JOIN users v ON o.vendor_id = v.id
      WHERE o.id = $1;
    `, [orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });
    }

    const order = result.rows[0];
    // IDOR verification
    if (req.user.role !== 'admin' && order.buyer_id !== req.user.id && order.vendor_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden (IDOR Shield)', message: 'You cannot access orders outside your verified authentication token perimeter.' });
    }

    return res.json({ order });
  } catch (err) {
    console.error('getOrderById error:', err.message);
    return res.status(500).json({ error: 'Database Query Error', message: err.message });
  }
}

/**
 * PATCH /api/orders/:id/status
 * Enforces Section 3 Escrow Transaction State Machine jumps & Section 7 State Enforcement.
 */
async function updateOrderStatus(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status, tracking_number, shipping_manifest_url, dispute_details } = req.body;
    const user = req.user;

    if (!VALID_STATES.includes(status)) {
      return res.status(400).json({ error: 'Invalid State', message: `Status '${status}' is not in the valid Escrow array: [${VALID_STATES.join(', ')}]` });
    }

    const orderRes = await db.query('SELECT * FROM orders WHERE id = $1;', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });
    }

    const order = orderRes.rows[0];
    const currentState = order.status;

    // 1. Prevent redundant state updates
    if (currentState === status) {
      return res.status(400).json({ error: 'Redundant Transition', message: `Order is already in state '${status}'.` });
    }

    // 2. State Machine Enforcement
    if (status === 'Paid') {
      // Typically triggered via Chapa/Telebirr webhook, but allow admin or simulated gateway test
      if (currentState !== 'Created') {
        return res.status(400).json({ error: 'Invalid State Jump', message: `Cannot transition to 'Paid' from state '${currentState}'. Must be 'Created'.` });
      }
    } else if (status === 'Shipped') {
      // Fulfillment Dispatch: Vendor commits immutable shipping manifests/tracking numbers
      if (currentState !== 'Paid') {
        return res.status(400).json({ error: 'Invalid State Jump', message: `Cannot transition to 'Shipped' from state '${currentState}'. Escrow capital must be in 'Paid' state first.` });
      }
      if (user.role !== 'vendor' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden', message: 'Only the vendor can dispatch fulfillment and transition to Shipped state.' });
      }
      if (user.role === 'vendor' && user.id !== order.vendor_id) {
        return res.status(403).json({ error: 'Forbidden (IDOR)', message: 'You are not the vendor assigned to this order.' });
      }
      if (!tracking_number && !order.tracking_number) {
        return res.status(400).json({ error: 'Fulfillment Requirement', message: 'Fulfillment Dispatch requires committing an immutable tracking number or shipping manifest URL.' });
      }
    } else if (status === 'Delivered') {
      // Destination Arrival
      if (currentState !== 'Shipped') {
        return res.status(400).json({ error: 'Invalid State Jump', message: `Cannot transition to 'Delivered' from state '${currentState}'. Order must be 'Shipped' first.` });
      }
    } else if (status === 'Released') {
      // Section 7 Escrow State Enforcement:
      // Any endpoint updating status to Released must explicitly check that current state evaluates exactly to Shipped or Delivered,
      // while confirming authenticated session identity strictly matches buyer_id!
      if (currentState !== 'Shipped' && currentState !== 'Delivered') {
        return res.status(400).json({ error: 'Invalid State Jump (Section 7 Guardrail)', message: `Cannot release escrow funds from state '${currentState}'. Order must evaluate exactly to Shipped or Delivered.` });
      }
      if (user.role !== 'admin' && user.id !== order.buyer_id) {
        return res.status(403).json({ error: 'Forbidden (Section 7 Guardrail)', message: 'Escrow capital release must be explicitly activated by the authenticated buyer assigned to this transaction (buyer_id match required).' });
      }
    } else if (status === 'Disputed') {
      // Arbitration Protocol: Halts countdown if defects reported
      if (currentState !== 'Paid' && currentState !== 'Shipped' && currentState !== 'Delivered') {
        return res.status(400).json({ error: 'Invalid State Jump', message: `Cannot raise dispute from state '${currentState}'.` });
      }
      if (user.role !== 'buyer' && user.role !== 'admin' && user.role !== 'vendor') {
        return res.status(403).json({ error: 'Forbidden', message: 'Only transaction parties can raise an arbitration dispute.' });
      }
      if (!dispute_details) {
        return res.status(400).json({ error: 'Dispute Requirement', message: 'Raising a dispute requires providing detailed text logs or evidence descriptions.' });
      }
    }

    // 3. Commit state update to DB
    const updateParams = [status, orderId];
    let sql = `UPDATE orders SET status = $1`;
    let paramIdx = 3;

    if (tracking_number) {
      sql += `, tracking_number = $${paramIdx++}`;
      updateParams.push(tracking_number);
    }
    if (shipping_manifest_url) {
      sql += `, shipping_manifest_url = $${paramIdx++}`;
      updateParams.push(shipping_manifest_url);
    }
    if (dispute_details) {
      sql += `, dispute_details = $${paramIdx++}`;
      updateParams.push(dispute_details);
    }

    sql += ` WHERE id = $2 RETURNING *;`;

    const updatedRes = await db.query(sql, updateParams);
    const updatedOrder = updatedRes.rows[0];

    // Log state change to audit trails
    await db.query(
      `INSERT INTO audit_logs (user_id, event_type, severity, details) VALUES ($1, $2, $3, $4);`,
      [user.id, 'ESCROW_STATE_TRANSITION', status === 'Disputed' ? 'WARNING' : 'INFO', `Order ID ${orderId} (tx_ref: ${order.tx_ref}) transitioned from '${currentState}' ➔ '${status}'.`]
    );

    return res.json({
      message: `Escrow transaction state successfully transitioned from '${currentState}' ➔ '${status}'.`,
      order: updatedOrder
    });
  } catch (err) {
    console.error('updateOrderStatus error:', err.message);
    return res.status(500).json({ error: 'State Transition Error', message: err.message });
  }
}

/**
 * POST /api/orders/:id/arbitration
 * Section 3 Arbitration Protocol: Admin intervention to execute manual total refund to buyer or forced settlement to vendor.
 */
async function resolveArbitration(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only System Administrators can execute dispute arbitration settlements.' });
    }

    const orderId = parseInt(req.params.id, 10);
    const { resolution_decision, admin_notes } = req.body; // 'RELEASE_TO_VENDOR' or 'REFUND_TO_BUYER'

    const orderRes = await db.query('SELECT * FROM orders WHERE id = $1;', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });
    }

    const order = orderRes.rows[0];
    if (order.status !== 'Disputed') {
      return res.status(400).json({ error: 'Invalid State', message: 'Arbitration can only be executed on orders currently in the Disputed state.' });
    }

    let targetState = 'Released';
    if (resolution_decision === 'REFUND_TO_BUYER') {
      targetState = 'Refunded';
    }

    const fullNotes = `[Admin Arbitration Resolution: ${resolution_decision}] - ${admin_notes || 'Resolved by platform administrator.'}`;

    const updatedRes = await db.query(
      `UPDATE orders SET status = $1, dispute_details = $2 WHERE id = $3 RETURNING *;`,
      [targetState, fullNotes, orderId]
    );

    await db.query(
      `INSERT INTO audit_logs (user_id, event_type, severity, details) VALUES ($1, $2, $3, $4);`,
      [req.user.id, 'ADMIN_ARBITRATION_EXECUTION', 'CRITICAL', `Admin resolved dispute on Order ID ${orderId}. Decision: ${resolution_decision} (${targetState}).`]
    );

    return res.json({
      message: `Arbitration protocol finalized. Order ID ${orderId} transitioned to '${targetState}'.`,
      order: updatedRes.rows[0]
    });
  } catch (err) {
    console.error('resolveArbitration error:', err.message);
    return res.status(500).json({ error: 'Arbitration Failure', message: err.message });
  }
}

module.exports = {
  checkout,
  getOrders,
  getOrderById,
  updateOrderStatus,
  resolveArbitration,
  VALID_STATES
};
