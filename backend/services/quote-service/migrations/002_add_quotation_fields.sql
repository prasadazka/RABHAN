-- Migration: Add Detailed Quotation Fields to contractor_quotes Table
-- Version: 002
-- Description: Adds fields for contractor detailed quotation submission

-- Add quotation information fields
ALTER TABLE contractor_quotes 
ADD COLUMN contractor_vat_number VARCHAR(50) NOT NULL DEFAULT '',
ADD COLUMN installation_deadline DATE,
ADD COLUMN payment_terms VARCHAR(20) CHECK (payment_terms IN ('wallet_credit', 'bank_transfer'));

-- Add solar system specification fields  
ALTER TABLE contractor_quotes
ADD COLUMN solar_system_capacity_kwp DECIMAL,
ADD COLUMN storage_capacity_kwh DECIMAL,
ADD COLUMN monthly_production_kwh DECIMAL;

-- Create index for performance
CREATE INDEX idx_contractor_quotes_installation_deadline ON contractor_quotes(installation_deadline);
CREATE INDEX idx_contractor_quotes_payment_terms ON contractor_quotes(payment_terms);

-- ============================================
-- CREATE QUOTATION LINE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quotation_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES contractor_quotes(id) ON DELETE CASCADE,
    
    -- Line Item Details
    serial_number INTEGER NOT NULL, -- S/N column
    item_name VARCHAR(100) NOT NULL, -- Solar Panel, Inverter, Batteries, Other
    description TEXT NOT NULL, -- Technical specifications
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price > 0),
    
    -- Calculated Fields (all amounts in SAR) - Calculated by backend and stored permanently
    total_price DECIMAL(12,2) NOT NULL,
    rabhan_commission DECIMAL(12,2) NOT NULL,
    rabhan_over_price DECIMAL(12,2) NOT NULL, 
    user_price DECIMAL(12,2) NOT NULL,
    vendor_net_price DECIMAL(12,2) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(quotation_id, serial_number) -- Ensure unique S/N per quotation
);

-- Create indexes for performance
CREATE INDEX idx_quotation_line_items_quotation_id ON quotation_line_items(quotation_id);
CREATE INDEX idx_quotation_line_items_item_name ON quotation_line_items(item_name);

-- Add trigger for updated_at
CREATE TRIGGER update_quotation_line_items_updated_at 
    BEFORE UPDATE ON quotation_line_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Record this migration
INSERT INTO schema_migrations (version) 
VALUES ('002_add_quotation_fields') 
ON CONFLICT (version) DO NOTHING;