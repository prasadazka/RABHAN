-- RABHAN Contractor Management Service Database Schema
-- SAMA Compliant with Enhanced Security and Audit Trails

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Contractor status enum
CREATE TYPE contractor_status AS ENUM (
    'pending',           -- Initial registration
    'documents_required', -- Needs additional docs
    'verification',      -- Under admin review
    'verified',         -- Approved by admin
    'active',           -- Can receive quotes
    'suspended',        -- Temporarily disabled
    'rejected',         -- Not approved
    'inactive'          -- Voluntarily inactive
);

-- Business type enum
CREATE TYPE business_type AS ENUM (
    'individual',        -- Individual contractor
    'llc',              -- Limited Liability Company
    'corporation',      -- Corporation
    'partnership',      -- Partnership
    'other'             -- Other business type
);

-- Service category enum
CREATE TYPE service_category AS ENUM (
    'residential_solar',     -- Residential solar installations
    'commercial_solar',      -- Commercial solar installations
    'industrial_solar',      -- Industrial solar installations
    'maintenance',           -- Solar system maintenance
    'consultation',          -- Solar consultation services
    'design',               -- Solar system design
    'electrical',           -- Electrical work
    'roofing',              -- Roofing services
    'all'                   -- All solar services
);

-- Certification type enum
CREATE TYPE certification_type AS ENUM (
    'electrical_license',    -- Electrical work license
    'solar_certification',  -- Solar installation certification
    'business_license',      -- Business registration
    'vat_certificate',      -- VAT registration
    'commercial_registration', -- Commercial registration
    'insurance_certificate', -- Insurance certificate
    'safety_certification', -- Safety training certificate
    'other'                 -- Other certifications
);

-- Document verification status
CREATE TYPE verification_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'expired',
    'requires_update'
);

-- Main contractors table
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Links to auth service user
    
    -- Basic Information
    business_name VARCHAR(255) NOT NULL,
    business_name_ar VARCHAR(255),
    business_type business_type NOT NULL DEFAULT 'individual',
    commercial_registration VARCHAR(50),
    vat_number VARCHAR(20),
    
    -- Contact Information
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    website VARCHAR(255),
    
    -- Address Information
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    country VARCHAR(2) DEFAULT 'SA',
    
    -- Business Details
    established_year INTEGER,
    employee_count INTEGER,
    description TEXT,
    description_ar TEXT,
    
    -- Service Information
    service_categories service_category[] DEFAULT '{}',
    service_areas TEXT[], -- Cities/regions they serve
    years_experience INTEGER DEFAULT 0,
    
    -- Status and Verification
    status contractor_status DEFAULT 'pending',
    verification_level INTEGER DEFAULT 0, -- 0-5 verification levels
    admin_verified_at TIMESTAMP WITH TIME ZONE,
    admin_verified_by UUID,
    
    -- Performance Metrics
    total_projects INTEGER DEFAULT 0,
    completed_projects INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    response_time_hours INTEGER, -- Average response time
    
    -- Financial Information (SAMA Compliance)
    bank_account_verified BOOLEAN DEFAULT FALSE,
    tax_clearance_verified BOOLEAN DEFAULT FALSE,
    financial_standing_verified BOOLEAN DEFAULT FALSE,
    
    -- System Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Fields (SAMA Requirement)
    created_by UUID,
    updated_by UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Indexes for performance
    CONSTRAINT contractors_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT contractors_email_unique UNIQUE (email),
    CONSTRAINT contractors_phone_unique UNIQUE (phone)
);

-- Contractor certifications table
CREATE TABLE contractor_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    
    -- Certification Details
    certification_type certification_type NOT NULL,
    certification_name VARCHAR(255) NOT NULL,
    certification_number VARCHAR(100),
    issuing_authority VARCHAR(255) NOT NULL,
    
    -- Dates
    issue_date DATE NOT NULL,
    expiry_date DATE,
    
    -- Document Information
    document_id UUID, -- Links to document service
    document_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    
    -- Verification
    verification_status verification_status DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    verification_notes TEXT,
    
    -- System Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit Fields
    created_by UUID,
    updated_by UUID,
    ip_address INET
);

-- Contractor business documents table
CREATE TABLE contractor_business_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    
    -- Document Details
    document_type VARCHAR(100) NOT NULL, -- 'commercial_registration', 'vat_certificate', etc.
    document_name VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    
    -- Document Information
    document_id UUID, -- Links to document service
    document_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Verification
    verification_status verification_status DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    verification_notes TEXT,
    
    -- Expiry (for documents that expire)
    expiry_date DATE,
    renewal_reminder_sent BOOLEAN DEFAULT FALSE,
    
    -- System Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit Fields
    created_by UUID,
    updated_by UUID,
    ip_address INET
);

-- Contractor service areas table (for geographic service coverage)
CREATE TABLE contractor_service_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    
    -- Location Information
    region VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    districts TEXT[], -- Specific districts/neighborhoods
    
    -- Service Details
    service_categories service_category[] NOT NULL,
    travel_cost DECIMAL(10,2) DEFAULT 0, -- Travel cost for this area
    service_radius_km INTEGER, -- Service radius in kilometers
    
    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    priority_level INTEGER DEFAULT 1, -- 1-5, higher = preferred area
    
    -- System Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contractor reviews and ratings table
CREATE TABLE contractor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL, -- User who left the review
    project_id UUID, -- Optional: specific project
    
    -- Review Details
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,
    
    -- Review Categories
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    
    -- Verification
    verified_customer BOOLEAN DEFAULT FALSE,
    admin_approved BOOLEAN DEFAULT FALSE,
    
    -- Response
    contractor_response TEXT,
    contractor_response_date TIMESTAMP WITH TIME ZONE,
    
    -- System Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit Fields
    ip_address INET,
    user_agent TEXT,
    
    -- Prevent duplicate reviews
    UNIQUE(contractor_id, customer_id, project_id)
);

-- Contractor availability/working hours table
CREATE TABLE contractor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    
    -- Schedule
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
    
    -- Break times
    break_start_time TIME,
    break_end_time TIME,
    
    -- System Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique day per contractor
    UNIQUE(contractor_id, day_of_week)
);

-- SAMA Compliance: Audit logs for contractor actions
CREATE TABLE contractor_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID REFERENCES contractors(id),
    
    -- Event Information
    event_type VARCHAR(100) NOT NULL, -- 'registration', 'verification', 'status_change', etc.
    event_description TEXT NOT NULL,
    event_data JSONB, -- Additional event details
    
    -- User Information
    performed_by UUID, -- Admin or system user who performed action
    performed_by_type VARCHAR(50), -- 'admin', 'system', 'contractor'
    
    -- Request Information
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- SAMA Compliance Fields
    compliance_notes TEXT,
    risk_assessment VARCHAR(50), -- 'low', 'medium', 'high'
    regulatory_impact BOOLEAN DEFAULT FALSE,
    
    -- System Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes for Saudi market scale
CREATE INDEX idx_contractors_status ON contractors(status) WHERE status IN ('active', 'verified');
CREATE INDEX idx_contractors_location ON contractors(region, city) WHERE status = 'active';
CREATE INDEX idx_contractors_service_categories ON contractors USING GIN(service_categories);
CREATE INDEX idx_contractors_created_at ON contractors(created_at DESC);
CREATE INDEX idx_contractors_user_id ON contractors(user_id);

-- Certification indexes
CREATE INDEX idx_certifications_contractor_id ON contractor_certifications(contractor_id);
CREATE INDEX idx_certifications_status ON contractor_certifications(verification_status);
CREATE INDEX idx_certifications_expiry ON contractor_certifications(expiry_date) WHERE expiry_date IS NOT NULL;

-- Business documents indexes
CREATE INDEX idx_business_docs_contractor_id ON contractor_business_documents(contractor_id);
CREATE INDEX idx_business_docs_type ON contractor_business_documents(document_type);
CREATE INDEX idx_business_docs_status ON contractor_business_documents(verification_status);

-- Service areas indexes
CREATE INDEX idx_service_areas_contractor_id ON contractor_service_areas(contractor_id);
CREATE INDEX idx_service_areas_location ON contractor_service_areas(region, city) WHERE is_active = TRUE;
CREATE INDEX idx_service_areas_categories ON contractor_service_areas USING GIN(service_categories);

-- Reviews indexes
CREATE INDEX idx_reviews_contractor_id ON contractor_reviews(contractor_id);
CREATE INDEX idx_reviews_rating ON contractor_reviews(rating);
CREATE INDEX idx_reviews_created_at ON contractor_reviews(created_at DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_contractor_id ON contractor_audit_logs(contractor_id);
CREATE INDEX idx_audit_logs_event_type ON contractor_audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON contractor_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip_address ON contractor_audit_logs(ip_address);

-- Availability indexes
CREATE INDEX idx_availability_contractor_id ON contractor_availability(contractor_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON contractor_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_docs_updated_at BEFORE UPDATE ON contractor_business_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_areas_updated_at BEFORE UPDATE ON contractor_service_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON contractor_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON contractor_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (SAMA Requirement)
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_business_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_availability ENABLE ROW LEVEL SECURITY;

-- Create database user for contractor service
-- This should be run with appropriate database admin privileges
-- CREATE USER contractor_service WITH PASSWORD 'secure_password_here';
-- GRANT CONNECT ON DATABASE rabhan_contractors TO contractor_service;
-- GRANT USAGE ON SCHEMA public TO contractor_service;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO contractor_service;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO contractor_service;