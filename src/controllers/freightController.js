const db = require('../db');

/**
 * Section 2.4 Logistics & Shared-Freight Pooling (Consolidation)
 * Aggregates destination metadata. If multiple disparate buyers match geographical delivery
 * footprints within a shared temporal window, exposes cost-pooling logic so micro-retailers
 * can split commercial vehicle rental rates.
 */

/**
 * GET /api/freight/pools
 * Lists open and active shared-freight consolidation pools.
 */
async function getFreightPools(req, res) {
  try {
    const { origin, destination, status } = req.query;
    let queryText = `
      SELECT fp.*,
             (SELECT json_agg(json_build_object('user_id', u.id, 'name', u.name, 'phone', u.phone, 'cost_share', fpm.cost_share))
              FROM freight_pool_members fpm
              JOIN users u ON fpm.user_id = u.id
              WHERE fpm.pool_id = fp.id) as participants
      FROM freight_pools fp
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (origin) {
      queryText += ` AND fp.origin ILIKE $${paramIdx++}`;
      params.push(`%${origin}%`);
    }
    if (destination) {
      queryText += ` AND fp.destination ILIKE $${paramIdx++}`;
      params.push(`%${destination}%`);
    }
    if (status) {
      queryText += ` AND fp.status = $${paramIdx++}`;
      params.push(status);
    } else {
      queryText += ` AND fp.status = 'Open'`;
    }

    queryText += ` ORDER BY fp.created_at DESC;`;
    const result = await db.query(queryText, params);

    return res.json({ count: result.rows.length, pools: result.rows });
  } catch (err) {
    console.error('getFreightPools error:', err.message);
    return res.status(500).json({ error: 'Database Query Error', message: err.message });
  }
}

/**
 * POST /api/freight/pools
 * Creates a new shared-freight consolidation route.
 */
async function createFreightPool(req, res) {
  try {
    const { origin, destination, departure_window, vehicle_type, total_rental_rate, max_participants } = req.body;
    const userId = req.user.id;

    if (!origin || !destination || !departure_window || !vehicle_type || !total_rental_rate) {
      return res.status(400).json({ error: 'Missing Parameters', message: 'Origin, destination, departure window, vehicle type, and total rental rate are required.' });
    }

    const maxP = parseInt(max_participants, 10) || 4;
    const rate = parseFloat(total_rental_rate);

    // Initial creator joins as first participant, bearing 100% of cost share initially
    const poolRes = await db.withTransaction(async (tx) => {
      const insertPool = await tx.query(`
        INSERT INTO freight_pools (origin, destination, departure_window, vehicle_type, total_rental_rate, current_participants, max_participants, status)
        VALUES ($1, $2, $3, $4, $5, 1, $6, 'Open')
        RETURNING *;
      `, [origin, destination, departure_window, vehicle_type, rate, maxP]);

      const newPool = insertPool.rows[0];

      await tx.query(`
        INSERT INTO freight_pool_members (pool_id, user_id, cost_share)
        VALUES ($1, $2, $3);
      `, [newPool.id, userId, rate]);

      return newPool;
    });

    return res.status(201).json({
      message: 'Shared-freight consolidation pool created. Initial participant registered.',
      pool: poolRes
    });
  } catch (err) {
    console.error('createFreightPool error:', err.message);
    return res.status(500).json({ error: 'Creation Error', message: err.message });
  }
}

/**
 * POST /api/freight/pools/:id/join
 * Buyer joins an open consolidation pool, splitting commercial vehicle rental rates.
 */
async function joinFreightPool(req, res) {
  try {
    const poolId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const result = await db.withTransaction(async (tx) => {
      const poolRes = await tx.query('SELECT * FROM freight_pools WHERE id = $1 FOR UPDATE;', [poolId]);
      if (poolRes.rows.length === 0) {
        throw new Error('Freight pool not found.');
      }

      const pool = poolRes.rows[0];
      if (pool.status !== 'Open') {
        throw new Error(`Cannot join pool. Current status is '${pool.status}'.`);
      }

      // Check if user already joined
      const memberCheck = await tx.query('SELECT 1 FROM freight_pool_members WHERE pool_id = $1 AND user_id = $2;', [poolId, userId]);
      if (memberCheck.rows.length > 0) {
        throw new Error('You are already registered in this shared-freight consolidation pool.');
      }

      const newCount = pool.current_participants + 1;
      if (newCount > pool.max_participants) {
        throw new Error('Freight pool has reached maximum commercial vehicle capacity.');
      }

      const newStatus = newCount === pool.max_participants ? 'Full' : 'Open';
      const newCostShare = parseFloat((pool.total_rental_rate / newCount).toFixed(2));

      // Update pool participant count and status
      await tx.query(`
        UPDATE freight_pools
        SET current_participants = $1, status = $2
        WHERE id = $3;
      `, [newCount, newStatus, poolId]);

      // Add new member
      await tx.query(`
        INSERT INTO freight_pool_members (pool_id, user_id, cost_share)
        VALUES ($1, $2, $3);
      `, [poolId, userId, newCostShare]);

      // Recalculate and update cost share for all existing members in this pool!
      await tx.query(`
        UPDATE freight_pool_members
        SET cost_share = $1
        WHERE pool_id = $2;
      `, [newCostShare, poolId]);

      // Fetch updated participants list
      const updatedMembers = await tx.query(`
        SELECT fpm.*, u.name, u.phone
        FROM freight_pool_members fpm
        JOIN users u ON fpm.user_id = u.id
        WHERE fpm.pool_id = $1;
      `, [poolId]);

      return {
        pool_id: poolId,
        origin: pool.origin,
        destination: pool.destination,
        vehicle_type: pool.vehicle_type,
        total_rental_rate: pool.total_rental_rate,
        participants_count: newCount,
        max_participants: pool.max_participants,
        new_cost_share_per_user: newCostShare,
        status: newStatus,
        members: updatedMembers.rows
      };
    });

    return res.json({
      message: `Successfully joined shared-freight consolidation pool! Commercial vehicle rental rate recalculated. Your new cost share is ${result.new_cost_share_per_user} ETB.`,
      pool: result
    });
  } catch (err) {
    console.error('joinFreightPool error:', err.message);
    const status = err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: 'Pooling Error', message: err.message });
  }
}

module.exports = {
  getFreightPools,
  createFreightPool,
  joinFreightPool
};
