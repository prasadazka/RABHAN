-- Document Upload Service Database Schema
-- SAMA CSF Compliant Document Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Document categories and types
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    required_for_role VARCHAR(50) NOT NULL CHECK (required_for_role IN ('customer', 'contractor', 'both')),
    max_file_size_mb INTEGER DEFAULT 10 CHECK (max_file_size_mb > 0 AND max_file_size_mb <= 50),
    allowed_formats TEXT[] DEFAULT ARRAY['pdf', 'jpg', 'jpeg', 'png'],
    retention_years INTEGER DEFAULT 7 CHECK (retention_years >= 1),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document templates for validation
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES document_categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    validation_rules JSONB NOT NULL DEFAULT '{}',
    approval_workflow JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(category_id, name)
);

-- Document status enum
CREATE TYPE document_status AS ENUM ('pending', 'processing', 'validated', 'approved', 'rejected', 'expired', 'archived');

-- Approval status enum
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'under_review');

-- Storage provider enum
CREATE TYPE storage_provider AS ENUM ('minio', 's3', 'local');

-- Main documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES document_categories(id),
    template_id UUID REFERENCES document_templates(id),
    
    -- Document metadata
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    file_extension VARCHAR(10) NOT NULL,
    
    -- Storage information
    storage_provider storage_provider NOT NULL DEFAULT 'minio',
    storage_bucket VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    storage_region VARCHAR(50) DEFAULT 'ksa-central',
    encryption_key_id VARCHAR(100) NOT NULL,
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    
    -- Document status
    status document_status NOT NULL DEFAULT 'pending',
    upload_ip_address INET,
    upload_user_agent TEXT,
    upload_session_id VARCHAR(100),
    
    -- Validation results
    validation_results JSONB DEFAULT '{}',
    validation_score DECIMAL(5,2) DEFAULT 0.0 CHECK (validation_score >= 0.0 AND validation_score <= 100.0),
    validation_completed_at TIMESTAMP WITH TIME ZONE,
    validation_errors TEXT[],
    
    -- OCR and content extraction
    extracted_text TEXT,
    extracted_data JSONB DEFAULT '{}',
    ocr_confidence DECIMAL(5,2) DEFAULT 0.0 CHECK (ocr_confidence >= 0.0 AND ocr_confidence <= 100.0),
    
    -- Approval workflow
    approval_status approval_status DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    rejection_reason TEXT,
    
    -- Document lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- SAMA compliance
    sama_audit_log JSONB NOT NULL DEFAULT '[]',
    access_log JSONB NOT NULL DEFAULT '[]',
    compliance_flags JSONB DEFAULT '{}',
    
    -- Security
    virus_scan_status VARCHAR(20) DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'scanning', 'clean', 'infected', 'suspicious', 'error')),
    virus_scan_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT unique_file_hash UNIQUE (file_hash),
    CONSTRAINT check_file_size CHECK (file_size_bytes <= 52428800), -- 50MB max
    CONSTRAINT check_expiry_date CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Document versions for updates
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    storage_path VARCHAR(500) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    change_reason TEXT,
    
    UNIQUE(document_id, version_number)
);

-- Document access log for SAMA compliance
CREATE TABLE document_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('view', 'download', 'update', 'delete', 'approve', 'reject')),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    failure_reason TEXT,
    access_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- SAMA audit requirements
    sama_event_id VARCHAR(100),
    sama_compliance_flags JSONB DEFAULT '{}',
    
    -- Retention policy
    retention_until DATE DEFAULT (CURRENT_DATE + INTERVAL '7 years')
);

-- Approval workflow instances
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workflow_definition JSONB NOT NULL DEFAULT '{}',
    current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step > 0),
    total_steps INTEGER NOT NULL DEFAULT 1 CHECK (total_steps > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'rejected', 'cancelled')),
    assigned_to UUID[],
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit trail
    step_history JSONB NOT NULL DEFAULT '[]',
    sama_compliance_log JSONB NOT NULL DEFAULT '[]',
    
    CONSTRAINT check_current_step CHECK (current_step <= total_steps)
);

-- Document tags for categorization
CREATE TABLE document_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_value VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    UNIQUE(document_id, tag_name)
);

-- Virus scan results
CREATE TABLE virus_scan_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    scanner_name VARCHAR(50) NOT NULL,
    scan_result VARCHAR(50) NOT NULL CHECK (scan_result IN ('clean', 'infected', 'suspicious', 'error', 'timeout')),
    threat_names TEXT[],
    scan_duration_ms INTEGER,
    scanner_version VARCHAR(50),
    signature_version VARCHAR(50),
    scan_details JSONB DEFAULT '{}',
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- SAMA security event logging
    sama_security_event_id VARCHAR(100),
    sama_notification_sent BOOLEAN DEFAULT FALSE,
    sama_notification_sent_at TIMESTAMP WITH TIME ZONE
);

-- SAMA audit events table
CREATE TABLE sama_audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL CHECK (event_category IN ('SECURITY', 'COMPLIANCE', 'BUSINESS', 'OPERATIONAL')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Event details
    user_id UUID,
    document_id UUID,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Event data
    event_data JSONB NOT NULL DEFAULT '{}',
    correlation_id VARCHAR(100),
    request_id VARCHAR(100),
    
    -- SAMA compliance
    sama_control_reference VARCHAR(50),
    compliance_status VARCHAR(50) NOT NULL DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'violation', 'exception')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    retention_until DATE DEFAULT (CURRENT_DATE + INTERVAL '7 years'),
    
    -- Notification tracking
    sama_notification_required BOOLEAN DEFAULT FALSE,
    sama_notification_sent BOOLEAN DEFAULT FALSE,
    sama_notification_sent_at TIMESTAMP WITH TIME ZONE
);

-- Performance indexes
CREATE INDEX CONCURRENTLY idx_documents_user_id_status ON documents(user_id, status);
CREATE INDEX CONCURRENTLY idx_documents_category_id_created_at ON documents(category_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_documents_approval_status ON documents(approval_status) WHERE approval_status = 'pending';
CREATE INDEX CONCURRENTLY idx_documents_expires_at ON documents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_documents_status_created_at ON documents(status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_documents_file_hash ON documents(file_hash);
CREATE INDEX CONCURRENTLY idx_documents_virus_scan_status ON documents(virus_scan_status) WHERE virus_scan_status IN ('pending', 'scanning');

-- SAMA compliance indexes
CREATE INDEX CONCURRENTLY idx_document_access_log_created_at ON document_access_log(created_at DESC);
CREATE INDEX CONCURRENTLY idx_document_access_log_user_id ON document_access_log(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_document_access_log_document_id ON document_access_log(document_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_documents_sama_audit ON documents USING GIN(sama_audit_log);

-- Security indexes
CREATE INDEX CONCURRENTLY idx_virus_scan_results_document_id ON virus_scan_results(document_id, scanned_at DESC);
CREATE INDEX CONCURRENTLY idx_sama_audit_events_created_at ON sama_audit_events(created_at DESC);
CREATE INDEX CONCURRENTLY idx_sama_audit_events_event_type ON sama_audit_events(event_type, created_at DESC);
CREATE INDEX CONCURRENTLY idx_sama_audit_events_severity ON sama_audit_events(severity, created_at DESC);
CREATE INDEX CONCURRENTLY idx_sama_audit_events_user_id ON sama_audit_events(user_id, created_at DESC);

-- Workflow indexes
CREATE INDEX CONCURRENTLY idx_approval_workflows_document_id ON approval_workflows(document_id);
CREATE INDEX CONCURRENTLY idx_approval_workflows_status ON approval_workflows(status) WHERE status = 'active';

-- Document versions indexes
CREATE INDEX CONCURRENTLY idx_document_versions_document_id ON document_versions(document_id, version_number DESC);

-- Document tags indexes
CREATE INDEX CONCURRENTLY idx_document_tags_document_id ON document_tags(document_id);
CREATE INDEX CONCURRENTLY idx_document_tags_tag_name ON document_tags(tag_name);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON document_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default document categories
INSERT INTO document_categories (name, description, required_for_role, max_file_size_mb, allowed_formats) VALUES
-- Customer KYC documents
('national_id', 'Saudi National ID (front and back)', 'customer', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
('passport', 'Valid passport', 'customer', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
('salary_certificate', 'Salary certificate from employer', 'customer', 10, ARRAY['pdf']),
('bank_statement', 'Bank statement (last 3 months)', 'customer', 10, ARRAY['pdf']),
('employment_contract', 'Employment contract', 'customer', 10, ARRAY['pdf']),
('income_proof', 'Proof of income', 'customer', 10, ARRAY['pdf']),

-- Contractor business documents
('commercial_registration', 'Commercial Registration Certificate', 'contractor', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
('vat_certificate', 'VAT Registration Certificate', 'contractor', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
('municipal_license', 'Municipal License', 'contractor', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
('chamber_membership', 'Chamber of Commerce Membership', 'contractor', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
('insurance_certificate', 'Professional Insurance Certificate', 'contractor', 10, ARRAY['pdf']),
('tax_clearance', 'Tax Clearance Certificate', 'contractor', 10, ARRAY['pdf']),
('bank_account_proof', 'Bank account proof (IBAN certificate)', 'contractor', 10, ARRAY['pdf']),

-- Common documents
('power_of_attorney', 'Power of Attorney', 'both', 10, ARRAY['pdf']),
('agreement', 'Service Agreement', 'both', 10, ARRAY['pdf']),
('invoice', 'Invoice', 'both', 10, ARRAY['pdf']);

-- Create default templates
INSERT INTO document_templates (category_id, name, description, validation_rules, approval_workflow) 
SELECT 
    id,
    name || '_template',
    'Default template for ' || description,
    jsonb_build_object(
        'required_fields', ARRAY['document_number', 'issue_date', 'expiry_date'],
        'ocr_enabled', true,
        'min_confidence', 0.8
    ),
    jsonb_build_object(
        'steps', ARRAY[
            jsonb_build_object(
                'step', 1,
                'name', 'Document Validation',
                'type', 'automatic',
                'timeout_hours', 1
            ),
            jsonb_build_object(
                'step', 2,
                'name', 'Admin Review',
                'type', 'manual',
                'required_role', 'admin',
                'timeout_hours', 24
            )
        ]
    )
FROM document_categories;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_document_categories_role ON document_categories(required_for_role);
CREATE INDEX CONCURRENTLY idx_document_templates_category_id ON document_templates(category_id);
CREATE INDEX CONCURRENTLY idx_document_templates_active ON document_templates(is_active) WHERE is_active = true;