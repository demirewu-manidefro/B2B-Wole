const bcrypt = require('bcryptjs');

async function seed(db) {
  console.log('🌱 Seeding database with Ethiopian B2B Marketplace dataset...');

  // 1. Seed Users (Password: password123 / admin123)
  const passHash = await bcrypt.hash('password123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  await db.query(`
    INSERT INTO users (id, name, phone, password_hash, role, is_verified) VALUES
    (1, 'Abebe Kebede (Addis Retailer)', '0911000001', $1, 'buyer', true),
    (2, 'Sara Tadesse (Habesha & Coffee Wholesale)', '0911000002', $1, 'vendor', true),
    (3, 'System Administrator (Platform Arbiter)', '0911000003', $2, 'admin', true),
    (4, 'Dawit Mekonnen (Hawassa Electronics Hub)', '0911000004', $1, 'buyer', true),
    (5, 'Tigist Alemu (EthioSolar Systems)', '0911000005', $1, 'vendor', true);
  `, [passHash, adminHash]);

  // Reset user sequence
  await db.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));`);

  // 2. Seed Categories (Hierarchical Tree)
  await db.query(`
    INSERT INTO categories (id, name, parent_id, slug) VALUES
    (1, 'Apparel & Boutiques', NULL, 'apparel-boutiques'),
    (2, 'Traditional Habesha Wear', 1, 'traditional-habesha-wear'),
    (3, 'Modern Denim & Outerwear', 1, 'modern-denim-outerwear'),
    (4, 'Electronics & Power', NULL, 'electronics-power'),
    (5, 'Solar & Power Inverters', 4, 'solar-power-inverters'),
    (6, 'Mobile Devices & Accessories', 4, 'mobile-devices'),
    (7, 'Fast-Moving Consumer Goods (FMCG)', NULL, 'fmcg'),
    (8, 'Agricultural Grains & Specialty Coffee', 7, 'specialty-coffee-grains'),
    (9, 'Hospitality & Commercial Rentals', NULL, 'hospitality-rentals'),
    (10, 'Hotel Rooms & Resort Suites', 9, 'resort-suites-rooms'),
    (11, 'Student & Worker Dorm Bookings', 9, 'student-worker-dorms');
  `);
  await db.query(`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));`);

  // 3. Seed Products (With JSONB wholesale_prices and specifications)
  await db.query(`
    INSERT INTO products (id, vendor_id, category_id, title, description, video_url, moq, wholesale_prices, specifications, status) VALUES
    (
      1, 2, 2, 
      'Handwoven Sheba Elegance Habesha Kemis (Bulk Trade)', 
      'Authentic handwoven Ethiopian cotton dress with intricate gold and emerald tibeb embroidery. Ideal for boutiques, wedding retailers, and cultural exports.',
      'https://ebzsmbwwxayngkwwldqf.supabase.co/storage/v1/object/public/videos/habesha-promo-30s.mp4',
      10,
      '[{"min": 10, "max": 49, "price": 4500.00}, {"min": 50, "max": 100, "price": 3800.00}, {"min": 101, "max": 500, "price": 3400.00}]'::jsonb,
      '{"material": "Handwoven Cotton (Tibeb)", "gender": "Female", "origin": "Addis Ababa", "season": "Holiday/Festival"}'::jsonb,
      'active'
    ),
    (
      2, 5, 5, 
      'EthioSolar 5KW Home & Commercial Power Inverter Kit', 
      'Heavy-duty solar inverter designed for off-grid businesses, hotels, and rural clinics in Ethiopia. Full 24-month warranty with lithium battery compatibility.',
      'https://ebzsmbwwxayngkwwldqf.supabase.co/storage/v1/object/public/videos/solar-inverter-demo.mp4',
      5,
      '[{"min": 5, "max": 19, "price": 32000.00}, {"min": 20, "max": 50, "price": 28500.00}]'::jsonb,
      '{"brand": "EthioSolar / Growatt", "power_consumption": "5000W", "warranty_months": 24, "voltage": "220V/240V"}'::jsonb,
      'active'
    ),
    (
      3, 2, 8, 
      'Premium Export-Grade Roasted Yirgacheffe Coffee (10kg Commercial Bag)', 
      'Grade 1 washed specialty coffee from Yirgacheffe highlands. Roasted to medium-dark perfection, packaged in commercial valved bags for cafes and hotels.',
      'https://ebzsmbwwxayngkwwldqf.supabase.co/storage/v1/object/public/videos/coffee-roasting-clip.mp4',
      15,
      '[{"min": 15, "max": 49, "price": 6500.00}, {"min": 50, "max": 200, "price": 5800.00}]'::jsonb,
      '{"grade": "Grade 1 Specialty", "process": "Washed", "altitude": "1900m-2200m", "roast_level": "Medium Dark"}'::jsonb,
      'active'
    ),
    (
      4, 2, 10, 
      'Kuriftu Resort Lakeside Deluxe Villa (Commercial Block Booking / Retreat)', 
      'Exclusive resort villa block booking for corporate retreats, NGO conferences, and tour groups. MOQ is 1 as pricing dynamically maps to duration of nights booked.',
      'https://ebzsmbwwxayngkwwldqf.supabase.co/storage/v1/object/public/videos/resort-tour-30s.mp4',
      1,
      '[{"min": 1, "max": 5, "price": 8500.00}, {"min": 6, "max": 14, "price": 7200.00}, {"min": 15, "max": 30, "price": 6000.00}]'::jsonb,
      '{"property_class": "5-Star Resort", "has_wifi": true, "restroom_type": "Ensuite Jacuzzi", "location": "Bishoftu / Hawassa Lake"}'::jsonb,
      'active'
    ),
    (
      5, 2, 3, 
      'Heavyweight 14oz Vintage Indigo Denim Trucker Jacket', 
      'Durable vintage wash denim jackets tailored for modern streetwear boutiques in Addis Ababa and Adama. Double-stitched seams and premium brass hardware.',
      NULL,
      10,
      '[{"min": 10, "max": 50, "price": 1800.00}, {"min": 51, "max": 150, "price": 1550.00}]'::jsonb,
      '{"material": "14oz Indigo Denim", "gender": "Unisex", "season": "All-Season", "wash": "Vintage Blue"}'::jsonb,
      'active'
    );
  `);
  await db.query(`SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));`);

  // 4. Seed Product Variants (With JSONB attributes for @> querying)
  await db.query(`
    INSERT INTO product_variants (id, product_id, sku, stock_quantity, image_url, attributes) VALUES
    (1, 1, 'HAB-KEM-GOLD-32', 85, 'https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=600&q=80', '{"color": "Gold Border", "size": "32", "style": "Zuriah"}'::jsonb),
    (2, 1, 'HAB-KEM-EMERALD-34', 40, 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80', '{"color": "Emerald Green", "size": "34", "style": "Modern"}'::jsonb),
    (3, 2, 'SOL-INV-5KW-LITHIUM', 25, 'https://images.unsplash.com/photo-1509391365360-fa0472685930?auto=format&fit=crop&w=600&q=80', '{"battery_compatibility": "Lithium-Ion", "color": "Industrial Gray", "display": "LCD Touch"}'::jsonb),
    (4, 3, 'COF-YIRG-10KG-WHOLE', 150, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80', '{"grind": "Whole Bean", "packaging": "Valved Kraft Bag", "weight": "10kg"}'::jsonb),
    (5, 3, 'COF-YIRG-10KG-ESP', 90, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', '{"grind": "Espresso Grind", "packaging": "Valved Kraft Bag", "weight": "10kg"}'::jsonb),
    (6, 4, 'KUR-VILLA-LAKE-402', 10, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80', '{"room_number": "Villa 402-B", "view": "Lakeside Panoramic", "bed_type": "King Luxury"}'::jsonb),
    (7, 5, 'DEN-JCK-BLU-32', 60, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80', '{"color": "Vintage Blue", "size": "32", "fit": "Regular"}'::jsonb),
    (8, 5, 'DEN-JCK-BLK-34', 55, 'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?auto=format&fit=crop&w=600&q=80', '{"color": "Midnight Black", "size": "34", "fit": "Oversized"}'::jsonb);
  `);
  await db.query(`SELECT setval('product_variants_id_seq', (SELECT MAX(id) FROM product_variants));`);

  // 5. Seed Shared-Freight Pools (Section 2.4)
  await db.query(`
    INSERT INTO freight_pools (id, origin, destination, departure_window, vehicle_type, total_rental_rate, current_participants, max_participants, status) VALUES
    (1, 'Addis Ababa (Merkato Terminal)', 'Hawassa (Piassa Commercial Hub)', '2026-07-28 08:00 AM', 'Isuzu Freight Truck (5 Ton)', 15000.00, 2, 4, 'Open'),
    (2, 'Addis Ababa (Bole Cargo Hub)', 'Adama / Nazret (Expressway)', '2026-07-30 06:00 AM', 'Commercial Express Transit Van', 6000.00, 1, 3, 'Open');
  `);
  await db.query(`SELECT setval('freight_pools_id_seq', (SELECT MAX(id) FROM freight_pools));`);

  await db.query(`
    INSERT INTO freight_pool_members (pool_id, user_id, cost_share) VALUES
    (1, 1, 7500.00),
    (1, 4, 7500.00),
    (2, 1, 6000.00);
  `);

  // 6. Seed Escrow Orders (Section 3)
  await db.query(`
    INSERT INTO orders (id, buyer_id, vendor_id, total_price, tx_ref, status, dispute_details, items, is_sample, shipping_address, tracking_number, shipping_manifest_url, commission_amount, freight_pool_id) VALUES
    (
      1, 1, 2, 45000.00, 'CHAPA-TX-8839210-ETH', 'Shipped', NULL,
      '[{"variant_id": 1, "sku": "HAB-KEM-GOLD-32", "title": "Handwoven Sheba Elegance Habesha Kemis", "quantity": 10, "unit_price": 4500.00}]'::jsonb,
      false, 'Addis Ababa, Bole Subcity, Woreda 03, House 441', 'ETH-TRANSIT-9921',
      'https://ebzsmbwwxayngkwwldqf.supabase.co/storage/v1/object/public/manifests/manifest-9921.pdf',
      1125.00, 1
    ),
    (
      2, 1, 2, 4500.00, 'TELEBIRR-TX-SAMPLE-7711', 'Delivered', NULL,
      '[{"variant_id": 2, "sku": "HAB-KEM-EMERALD-34", "title": "Handwoven Sheba Elegance Habesha Kemis (Retail Sample)", "quantity": 1, "unit_price": 4500.00}]'::jsonb,
      true, 'Addis Ababa, Bole Subcity, Woreda 03, House 441', 'EMS-ETH-1102',
      NULL, 112.50, NULL
    ),
    (
      3, 4, 5, 160000.00, 'CHAPA-TX-DISPUTE-4001', 'Disputed', 
      'Buyer reported 1 unit of Solar Inverter had a cracked LCD touch display upon arrival at Hawassa terminal. Photographic evidence uploaded. Awaiting Admin arbitration.',
      '[{"variant_id": 3, "sku": "SOL-INV-5KW-LITHIUM", "title": "EthioSolar 5KW Home & Commercial Power Inverter Kit", "quantity": 5, "unit_price": 32000.00}]'::jsonb,
      false, 'Hawassa, Tabor Subcity, Piassa Trade Center Shop 12', 'SOLAR-LOG-4402',
      'https://ebzsmbwwxayngkwwldqf.supabase.co/storage/v1/object/public/manifests/solar-manifest.pdf',
      4000.00, NULL
    ),
    (
      4, 1, 2, 21600.00, 'CHAPA-TX-VILLA-3301', 'Released', NULL,
      '[{"variant_id": 6, "sku": "KUR-VILLA-LAKE-402", "title": "Kuriftu Resort Lakeside Deluxe Villa (3 Nights Booking)", "quantity": 3, "unit_price": 7200.00}]'::jsonb,
      false, 'Kuriftu Resort Bishoftu, Lakeside Block B', 'VILLA-RES-3301',
      NULL, 540.00, NULL
    );
  `);
  await db.query(`SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));`);

  // 7. Seed Sample RFQ Negotiation (Section 2.2)
  await db.query(`
    INSERT INTO rfq_negotiations (id, buyer_id, vendor_id, product_id, target_quantity, proposed_unit_price, status, notes) VALUES
    (1, 4, 5, 2, 50, 26000.00, 'Approved', 'Buyer requested 50 units of Solar Inverter at 26,000 ETB/unit for a regional rural electrification clinic project. Vendor Sara approved custom trade contract.');
  `);
  await db.query(`SELECT setval('rfq_negotiations_id_seq', (SELECT MAX(id) FROM rfq_negotiations));`);

  // 8. Seed Initial Audit Logs
  await db.query(`
    INSERT INTO audit_logs (user_id, event_type, severity, details) VALUES
    (1, 'SYSTEM_BOOT', 'INFO', 'Marketplace engine initialized in embedded PGlite v15+ mode.'),
    (4, 'CHAT_SECURITY_SCRUB', 'WARNING', 'User attempted to share external phone number (0911998877) in RFQ chat room. Regex engine obfuscated packet to [PLATFORM PROTECTED INFO].');
  `);

  console.log('✅ Seeding complete!');
}

module.exports = { seed };
