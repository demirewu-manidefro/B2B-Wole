-- Dynamic B2B Multi-Vendor E-Commerce Engine Schema
-- Database Target: PostgreSQL v15+ (Compatible with Supabase and PGlite)

BEGIN;

-- Drop existing tables if re-initializing
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS freight_pool_members CASCADE;
DROP TABLE IF EXISTS freight_pools CASCADE;
DROP TABLE IF EXISTS rfq_negotiations CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL, -- Constraint validation enforced at application level: 'buyer', 'vendor', 'admin'
    is_verified BOOLEAN DEFAULT false, -- True flags premium/vetted status ('Gold Supplier')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance critical lookup routes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- ==========================================
-- 2. HIERARCHICAL CATEGORIES TREE TABLE
-- ==========================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT REFERENCES categories(id) ON DELETE CASCADE, -- NULL defines root nodes, integers map child nodes
    slug VARCHAR(255) UNIQUE NOT NULL
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- ==========================================
-- 3. UNIFIED CENTRAL PRODUCTS TABLE
-- ==========================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url VARCHAR(500), -- Direct pointer link to Supabase Storage Bucket asset
    moq INT DEFAULT 10, -- Minimum Order Quantity threshold (Enforced as 1 for Hospitality rentals)
    
    -- Dynamic Wholesale Pricing Structure Matrix
    -- Format: [{"min": 10, "max": 50, "price": 500.00}, {"min": 51, "max": 100, "price": 450.00}]
    -- Hospitality format (mapped to nights): [{"min": 1, "max": 5, "price": 1000.00}, {"min": 6, "max": 30, "price": 800.00}]
    wholesale_prices JSONB NOT NULL,
    
    -- Generic Schema Extension Vector
    -- Apparel Variant: {"material": "Denim", "gender": "Unisex", "season": "Summer"}
    -- Electronics Variant: {"brand": "Sony", "power_consumption": "120W", "warranty_months": 24}
    -- Hospitality Variant: {"property_class": "Resort", "has_wifi": true, "restroom_type": "Ensuite"}
    specifications JSONB DEFAULT '{}'::jsonb,
    
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'draft'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_vendor_id ON products(vendor_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_specifications ON products USING gin (specifications); -- GIN indexing for fast nested JSON deep queries

-- ==========================================
-- 4. PRODUCT VARIANTS & INVENTORY LAYER
-- ==========================================
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL, -- Stock Keeping Unit code
    stock_quantity INT DEFAULT 0 NOT NULL, -- Target vector for Pessimistic Locking (SELECT FOR UPDATE)
    image_url VARCHAR(500), -- Structural visualization asset pointer
    
    -- Granular Variation Mapping Vector
    -- Apparel: {"color": "Midnight Blue", "size": "32"}
    -- Electronics: {"color": "Jet Black"}
    -- Hospitality: {"room_number": "402-B", "booked_dates": ["2026-07-10", "2026-07-11", "2026-07-12"]}
    attributes JSONB NOT NULL
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_attributes ON product_variants USING gin (attributes);

-- ==========================================
-- 5. ESCROW ORDERS TRANSACTION LEDGER
-- ==========================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    buyer_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    vendor_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_price NUMERIC(12, 2) NOT NULL,
    
    -- Financial Security Perimeter Integrity Vector
    tx_ref VARCHAR(100) UNIQUE NOT NULL, -- Unique gateway transaction reference (Prevents duplicate webhook allocation)
    
    -- Escrow Transaction Lifecycle Enforced Array
    -- Valid State Array: 'Created', 'Paid', 'Shipped', 'Delivered', 'Released', 'Disputed'
    status VARCHAR(50) DEFAULT 'Created' NOT NULL,
    
    dispute_details TEXT, -- Holds resolution text and compliance metrics if status toggles to 'Disputed'
    
    -- Helper columns for B2B Escrow & Logistics Tracking
    items JSONB DEFAULT '[]'::jsonb, -- Array of ordered line items with SKU, quantity, unit price
    is_sample BOOLEAN DEFAULT false, -- True if Retail Sample Pipeline MOQ bypass was used
    shipping_address TEXT,
    tracking_number VARCHAR(100),
    shipping_manifest_url VARCHAR(500),
    commission_amount NUMERIC(12, 2) DEFAULT 0.00, -- 2% - 3% localized platform commission
    freight_pool_id INT, -- Reference to shared-freight consolidation pool if joined
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX idx_orders_tx_ref ON orders(tx_ref);

-- ==========================================
-- 6. MAINFRAME GLOBAL CONTROL TABLE
-- ==========================================
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    app_version VARCHAR(20) DEFAULT '1.0.0' NOT NULL, -- Handshake code check for client app cache evictions
    maintenance_mode BOOLEAN DEFAULT false NOT NULL -- Global API freeze switch toggle
);

-- Seed systemic configuration requirement row
INSERT INTO system_settings (id, app_version, maintenance_mode) VALUES (1, '1.0.0', false);

-- ==========================================
-- 7. MARKETPLACE EXTENSION TABLES (RFQ, FREIGHT, AUDIT LOGS)
-- ==========================================
CREATE TABLE rfq_negotiations (
    id SERIAL PRIMARY KEY,
    buyer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    target_quantity INT NOT NULL,
    proposed_unit_price NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Completed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE freight_pools (
    id SERIAL PRIMARY KEY,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_window VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL, -- e.g., 'Isuzu Freight Truck (5 Ton)', 'Cross-Country Bus Cargo'
    total_rental_rate NUMERIC(12, 2) NOT NULL,
    current_participants INT DEFAULT 1,
    max_participants INT DEFAULT 5,
    status VARCHAR(50) DEFAULT 'Open', -- 'Open', 'Full', 'Dispatched'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE freight_pool_members (
    id SERIAL PRIMARY KEY,
    pool_id INT NOT NULL REFERENCES freight_pools(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cost_share NUMERIC(12, 2) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL, -- e.g., 'CHAT_SECURITY_SCRUB', 'MAINTENANCE_TOGGLE', 'ORPHAN_ASSET_CLEANUP'
    severity VARCHAR(50) DEFAULT 'INFO', -- 'INFO', 'WARNING', 'CRITICAL'
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
