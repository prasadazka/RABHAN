-- Create contractors table for contractor-specific registration data
-- This table stores business information for users with role 'CONTRACTOR'

CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Business Information
    company_name VARCHAR(255) NOT NULL,
    cr_number VARCHAR(50), -- Commercial Registration number (optional)
    vat_number VARCHAR(20), -- VAT registration number (optional)
    business_type VARCHAR(50) DEFAULT 'llc', -- llc, corporation, individual, etc.
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT contractors_company_name_not_empty CHECK (LENGTH(TRIM(company_name)) > 0),
    CONSTRAINT contractors_user_id_unique UNIQUE (user_id)
);

-- Create indexes for performance
CREATE INDEX idx_contractors_user_id ON contractors(user_id);
CREATE INDEX idx_contractors_company_name ON contractors(company_name);
CREATE INDEX idx_contractors_cr_number ON contractors(cr_number) WHERE cr_number IS NOT NULL;
CREATE INDEX idx_contractors_created_at ON contractors(created_at DESC);

-- Apply update trigger for updated_at
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Role constraint will be enforced at application level
-- PostgreSQL doesn't allow subqueries in CHECK constraints