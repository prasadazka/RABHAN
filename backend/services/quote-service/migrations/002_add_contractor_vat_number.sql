-- Migration to add missing contractor_vat_number column
-- Version: 1.0.1
-- Description: Add contractor VAT number and other missing quotation fields

-- Set timezone for consistent timestamp handling
SET timezone = 'Asia/Riyadh';

-- ============================================
-- Add missing columns to contractor_quotes table
-- ============================================

ALTER TABLE contractor_quotes 
ADD COLUMN IF NOT EXISTS contractor_vat_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS installation_deadline DATE,
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100),
ADD COLUMN IF NOT EXISTS solar_system_capacity_kwp DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS storage_capacity_kwh DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS monthly_production_kwh DECIMAL(10,2);

-- ============================================
-- Create quotation line items table
-- ============================================

CREATE TABLE IF NOT EXISTS quotation_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES contractor_quotes(id) ON DELETE CASCADE,
    
    -- Line item details
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    specifications TEXT,
    units INTEGER NOT NULL CHECK (units > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(12,2) GENERATED ALWAYS AS (units * unit_price) STORED,
    
    -- Calculated amounts (SAR)
    rabhan_commission DECIMAL(12,2) GENERATED ALWAYS AS (units * unit_price * 0.15) STORED,
    rabhan_overprice DECIMAL(12,2) GENERATED ALWAYS AS (units * unit_price * 0.10) STORED,
    user_price DECIMAL(12,2) GENERATED ALWAYS AS (units * unit_price * 1.10) STORED,
    vendor_net_price DECIMAL(12,2) GENERATED ALWAYS AS (units * unit_price * 0.85) STORED,
    
    -- Metadata
    line_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_quotation_line_items_quotation_id 
    ON quotation_line_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_line_items_line_order 
    ON quotation_line_items(quotation_id, line_order);

-- ============================================
-- Add trigger for updated_at (only if function exists)
-- ============================================

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quotation_line_items_updated_at 
    BEFORE UPDATE ON quotation_line_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Update business config with quotation settings
-- ============================================

INSERT INTO business_config (config_key, config_value, description) VALUES
    ('quotation_settings', 
     '{"max_line_items": 20, "require_vat_number": true, "auto_calculate_totals": true}', 
     'Quotation form configuration')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Add view for complete quotation data
-- ============================================

CREATE OR REPLACE VIEW quotation_summary AS
SELECT 
    cq.id as quotation_id,
    cq.request_id,
    cq.contractor_id,
    cq.contractor_vat_number,
    cq.installation_deadline,
    cq.payment_terms,
    cq.solar_system_capacity_kwp,
    cq.storage_capacity_kwh,
    cq.monthly_production_kwh,
    cq.base_price,
    cq.total_user_price,
    cq.admin_status,
    cq.created_at,
    
    -- Line items aggregation
    COALESCE(li.total_items, 0) as total_line_items,
    COALESCE(li.total_amount, 0) as line_items_total,
    COALESCE(li.total_commission, 0) as total_commission,
    COALESCE(li.total_overprice, 0) as total_overprice,
    COALESCE(li.total_user_amount, 0) as total_user_amount,
    COALESCE(li.total_vendor_net, 0) as total_vendor_net,
    
    -- VAT calculations
    COALESCE(li.total_vendor_net, 0) * 0.15 as vat_amount,
    COALESCE(li.total_vendor_net, 0) * 1.15 as total_payable_to_contractor
    
FROM contractor_quotes cq
LEFT JOIN (
    SELECT 
        quotation_id,
        COUNT(*) as total_items,
        SUM(total_price) as total_amount,
        SUM(rabhan_commission) as total_commission,
        SUM(rabhan_overprice) as total_overprice,
        SUM(user_price) as total_user_amount,
        SUM(vendor_net_price) as total_vendor_net
    FROM quotation_line_items
    GROUP BY quotation_id
) li ON cq.id = li.quotation_id;

-- ============================================
-- Record migration
-- ============================================

INSERT INTO schema_migrations (version) 
VALUES ('002_add_contractor_vat_number') 
ON CONFLICT (version) DO NOTHING;