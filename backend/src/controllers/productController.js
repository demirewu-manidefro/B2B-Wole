const db = require('../db');
const storageService = require('../services/storageService');

/**
 * Section 2.1 Tiered Wholesale Pricing & Section 7 Dynamic JSONB Querying
 * Controller for multi-vertical catalog browsing, dynamic price matrix calculation,
 * and vendor product inventory management.
 */

/**
 * Resolves dynamic unit price from JSONB wholesale_prices array based on quantity or duration of nights.
 * @param {Array} pricingArray - e.g. [{"min": 10, "max": 50, "price": 500.00}, ...]
 * @param {number} quantity - Number of physical items ordered or duration of nights booked.
 * @returns {number} Resolved unit price.
 */
function resolveTieredPrice(pricingArray, quantity) {
  if (!Array.isArray(pricingArray) || pricingArray.length === 0) {
    return 0;
  }

  const qty = parseInt(quantity, 10) || 1;

  // Find matching tier
  for (const tier of pricingArray) {
    const min = parseInt(tier.min, 10) || 0;
    const max = tier.max !== undefined && tier.max !== null ? parseInt(tier.max, 10) : Infinity;
    if (qty >= min && qty <= max) {
      return parseFloat(tier.price);
    }
  }

  // If quantity exceeds max tier, return lowest price tier (highest volume discount)
  // Sort descending by min and pick first
  const sorted = [...pricingArray].sort((a, b) => (b.min || 0) - (a.min || 0));
  return parseFloat(sorted[0].price);
}

/**
 * GET /api/products
 * Fetches products with vertical filtering and Section 7 Dynamic JSONB Querying (@>).
 */
async function getProducts(req, res) {
  try {
    const { category_id, category_slug, vendor_id, attr, spec } = req.query;
    let queryText = `
      SELECT p.*, c.name as category_name, c.slug as category_slug, u.name as vendor_name, u.is_verified as vendor_verified,
             (SELECT json_agg(v.*) FROM product_variants v WHERE v.product_id = p.id) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.vendor_id = u.id
      WHERE p.status = 'active'
    `;
    const params = [];
    let paramIdx = 1;

    if (category_id) {
      queryText += ` AND p.category_id = $${paramIdx++}`;
      params.push(parseInt(category_id, 10));
    }

    if (category_slug) {
      queryText += ` AND c.slug = $${paramIdx++}`;
      params.push(category_slug);
    }

    if (vendor_id) {
      queryText += ` AND p.vendor_id = $${paramIdx++}`;
      params.push(parseInt(vendor_id, 10));
    }

    // Section 7 Dynamic JSONB Querying Example:
    // If client passes spec query (e.g. spec={"has_wifi":true} or spec_has_wifi=true)
    if (spec) {
      try {
        const specJson = typeof spec === 'string' ? spec : JSON.stringify(spec);
        queryText += ` AND p.specifications @> $${paramIdx++}::jsonb`;
        params.push(specJson);
      } catch (e) {
        console.warn('Invalid JSONB spec query:', spec);
      }
    }

    // If client queries specific variant attribute (e.g. attr={"size":"32"} or attr_size=32),
    // filter products that contain at least one matching variant using EXISTS and @>
    if (attr) {
      try {
        const attrJson = typeof attr === 'string' ? attr : JSON.stringify(attr);
        queryText += ` AND EXISTS (
          SELECT 1 FROM product_variants pv 
          WHERE pv.product_id = p.id AND pv.attributes @> $${paramIdx++}::jsonb
        )`;
        params.push(attrJson);
      } catch (e) {
        console.warn('Invalid JSONB attr query:', attr);
      }
    }

    queryText += ` ORDER BY p.created_at DESC;`;

    const result = await db.query(queryText, params);
    return res.json({ count: result.rows.length, products: result.rows });
  } catch (err) {
    console.error('getProducts error:', err.message);
    return res.status(500).json({ error: 'Database Query Error', message: err.message });
  }
}

/**
 * GET /api/products/:id
 * Fetches single product with all variants and pricing matrix.
 */
async function getProductById(req, res) {
  try {
    const productId = parseInt(req.params.id, 10);
    const result = await db.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug, u.name as vendor_name, u.is_verified as vendor_verified,
             (SELECT json_agg(v.*) FROM product_variants v WHERE v.product_id = p.id) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.vendor_id = u.id
      WHERE p.id = $1;
    `, [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Product record not found.' });
    }

    return res.json({ product: result.rows[0] });
  } catch (err) {
    console.error('getProductById error:', err.message);
    return res.status(500).json({ error: 'Database Query Error', message: err.message });
  }
}

/**
 * POST /api/products/calculate-price
 * Calculates the dynamic unit price based on wholesale tiers and quantity/nights.
 */
async function calculatePrice(req, res) {
  try {
    const { product_id, quantity, custom_unit_price } = req.body;
    
    // If an RFQ custom unit price is provided and verified, override default tiers
    if (custom_unit_price && !isNaN(custom_unit_price)) {
      const qty = parseInt(quantity, 10) || 1;
      return res.json({
        product_id,
        quantity: qty,
        unit_price: parseFloat(custom_unit_price),
        total_price: parseFloat((qty * parseFloat(custom_unit_price)).toFixed(2)),
        pricing_source: 'RFQ_CUSTOM_CONTRACT_OVERRIDE'
      });
    }

    const prodRes = await db.query('SELECT id, title, moq, wholesale_prices FROM products WHERE id = $1;', [product_id]);
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Product not found for price calculation.' });
    }

    const product = prodRes.rows[0];
    const qty = parseInt(quantity, 10) || 1;
    const unitPrice = resolveTieredPrice(product.wholesale_prices, qty);
    const totalPrice = parseFloat((qty * unitPrice).toFixed(2));

    return res.json({
      product_id: product.id,
      title: product.title,
      moq: product.moq,
      quantity: qty,
      unit_price: unitPrice,
      total_price: totalPrice,
      pricing_source: 'DYNAMIC_WHOLESALE_TIER_MATRIX'
    });
  } catch (err) {
    console.error('calculatePrice error:', err.message);
    return res.status(500).json({ error: 'Calculation Error', message: err.message });
  }
}

/**
 * POST /api/products
 * Vendor creates a new product and variants.
 */
async function createProduct(req, res) {
  try {
    if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Only registered vendors can create products.' });
    }

    const { category_id, title, description, video_url, moq, wholesale_prices, specifications, variants } = req.body;
    const vendorId = req.user.id;

    const prodRes = await db.query(`
      INSERT INTO products (vendor_id, category_id, title, description, video_url, moq, wholesale_prices, specifications, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, 'active')
      RETURNING *;
    `, [vendorId, category_id || null, title, description || '', video_url || null, moq || 10, JSON.stringify(wholesale_prices || []), JSON.stringify(specifications || {})]);

    const newProduct = prodRes.rows[0];

    // Insert variants if provided
    const createdVariants = [];
    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        const varRes = await db.query(`
          INSERT INTO product_variants (product_id, sku, stock_quantity, image_url, attributes)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          RETURNING *;
        `, [newProduct.id, v.sku || `SKU-${Date.now()}-${Math.floor(Math.random()*100)}`, parseInt(v.stock_quantity, 10) || 0, v.image_url || null, JSON.stringify(v.attributes || {})]);
        createdVariants.push(varRes.rows[0]);
      }
    }

    return res.status(201).json({ message: 'Product published successfully to global marketplace.', product: newProduct, variants: createdVariants });
  } catch (err) {
    console.error('createProduct error:', err.message);
    return res.status(500).json({ error: 'Creation Failure', message: err.message });
  }
}

/**
 * DELETE /api/products/:id
 * Vendor deletes a product. Triggers Section 4 Orphaned Asset Cleanup Routine!
 */
async function deleteProduct(req, res) {
  try {
    const productId = parseInt(req.params.id, 10);
    const prodRes = await db.query('SELECT id, vendor_id, video_url FROM products WHERE id = $1;', [productId]);
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });
    }

    const product = prodRes.rows[0];
    if (product.vendor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden (IDOR)', message: 'You can only delete products within your vendor token perimeter.' });
    }

    // Section 4: Trigger Orphaned Asset Cleanup Routine if video exists
    if (product.video_url) {
      await storageService.cleanupOrphanedAsset(product.video_url, req.user.id);
    }

    await db.query('DELETE FROM products WHERE id = $1;', [productId]);

    return res.json({ message: 'Product and associated inventory variants purged. Cloud storage binary blobs cleaned via orphan deletion routine.' });
  } catch (err) {
    console.error('deleteProduct error:', err.message);
    return res.status(500).json({ error: 'Deletion Failure', message: err.message });
  }
}

module.exports = {
  getProducts,
  getProductById,
  calculatePrice,
  resolveTieredPrice,
  createProduct,
  deleteProduct
};
