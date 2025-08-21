-- Quote Management Service Database Schema
-- Version: 1.0.0
-- Description: Complete schema for quote management, wallets, and financial transactions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For GPS location handling

-- Create quote service database if not exists
-- Note: Run this separately as superuser if needed
-- CREATE DATABASE quote_service_db;

-- Set timezone for consistent timestamp handling
SET timezone = 'Asia/Riyadh';

-- ============================================
-- 1. QUOTE REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Property Information
    property_details JSONB NOT NULL DEFAULT '{}',
    electricity_consumption JSONB NOT NULL DEFAULT '{}', -- Monthly consumption data
    system_size_kwp DECIMAL(10,2) NOT NULL CHECK (system_size_kwp > 0),
    
    -- Location Data
    location_gps GEOGRAPHY(POINT, 4326), -- PostGIS point for GPS coordinates
    location_address TEXT,
    roof_size_sqm DECIMAL(10,2) CHECK (roof_size_sqm > 0),
    service_area VARCHAR(100),
    
    -- Request Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'contractors_selected', 'quotes_received', 
                         'quote_selected', 'completed', 'cancelled')),
    
    -- Inspection Management
    inspection_dates JSONB DEFAULT '[]', -- Array of inspection appointments
    selected_contractors UUID[] DEFAULT ARRAY[]::UUID[],
    max_contractors INTEGER DEFAULT 3,
    
    -- User Acknowledgements
    inspection_penalty_acknowledged BOOLEAN DEFAULT FALSE,
    penalty_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

-- ============================================
-- 2. CONTRACTOR QUOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contractor_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL,
    
    -- Pricing Information (all amounts in SAR)
    base_price DECIMAL(12,2) NOT NULL CHECK (base_price > 0),
    price_per_kwp DECIMAL(10,2) NOT NULL CHECK (price_per_kwp > 0),
    overprice_amount DECIMAL(12,2) GENERATED ALWAYS AS (base_price * 0.10) STORED,
    total_user_price DECIMAL(12,2) GENERATED ALWAYS AS (base_price * 1.10) STORED,
    
    -- System Specifications
    system_specs JSONB NOT NULL DEFAULT '{}',
    installation_timeline_days INTEGER NOT NULL CHECK (installation_timeline_days > 0),
    warranty_terms JSONB DEFAULT '{}',
    maintenance_terms JSONB DEFAULT '{}',
    
    -- Hardware Components
    panels_brand VARCHAR(100),
    panels_model VARCHAR(100),
    panels_quantity INTEGER,
    inverter_brand VARCHAR(100),
    inverter_model VARCHAR(100),
    inverter_quantity INTEGER,
    
    -- Admin Review
    admin_status VARCHAR(50) NOT NULL DEFAULT 'pending_review'
        CHECK (admin_status IN ('pending_review', 'approved', 'rejected', 'revision_needed')),
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Quote Status
    is_selected BOOLEAN DEFAULT FALSE,
    selected_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- ============================================
-- 3. INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES contractor_quotes(id) ON DELETE RESTRICT,
    
    -- Invoice Details
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    -- Financial Breakdown (all amounts in SAR)
    gross_amount DECIMAL(12,2) NOT NULL, -- Original + overprice
    overprice_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
    commission_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
    penalty_deduction DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL,
    vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_with_vat DECIMAL(12,2) GENERATED ALWAYS AS (net_amount + vat_amount) STORED,
    
    -- Invoice File
    invoice_file_url TEXT,
    invoice_file_uploaded_at TIMESTAMP WITH TIME ZONE,
    
    -- Payment Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. CONTRACTOR WALLETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contractor_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID UNIQUE NOT NULL,
    
    -- Balance Information (all amounts in SAR)
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    pending_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
    withdrawable_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (withdrawable_balance >= 0),
    
    -- Lifetime Statistics
    total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_commission_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_penalties DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_withdrawn DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Payment Information
    bank_account_details JSONB DEFAULT '{}',
    payment_methods JSONB DEFAULT '[]',
    default_payment_method VARCHAR(50),
    
    -- Wallet Status
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    suspended_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_transaction_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 5. WALLET TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES contractor_wallets(id) ON DELETE RESTRICT,
    
    -- Transaction Details
    transaction_type VARCHAR(50) NOT NULL 
        CHECK (transaction_type IN ('payment', 'commission', 'penalty', 
                                   'withdrawal', 'refund', 'adjustment')),
    transaction_subtype VARCHAR(50), -- down_payment, final_payment, etc.
    
    -- Amount Information (positive for credit, negative for debit)
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    
    -- Reference Information
    reference_id UUID,
    reference_type VARCHAR(50), -- quote, invoice, penalty, withdrawal_request
    reference_number VARCHAR(100),
    
    -- Transaction Status
    status VARCHAR(50) DEFAULT 'completed' 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),
    
    -- Description and Notes
    description TEXT,
    internal_notes TEXT,
    
    -- Balance Tracking
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT
);

-- ============================================
-- 6. PENALTIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS penalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Penalty Target
    quote_id UUID REFERENCES contractor_quotes(id) ON DELETE CASCADE,
    request_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
    
    -- Penalty Details
    penalty_type VARCHAR(50) NOT NULL 
        CHECK (penalty_type IN ('user_cancellation', 'contractor_cancellation', 
                               'installation_delay', 'quality_issue', 'other')),
    
    -- Amount Information (all amounts in SAR)
    penalty_amount DECIMAL(12,2) NOT NULL CHECK (penalty_amount > 0),
    contractor_share DECIMAL(12,2) DEFAULT 0, -- Amount to be paid to contractor
    platform_share DECIMAL(12,2) DEFAULT 0, -- Amount retained by platform
    
    -- Applied To
    applied_to VARCHAR(50) NOT NULL CHECK (applied_to IN ('user', 'contractor', 'both')),
    applied_to_id UUID,
    
    -- Reason and Documentation
    reason TEXT NOT NULL,
    evidence_urls JSONB DEFAULT '[]',
    
    -- Processing Information
    is_processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    wallet_transaction_id UUID REFERENCES wallet_transactions(id),
    
    -- Admin Review
    reviewed_by UUID,
    review_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. PAYMENT SCHEDULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES contractor_quotes(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    
    -- Payment Plan Details (all amounts in SAR)
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
    down_payment_amount DECIMAL(12,2) NOT NULL CHECK (down_payment_amount >= 0),
    down_payment_percentage DECIMAL(5,2),
    financed_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - down_payment_amount) STORED,
    
    -- Installment Information
    installment_months INTEGER CHECK (installment_months IN (6, 12, 18, 24)),
    monthly_amount DECIMAL(12,2),
    total_installments INTEGER,
    
    -- Payment Progress
    payments_completed INTEGER DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_remaining DECIMAL(12,2),
    
    -- Payment Dates
    first_payment_date DATE,
    next_payment_date DATE,
    last_payment_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'completed', 'defaulted', 'cancelled')),
    
    -- Late Payment Information
    days_overdue INTEGER DEFAULT 0,
    overdue_amount DECIMAL(12,2) DEFAULT 0,
    late_fees DECIMAL(12,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 8. QUOTE COMPARISONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quote_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Comparison Data
    compared_quotes UUID[] NOT NULL,
    comparison_criteria JSONB DEFAULT '{}',
    
    -- Selection
    selected_quote_id UUID REFERENCES contractor_quotes(id),
    selection_reason TEXT,
    
    -- User Interaction
    views_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    time_to_decision INTERVAL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. BUSINESS CONFIGURATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default business configuration
INSERT INTO business_config (config_key, config_value, description) VALUES
    ('pricing_rules', '{"max_price_per_kwp": 2000, "platform_overprice_percent": 10, "platform_commission_percent": 15}', 'Pricing configuration'),
    ('penalty_rules', '{"user_cancellation_penalty": 500, "contractor_penalty_percent": 50, "installation_delay_penalty_per_day": 100}', 'Penalty configuration'),
    ('payment_rules', '{"min_down_payment_percent": 20, "max_installment_months": 24, "vat_rate": 15}', 'Payment configuration'),
    ('quote_rules', '{"max_contractors_per_request": 3, "quote_validity_days": 30, "min_inspection_notice_hours": 24}', 'Quote request configuration')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Quote Requests Indexes
CREATE INDEX idx_quote_requests_user_id ON quote_requests(user_id);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_created_at ON quote_requests(created_at DESC);
CREATE INDEX idx_quote_requests_location ON quote_requests USING GIST(location_gps);

-- Contractor Quotes Indexes
CREATE INDEX idx_contractor_quotes_request_id ON contractor_quotes(request_id);
CREATE INDEX idx_contractor_quotes_contractor_id ON contractor_quotes(contractor_id);
CREATE INDEX idx_contractor_quotes_admin_status ON contractor_quotes(admin_status);
CREATE INDEX idx_contractor_quotes_is_selected ON contractor_quotes(is_selected);
CREATE INDEX idx_contractor_quotes_created_at ON contractor_quotes(created_at DESC);

-- Invoices Indexes
CREATE INDEX idx_invoices_quote_id ON invoices(quote_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- Wallet Transactions Indexes
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_id, reference_type);

-- Penalties Indexes
CREATE INDEX idx_penalties_quote_id ON penalties(quote_id);
CREATE INDEX idx_penalties_request_id ON penalties(request_id);
CREATE INDEX idx_penalties_applied_to ON penalties(applied_to, applied_to_id);
CREATE INDEX idx_penalties_is_processed ON penalties(is_processed);

-- Payment Schedules Indexes
CREATE INDEX idx_payment_schedules_quote_id ON payment_schedules(quote_id);
CREATE INDEX idx_payment_schedules_user_id ON payment_schedules(user_id);
CREATE INDEX idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX idx_payment_schedules_next_payment ON payment_schedules(next_payment_date);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_quote_requests_updated_at BEFORE UPDATE ON quote_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_quotes_updated_at BEFORE UPDATE ON contractor_quotes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_wallets_updated_at BEFORE UPDATE ON contractor_wallets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_penalties_updated_at BEFORE UPDATE ON penalties 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_schedules_updated_at BEFORE UPDATE ON payment_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_comparisons_updated_at BEFORE UPDATE ON quote_comparisons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================

-- Function to calculate contractor net payment
CREATE OR REPLACE FUNCTION calculate_contractor_payment(
    p_base_price DECIMAL,
    p_commission_percent DECIMAL DEFAULT 15,
    p_penalties DECIMAL DEFAULT 0
) RETURNS DECIMAL AS $$
BEGIN
    RETURN p_base_price - (p_base_price * p_commission_percent / 100) - p_penalties;
END;
$$ LANGUAGE plpgsql;

-- Function to update wallet balance after transaction
CREATE OR REPLACE FUNCTION update_wallet_balance() 
RETURNS TRIGGER AS $$
BEGIN
    UPDATE contractor_wallets 
    SET 
        current_balance = NEW.balance_after,
        last_transaction_at = NEW.created_at,
        total_earned = CASE 
            WHEN NEW.transaction_type = 'payment' AND NEW.amount > 0 
            THEN total_earned + NEW.amount 
            ELSE total_earned 
        END,
        total_commission_paid = CASE 
            WHEN NEW.transaction_type = 'commission' AND NEW.amount < 0 
            THEN total_commission_paid + ABS(NEW.amount) 
            ELSE total_commission_paid 
        END,
        total_penalties = CASE 
            WHEN NEW.transaction_type = 'penalty' AND NEW.amount < 0 
            THEN total_penalties + ABS(NEW.amount) 
            ELSE total_penalties 
        END,
        total_withdrawn = CASE 
            WHEN NEW.transaction_type = 'withdrawal' AND NEW.amount < 0 
            THEN total_withdrawn + ABS(NEW.amount) 
            ELSE total_withdrawn 
        END
    WHERE id = NEW.wallet_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_balance 
    AFTER INSERT ON wallet_transactions 
    FOR EACH ROW 
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_wallet_balance();

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View for contractor performance
CREATE OR REPLACE VIEW contractor_performance AS
SELECT 
    cq.contractor_id,
    COUNT(DISTINCT cq.request_id) as total_quotes,
    COUNT(DISTINCT CASE WHEN cq.is_selected THEN cq.id END) as won_quotes,
    AVG(cq.price_per_kwp) as avg_price_per_kwp,
    AVG(cq.installation_timeline_days) as avg_timeline_days,
    SUM(CASE WHEN cq.admin_status = 'approved' THEN 1 ELSE 0 END) as approved_quotes,
    SUM(CASE WHEN cq.admin_status = 'rejected' THEN 1 ELSE 0 END) as rejected_quotes
FROM contractor_quotes cq
GROUP BY cq.contractor_id;

-- View for financial summary
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) as total_payments,
    SUM(CASE WHEN transaction_type = 'commission' THEN ABS(amount) ELSE 0 END) as total_commission,
    SUM(CASE WHEN transaction_type = 'penalty' THEN ABS(amount) ELSE 0 END) as total_penalties,
    COUNT(*) as transaction_count
FROM wallet_transactions
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', created_at);

-- ============================================
-- MIGRATION COMPLETION
-- ============================================

-- Create migration tracking table if not exists
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Record this migration
INSERT INTO schema_migrations (version) 
VALUES ('001_create_quote_tables') 
ON CONFLICT (version) DO NOTHING;

-- Grant appropriate permissions (adjust as needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO quote_service_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO quote_service_user;
-- GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO quote_service_user;