-- RABHAN Marketplace Service - MVP Database Schema
-- SAMA Compliant | Zero-Trust Security | KSA Data Residency
-- Database: rabhan_marketplace (PostgreSQL 14+)

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- 1. CATEGORIES TABLE (Simple Solar Categories)
-- =====================================================
CREATE TABLE categories (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Information
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(100),
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    description_ar TEXT,
    
    -- Visual Elements
    icon VARCHAR(50),
    image_url VARCHAR(500),
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    products_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. PRODUCTS TABLE (Core MVP Product Catalog)
-- =====================================================
CREATE TABLE products (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Keys
    contractor_id UUID NOT NULL,
    category_id UUID NOT NULL,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    slug VARCHAR(255) NOT NULL UNIQUE,
    
    -- Product Details
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    sku VARCHAR(50) UNIQUE,
    
    -- Basic Specifications (JSONB for flexibility)
    specifications JSONB DEFAULT '{}',
    
    -- Pricing (Basic - No Complex Calculations)
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    currency VARCHAR(3) DEFAULT 'SAR',
    vat_included BOOLEAN DEFAULT true,
    
    -- Simple Inventory
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    stock_status VARCHAR(20) DEFAULT 'IN_STOCK' CHECK (
        stock_status IN ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK')
    ),
    
    -- Basic Status
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (
        status IN ('ACTIVE', 'INACTIVE')
    ),
    
    -- Timestamps and Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT fk_products_category 
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- =====================================================
-- 3. PRODUCT_IMAGES TABLE (Simple Image Storage)
-- =====================================================
CREATE TABLE product_images (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key
    product_id UUID NOT NULL,
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500),
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_product_images_product 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE (<2ms response times)
-- =====================================================

-- Categories indexes
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;
CREATE INDEX idx_categories_sort ON categories(sort_order);

-- Products indexes (Critical for sub-2ms performance)
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_contractor ON products(contractor_id);
CREATE INDEX idx_products_status ON products(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_products_stock ON products(stock_status) WHERE stock_status != 'OUT_OF_STOCK';
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_created ON products(created_at DESC);
CREATE INDEX idx_products_slug ON products(slug);

-- Full-text search indexes (GIN for performance)
CREATE INDEX idx_products_search_en ON products 
USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || brand));

CREATE INDEX idx_products_search_ar ON products 
USING GIN(to_tsvector('arabic', COALESCE(name_ar, '') || ' ' || COALESCE(description_ar, '')));

-- Product images indexes
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(is_primary) WHERE is_primary = true;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BASIC SAMA AUDIT LOGGING
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(changed_at DESC);

-- =====================================================
-- INITIAL DATA - MVP SOLAR CATEGORIES
-- =====================================================
INSERT INTO categories (id, name, name_ar, slug, description, icon, sort_order) VALUES
(uuid_generate_v4(), 'Solar Panels', 'الألواح الشمسية', 'solar-panels', 'Photovoltaic solar panels and modules', 'solar-panel', 1),
(uuid_generate_v4(), 'Inverters', 'العاكسات', 'inverters', 'Solar power inverters and converters', 'zap', 2),
(uuid_generate_v4(), 'Mounting Systems', 'أنظمة التركيب', 'mounting-systems', 'Solar panel mounting and racking systems', 'tool', 3),
(uuid_generate_v4(), 'Batteries', 'البطاريات', 'batteries', 'Energy storage batteries and systems', 'battery', 4),
(uuid_generate_v4(), 'Cables & Accessories', 'الكابلات والملحقات', 'cables-accessories', 'DC/AC cables and electrical accessories', 'cable', 5);

-- =====================================================
-- BASIC SECURITY POLICIES (SAMA Compliance)
-- =====================================================

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies will be created in application layer
-- (Contractor can only manage their products)

COMMIT;