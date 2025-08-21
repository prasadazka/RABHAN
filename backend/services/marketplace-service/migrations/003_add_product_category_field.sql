-- RABHAN Marketplace Service - Product Category Implementation
-- Dynamic Category-Based Specification System | Phase 1: Database Updates
-- Support for 4 Product Categories: Inverters, Batteries, Solar Panels, Full Systems

BEGIN;

-- =====================================================
-- 1. ADD PRODUCT_CATEGORY FIELD TO PRODUCTS TABLE
-- =====================================================

-- Add product_category enum type for better type safety and performance
CREATE TYPE product_category_enum AS ENUM ('INVERTER', 'BATTERY', 'SOLAR_PANEL', 'FULL_SYSTEM');

-- Add product_category field to products table
ALTER TABLE products ADD COLUMN product_category product_category_enum;

-- Set default category based on existing category names (migration safety)
-- This ensures existing products continue to work
UPDATE products SET product_category = 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM categories c 
      WHERE c.id = products.category_id 
      AND LOWER(c.name) LIKE '%inverter%'
    ) THEN 'INVERTER'::product_category_enum
    WHEN EXISTS (
      SELECT 1 FROM categories c 
      WHERE c.id = products.category_id 
      AND LOWER(c.name) LIKE '%batter%'
    ) THEN 'BATTERY'::product_category_enum
    WHEN EXISTS (
      SELECT 1 FROM categories c 
      WHERE c.id = products.category_id 
      AND (LOWER(c.name) LIKE '%solar%panel%' OR LOWER(c.name) LIKE '%panel%')
    ) THEN 'SOLAR_PANEL'::product_category_enum
    WHEN EXISTS (
      SELECT 1 FROM categories c 
      WHERE c.id = products.category_id 
      AND (LOWER(c.name) LIKE '%system%' OR LOWER(c.name) LIKE '%full%')
    ) THEN 'FULL_SYSTEM'::product_category_enum
    ELSE 'SOLAR_PANEL'::product_category_enum -- Default fallback
  END
WHERE product_category IS NULL;

-- Make the field NOT NULL after setting defaults
ALTER TABLE products ALTER COLUMN product_category SET NOT NULL;

-- Add index for efficient category-based queries
CREATE INDEX idx_products_category_type ON products(product_category);
CREATE INDEX idx_products_category_status ON products(product_category, status) 
  WHERE status = 'ACTIVE';

-- =====================================================
-- 2. UPDATE EXISTING CATEGORIES FOR 4-CATEGORY SYSTEM
-- =====================================================

-- First, let's create a backup of existing categories
CREATE TABLE categories_backup AS SELECT * FROM categories;

-- Temporarily disable foreign key constraint to allow category updates
ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_category;

-- Clear existing categories and insert the 4 main categories with fixed IDs
DELETE FROM categories;

INSERT INTO categories (id, name, name_ar, slug, description, description_ar, icon, sort_order, is_active) VALUES
(
  '11111111-1111-1111-1111-111111111111'::UUID, 
  'Inverters', 
  'العاكسات الشمسية', 
  'inverters', 
  'Solar power inverters and converters for energy conversion', 
  'العاكسات والمحولات الشمسية لتحويل الطاقة',
  'zap', 
  1, 
  true
),
(
  '22222222-2222-2222-2222-222222222222'::UUID, 
  'Batteries', 
  'البطاريات وأنظمة التخزين', 
  'batteries', 
  'Energy storage batteries and battery systems', 
  'بطاريات تخزين الطاقة وأنظمة البطاريات',
  'battery', 
  2, 
  true
),
(
  '33333333-3333-3333-3333-333333333333'::UUID, 
  'Solar Panels', 
  'الألواح الشمسية', 
  'solar-panels', 
  'Photovoltaic solar panels and solar modules', 
  'الألواح الشمسية الكهروضوئية والوحدات الشمسية',
  'sun', 
  3, 
  true
),
(
  '44444444-4444-4444-4444-444444444444'::UUID, 
  'Full Systems', 
  'الأنظمة الكاملة', 
  'full-systems', 
  'Complete solar energy systems with all components', 
  'أنظمة الطاقة الشمسية الكاملة مع جميع المكونات',
  'settings', 
  4, 
  true
);

-- Update existing products to use new category IDs based on their product_category
-- Inverters
UPDATE products SET category_id = (
  SELECT id FROM categories WHERE slug = 'inverters'
) WHERE product_category = 'INVERTER'::product_category_enum;

-- Batteries  
UPDATE products SET category_id = (
  SELECT id FROM categories WHERE slug = 'batteries'
) WHERE product_category = 'BATTERY'::product_category_enum;

-- Solar Panels
UPDATE products SET category_id = (
  SELECT id FROM categories WHERE slug = 'solar-panels'
) WHERE product_category = 'SOLAR_PANEL'::product_category_enum;

-- Full Systems
UPDATE products SET category_id = (
  SELECT id FROM categories WHERE slug = 'full-systems'
) WHERE product_category = 'FULL_SYSTEM'::product_category_enum;

-- =====================================================
-- 3. ADD VALIDATION CONSTRAINTS
-- =====================================================

-- Re-add the foreign key constraint after updating categories
ALTER TABLE products ADD CONSTRAINT fk_products_category 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;

-- Ensure product_category matches category selection (data integrity)
-- This creates a soft constraint that can be checked in application logic
COMMENT ON COLUMN products.product_category IS 
'Product category type for dynamic specification forms. Must align with category selection.';

-- =====================================================
-- 4. UPDATE AUDIT TRIGGERS FOR NEW FIELD
-- =====================================================

-- The existing audit trigger will automatically handle the new product_category field
-- No additional changes needed for audit functionality

-- =====================================================
-- 5. PERFORMANCE OPTIMIZATIONS FOR CATEGORY QUERIES
-- =====================================================

-- Composite indexes for common query patterns
CREATE INDEX idx_products_category_contractor ON products(product_category, contractor_id);
CREATE INDEX idx_products_category_brand ON products(product_category, brand);
CREATE INDEX idx_products_category_price ON products(product_category, price);
CREATE INDEX idx_products_category_created ON products(product_category, created_at DESC);

-- Partial indexes for frequently accessed data
CREATE INDEX idx_products_active_by_category ON products(product_category, status, approval_status)
  WHERE status = 'ACTIVE' AND approval_status = 'APPROVED';

-- GIN indexes for specifications search by category
CREATE INDEX idx_products_specs_inverter ON products 
  USING GIN(specifications) WHERE product_category = 'INVERTER';
CREATE INDEX idx_products_specs_battery ON products 
  USING GIN(specifications) WHERE product_category = 'BATTERY';
CREATE INDEX idx_products_specs_panel ON products 
  USING GIN(specifications) WHERE product_category = 'SOLAR_PANEL';
CREATE INDEX idx_products_specs_system ON products 
  USING GIN(specifications) WHERE product_category = 'FULL_SYSTEM';

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (For Testing)
-- =====================================================

-- Check category distribution
-- SELECT product_category, COUNT(*) as count FROM products GROUP BY product_category;

-- Check category-specification alignment
-- SELECT product_category, jsonb_object_keys(specifications) as spec_keys 
-- FROM products LIMIT 10;

-- Check new indexes
-- SELECT schemaname, tablename, indexname, indexdef 
-- FROM pg_indexes WHERE tablename = 'products' AND indexname LIKE '%category%';