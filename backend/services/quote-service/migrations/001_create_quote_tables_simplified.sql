-- Quote Management Service Database Schema (Simplified)
-- Version: 1.0.1
-- Without PostGIS dependency

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'Asia/Riyadh';

-- 1. Quote Requests Table
CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    property_details JSONB NOT NULL DEFAULT '{}',
    electricity_consumption JSONB NOT NULL DEFAULT '{}',
    system_size_kwp DECIMAL(10,2) NOT NULL CHECK (system_size_kwp > 0),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    location_address TEXT,
    roof_size_sqm DECIMAL(10,2) CHECK (roof_size_sqm > 0),
    service_area VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    inspection_dates JSONB DEFAULT '[]',
    selected_contractors UUID[] DEFAULT ARRAY[]::UUID[],
    max_contractors INTEGER DEFAULT 3,
    inspection_penalty_acknowledged BOOLEAN DEFAULT FALSE,
    penalty_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

-- 2. Contractor Quotes Table
CREATE TABLE IF NOT EXISTS contractor_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL,
    base_price DECIMAL(12,2) NOT NULL CHECK (base_price > 0),
    price_per_kwp DECIMAL(10,2) NOT NULL CHECK (price_per_kwp > 0),
    overprice_amount DECIMAL(12,2) GENERATED ALWAYS AS (base_price * 0.10) STORED,
    total_user_price DECIMAL(12,2) GENERATED ALWAYS AS (base_price * 1.10) STORED,
    system_specs JSONB NOT NULL DEFAULT '{}',
    installation_timeline_days INTEGER NOT NULL CHECK (installation_timeline_days > 0),
    warranty_terms JSONB DEFAULT '{}',
    maintenance_terms JSONB DEFAULT '{}',
    panels_brand VARCHAR(100),
    panels_model VARCHAR(100),
    panels_quantity INTEGER,
    inverter_brand VARCHAR(100),
    inverter_model VARCHAR(100),
    inverter_quantity INTEGER,
    admin_status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    is_selected BOOLEAN DEFAULT FALSE,
    selected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- 3. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES contractor_quotes(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    gross_amount DECIMAL(12,2) NOT NULL,
    overprice_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
    commission_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
    penalty_deduction DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL,
    vat_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_with_vat DECIMAL(12,2) GENERATED ALWAYS AS (net_amount + vat_amount) STORED,
    invoice_file_url TEXT,
    invoice_file_uploaded_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Contractor Wallets Table
CREATE TABLE IF NOT EXISTS contractor_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID UNIQUE NOT NULL,
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    pending_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
    withdrawable_balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (withdrawable_balance >= 0),
    total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_commission_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_penalties DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_withdrawn DECIMAL(12,2) NOT NULL DEFAULT 0,
    bank_account_details JSONB DEFAULT '{}',
    payment_methods JSONB DEFAULT '[]',
    default_payment_method VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    suspended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_transaction_at TIMESTAMP WITH TIME ZONE
);

-- 5. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES contractor_wallets(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(50) NOT NULL,
    transaction_subtype VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SAR',
    reference_id UUID,
    reference_type VARCHAR(50),
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    description TEXT,
    internal_notes TEXT,
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT
);

-- 6. Penalties Table
CREATE TABLE IF NOT EXISTS penalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES contractor_quotes(id) ON DELETE CASCADE,
    request_id UUID REFERENCES quote_requests(id) ON DELETE CASCADE,
    penalty_type VARCHAR(50) NOT NULL,
    penalty_amount DECIMAL(12,2) NOT NULL CHECK (penalty_amount > 0),
    contractor_share DECIMAL(12,2) DEFAULT 0,
    platform_share DECIMAL(12,2) DEFAULT 0,
    applied_to VARCHAR(50) NOT NULL,
    applied_to_id UUID,
    reason TEXT NOT NULL,
    evidence_urls JSONB DEFAULT '[]',
    is_processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    wallet_transaction_id UUID REFERENCES wallet_transactions(id),
    reviewed_by UUID,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Payment Schedules Table
CREATE TABLE IF NOT EXISTS payment_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES contractor_quotes(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
    down_payment_amount DECIMAL(12,2) NOT NULL CHECK (down_payment_amount >= 0),
    down_payment_percentage DECIMAL(5,2),
    financed_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - down_payment_amount) STORED,
    installment_months INTEGER CHECK (installment_months IN (6, 12, 18, 24)),
    monthly_amount DECIMAL(12,2),
    total_installments INTEGER,
    payments_completed INTEGER DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    amount_remaining DECIMAL(12,2),
    first_payment_date DATE,
    next_payment_date DATE,
    last_payment_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    days_overdue INTEGER DEFAULT 0,
    overdue_amount DECIMAL(12,2) DEFAULT 0,
    late_fees DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 8. Quote Comparisons Table
CREATE TABLE IF NOT EXISTS quote_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    compared_quotes UUID[] NOT NULL,
    comparison_criteria JSONB DEFAULT '{}',
    selected_quote_id UUID REFERENCES contractor_quotes(id),
    selection_reason TEXT,
    views_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    time_to_decision INTERVAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Business Configuration Table
CREATE TABLE IF NOT EXISTS business_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quote_requests_user_id ON quote_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_contractor_quotes_request_id ON contractor_quotes(request_id);
CREATE INDEX IF NOT EXISTS idx_contractor_quotes_contractor_id ON contractor_quotes(contractor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_penalties_quote_id ON penalties(quote_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_quote_id ON payment_schedules(quote_id);

-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version) VALUES ('001_create_quote_tables_simplified') ON CONFLICT DO NOTHING;