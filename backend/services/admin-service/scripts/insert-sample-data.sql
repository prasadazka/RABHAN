-- Insert sample KYC approval data for testing dashboard
-- This represents users and contractors that have been processed through KYC

-- Insert some approved users
INSERT INTO kyc_approvals (
    subject_id,
    subject_type,
    admin_id,
    admin_name,
    action,
    decision_reason,
    previous_status,
    new_status,
    review_notes,
    sama_risk_category,
    region,
    city,
    cached_subject_data
) VALUES 
-- Approved Users
(uuid_generate_v4(), 'USER', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'APPROVED', 'All documents verified successfully', 'PENDING', 'APPROVED', 'Customer passed all KYC checks with high confidence', 'LOW', 'riyadh', 'Riyadh', '{"name": "Ahmed Mohammed Al-Ali", "email": "ahmed.ali@example.com", "phone": "+966501234567"}'),
(uuid_generate_v4(), 'USER', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'APPROVED', 'Identity verification completed', 'PENDING', 'APPROVED', 'Standard KYC approval', 'LOW', 'jeddah', 'Jeddah', '{"name": "Fatima Hassan Al-Zahrani", "email": "fatima.zahrani@example.com", "phone": "+966502345678"}'),
(uuid_generate_v4(), 'USER', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'APPROVED', 'All compliance checks passed', 'PENDING', 'APPROVED', 'Low risk customer approved', 'LOW', 'dammam', 'Dammam', '{"name": "Mohammed Abdullah Al-Rashid", "email": "mohammed.rashid@example.com", "phone": "+966503456789"}'),
(uuid_generate_v4(), 'USER', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'REJECTED', 'Incomplete documentation', 'PENDING', 'REJECTED', 'Missing required identity documents', 'MEDIUM', 'riyadh', 'Riyadh', '{"name": "Sara Ali Al-Mansouri", "email": "sara.mansouri@example.com", "phone": "+966504567890"}'),
(uuid_generate_v4(), 'USER', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'APPROVED', 'KYC verification successful', 'PENDING', 'APPROVED', 'Customer approved for solar BNPL', 'LOW', 'mecca', 'Mecca', '{"name": "Omar Khalid Al-Otaibi", "email": "omar.otaibi@example.com", "phone": "+966505678901"}'),

-- Approved Contractors
(uuid_generate_v4(), 'CONTRACTOR', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'APPROVED', 'License and certifications verified', 'PENDING', 'APPROVED', 'Solar installation company with valid certifications', 'LOW', 'riyadh', 'Riyadh', '{"company_name": "Renewable Energy Solutions", "license": "REC-2024-001", "rating": 4.8}'),
(uuid_generate_v4(), 'CONTRACTOR', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'APPROVED', 'Technical certification confirmed', 'PENDING', 'APPROVED', 'Experienced solar contractor approved', 'LOW', 'jeddah', 'Jeddah', '{"company_name": "Green Solar Technologies", "license": "GST-2024-002", "rating": 4.5}'),
(uuid_generate_v4(), 'CONTRACTOR', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'APPROVED', 'All regulatory requirements met', 'PENDING', 'APPROVED', 'Contractor meets SAMA compliance standards', 'LOW', 'dammam', 'Dammam', '{"company_name": "Al-Noor Solar Company", "license": "ANS-2024-003", "rating": 4.2}'),
(uuid_generate_v4(), 'CONTRACTOR', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'REJECTED', 'Invalid license documentation', 'PENDING', 'REJECTED', 'License verification failed', 'HIGH', 'riyadh', 'Riyadh', '{"company_name": "Quick Solar Install", "license": "INVALID", "rating": 2.1}'),

-- Pending approvals (for dashboard metrics)
(uuid_generate_v4(), 'USER', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'REQUESTED_REVIEW', 'Additional documentation requested', 'SUBMITTED', 'UNDER_REVIEW', 'Waiting for additional identity documents', 'MEDIUM', 'riyadh', 'Riyadh', '{"name": "Pending Customer 1", "email": "pending1@example.com", "phone": "+966506789012"}'),
(uuid_generate_v4(), 'USER', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'REQUESTED_DOCUMENTS', 'Income verification needed', 'SUBMITTED', 'PENDING', 'Pending income verification documents', 'MEDIUM', 'jeddah', 'Jeddah', '{"name": "Pending Customer 2", "email": "pending2@example.com", "phone": "+966507890123"}'),
(uuid_generate_v4(), 'CONTRACTOR', (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'System Administrator', 'REQUESTED_REVIEW', 'Technical certification review required', 'SUBMITTED', 'UNDER_REVIEW', 'Technical team reviewing certifications', 'MEDIUM', 'dammam', 'Dammam', '{"company_name": "Pending Solar Co", "license": "PSC-2024-004", "rating": 3.8}');

-- Update created_at timestamps to show recent activity
UPDATE kyc_approvals SET created_at = CURRENT_TIMESTAMP - INTERVAL '2 hours' WHERE action = 'APPROVED' AND subject_type = 'USER' AND decision_reason = 'All documents verified successfully';
UPDATE kyc_approvals SET created_at = CURRENT_TIMESTAMP - INTERVAL '4 hours' WHERE action = 'APPROVED' AND subject_type = 'CONTRACTOR' AND decision_reason = 'License and certifications verified';
UPDATE kyc_approvals SET created_at = CURRENT_TIMESTAMP - INTERVAL '6 hours' WHERE action = 'APPROVED' AND subject_type = 'USER' AND decision_reason = 'Identity verification completed';

-- Insert some audit logs for compliance tracking
INSERT INTO sama_audit_logs (
    event_id,
    admin_id,
    admin_email,
    admin_role,
    event_type,
    event_category,
    event_action,
    subject_type,
    subject_id,
    sama_regulation_reference,
    integrity_hash,
    risk_level
) VALUES 
('KYC_001_' || extract(epoch from now()), (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'admin@rabhan.sa', 'SUPER_ADMIN', 'KYC_APPROVAL', 'COMPLIANCE', 'USER_APPROVED', 'USER', (SELECT subject_id FROM kyc_approvals WHERE subject_type = 'USER' AND action = 'APPROVED' LIMIT 1), 'SAMA_AML_001', sha256('audit_entry_1'::bytea)::text, 'LOW'),
('KYC_002_' || extract(epoch from now()), (SELECT id FROM admin_users WHERE email = 'admin@rabhan.sa'), 'admin@rabhan.sa', 'SUPER_ADMIN', 'KYC_APPROVAL', 'COMPLIANCE', 'CONTRACTOR_APPROVED', 'CONTRACTOR', (SELECT subject_id FROM kyc_approvals WHERE subject_type = 'CONTRACTOR' AND action = 'APPROVED' LIMIT 1), 'SAMA_CSF_3.3.14', sha256('audit_entry_2'::bytea)::text, 'LOW');

SELECT 
    '✅ Sample data inserted successfully!' as status,
    COUNT(*) FILTER (WHERE subject_type = 'USER') as users_inserted,
    COUNT(*) FILTER (WHERE subject_type = 'CONTRACTOR') as contractors_inserted,
    COUNT(*) FILTER (WHERE action = 'APPROVED') as approved_records,
    COUNT(*) FILTER (WHERE new_status IN ('PENDING', 'UNDER_REVIEW')) as pending_records
FROM kyc_approvals;