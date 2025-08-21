-- RABHAN Quote Service - Penalty Management Tables
-- This script creates the database tables for penalty management system

-- Penalty Rules Configuration Table
-- Defines the rules and calculations for different types of penalties
CREATE TABLE IF NOT EXISTS penalty_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    penalty_type VARCHAR(50) NOT NULL CHECK (penalty_type IN (
        'late_installation', 'quality_issue', 'communication_failure', 
        'documentation_issue', 'custom'
    )),
    description TEXT NOT NULL,
    amount_calculation VARCHAR(20) NOT NULL CHECK (amount_calculation IN ('fixed', 'percentage', 'daily')),
    amount_value DECIMAL(10,2) NOT NULL CHECK (amount_value >= 0),
    maximum_amount DECIMAL(10,2) CHECK (maximum_amount >= 0),
    grace_period_hours INTEGER DEFAULT 0 CHECK (grace_period_hours >= 0),
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('minor', 'moderate', 'major', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Penalty Instances Table
-- Tracks individual penalty applications to contractors
CREATE TABLE IF NOT EXISTS penalty_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL,
    quote_id UUID NOT NULL,
    penalty_rule_id UUID NOT NULL REFERENCES penalty_rules(id),
    penalty_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'applied', 'disputed', 'waived', 'reversed'
    )),
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by VARCHAR(255),
    dispute_reason TEXT,
    resolution_notes TEXT,
    evidence JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_penalty_contractor FOREIGN KEY (contractor_id) 
        REFERENCES contractor_wallets(contractor_id),
    CONSTRAINT fk_penalty_quote FOREIGN KEY (quote_id) 
        REFERENCES contractor_quotes(id)
);

-- SLA Violations Log Table
-- Tracks detected SLA violations for audit and analysis
CREATE TABLE IF NOT EXISTS sla_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    contractor_id UUID NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    violation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    days_overdue INTEGER,
    severity_level VARCHAR(20) NOT NULL,
    auto_detected BOOLEAN DEFAULT false,
    penalty_applied BOOLEAN DEFAULT false,
    penalty_instance_id UUID REFERENCES penalty_instances(id),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_violation_contractor FOREIGN KEY (contractor_id) 
        REFERENCES contractor_wallets(contractor_id),
    CONSTRAINT fk_violation_quote FOREIGN KEY (quote_id) 
        REFERENCES contractor_quotes(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_penalty_instances_contractor_id ON penalty_instances(contractor_id);
CREATE INDEX IF NOT EXISTS idx_penalty_instances_quote_id ON penalty_instances(quote_id);
CREATE INDEX IF NOT EXISTS idx_penalty_instances_status ON penalty_instances(status);
CREATE INDEX IF NOT EXISTS idx_penalty_instances_penalty_type ON penalty_instances(penalty_type);
CREATE INDEX IF NOT EXISTS idx_penalty_instances_created_at ON penalty_instances(created_at);

CREATE INDEX IF NOT EXISTS idx_sla_violations_contractor_id ON sla_violations(contractor_id);
CREATE INDEX IF NOT EXISTS idx_sla_violations_quote_id ON sla_violations(quote_id);
CREATE INDEX IF NOT EXISTS idx_sla_violations_violation_type ON sla_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_sla_violations_detected_at ON sla_violations(detected_at);

CREATE INDEX IF NOT EXISTS idx_penalty_rules_penalty_type ON penalty_rules(penalty_type);
CREATE INDEX IF NOT EXISTS idx_penalty_rules_is_active ON penalty_rules(is_active);

-- Insert default penalty rules
INSERT INTO penalty_rules (penalty_type, description, amount_calculation, amount_value, maximum_amount, severity_level, is_active) 
VALUES 
    (
        'late_installation',
        'Penalty for installations that exceed the agreed timeline',
        'daily',
        100.00,
        2000.00,
        'moderate',
        true
    ),
    (
        'late_installation',
        'Major penalty for severely delayed installations (over 14 days)',
        'percentage',
        5.00,
        5000.00,
        'major',
        true
    ),
    (
        'quality_issue',
        'Penalty for poor workmanship or component failures within warranty period',
        'percentage',
        10.00,
        10000.00,
        'major',
        true
    ),
    (
        'communication_failure',
        'Penalty for not responding to customer inquiries within 24 hours',
        'fixed',
        250.00,
        NULL,
        'minor',
        true
    ),
    (
        'documentation_issue',
        'Penalty for missing or incorrect installation documentation',
        'fixed',
        500.00,
        NULL,
        'moderate',
        true
    )
ON CONFLICT (penalty_type, severity_level) DO NOTHING;

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_penalty_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER penalty_rules_updated_at
    BEFORE UPDATE ON penalty_rules
    FOR EACH ROW EXECUTE FUNCTION update_penalty_updated_at();

CREATE TRIGGER penalty_instances_updated_at
    BEFORE UPDATE ON penalty_instances
    FOR EACH ROW EXECUTE FUNCTION update_penalty_updated_at();

-- Add penalty tracking to contractor wallets (if column doesn't exist)
ALTER TABLE contractor_wallets 
ADD COLUMN IF NOT EXISTS total_penalties DECIMAL(15,2) DEFAULT 0 CHECK (total_penalties >= 0);

-- Add penalty amount to wallet transactions reference
-- (This links wallet transactions to penalty instances)
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS penalty_instance_id UUID REFERENCES penalty_instances(id);

COMMENT ON TABLE penalty_rules IS 'Configuration for different types of penalties and their calculation methods';
COMMENT ON TABLE penalty_instances IS 'Individual penalty applications to contractors with their status and resolution';
COMMENT ON TABLE sla_violations IS 'Log of detected SLA violations for audit and automated penalty processing';

COMMENT ON COLUMN penalty_rules.amount_calculation IS 'How to calculate penalty: fixed (flat amount), percentage (% of quote), daily (per day overdue)';
COMMENT ON COLUMN penalty_rules.grace_period_hours IS 'Hours before penalty applies (e.g., 24 hours grace for late installation)';
COMMENT ON COLUMN penalty_instances.status IS 'Penalty status: pending (not applied), applied (deducted), disputed (under review), waived (cancelled), reversed (refunded)';
COMMENT ON COLUMN penalty_instances.evidence IS 'JSON data containing evidence for the penalty (photos, documents, etc.)';

-- Sample query to check penalty statistics
-- SELECT 
--     penalty_type,
--     status,
--     COUNT(*) as count,
--     SUM(amount) as total_amount,
--     AVG(amount) as avg_amount
-- FROM penalty_instances 
-- WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY penalty_type, status
-- ORDER BY penalty_type, status;