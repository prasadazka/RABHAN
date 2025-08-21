-- Insert real quote data for testing

-- Insert quote requests
INSERT INTO quote_requests (
  id, user_id, system_size_kwp, location_address, service_area, 
  status, property_details, electricity_consumption, created_at, updated_at
) VALUES (
  '8ac6f9e8-b234-4a7e-9f5d-1234567890ab',
  '123e4567-e89b-12d3-a456-426614174000',
  10.5,
  'Al Riyadh, Saudi Arabia',
  'Riyadh',
  'in_progress',
  '{"type": "residential", "roof_area": 150}',
  '{"monthly": 1200, "yearly": 14400}',
  '2025-08-10T10:00:00Z',
  '2025-08-11T08:30:00Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO quote_requests (
  id, user_id, system_size_kwp, location_address, service_area,
  status, property_details, electricity_consumption, created_at, updated_at
) VALUES (
  '7bc5e8d7-a123-3b6e-8e4d-0987654321ba',
  '123e4567-e89b-12d3-a456-426614174000',
  8.0,
  'Jeddah, Saudi Arabia',
  'Jeddah',
  'pending',
  '{"type": "residential", "roof_area": 120}',
  '{"monthly": 950, "yearly": 11400}',
  '2025-08-09T14:30:00Z',
  '2025-08-09T14:30:00Z'
) ON CONFLICT (id) DO NOTHING;

-- Insert contractor assignments
INSERT INTO contractor_quote_assignments (
  request_id, contractor_id, status, assigned_at, viewed_at, responded_at, response_notes
) VALUES (
  '8ac6f9e8-b234-4a7e-9f5d-1234567890ab',
  '48dbdfb7-d07f-4ab0-be26-7ec17568f6fc',
  'accepted',
  '2025-08-10T11:00:00Z',
  '2025-08-10T12:30:00Z',
  '2025-08-11T08:15:00Z',
  'Quote accepted. Ready to proceed with installation. System specifications confirmed.'
) ON CONFLICT (request_id, contractor_id) DO NOTHING;

INSERT INTO contractor_quote_assignments (
  request_id, contractor_id, status, assigned_at, viewed_at
) VALUES (
  '8ac6f9e8-b234-4a7e-9f5d-1234567890ab',
  '9f2e7d5a-c123-4b6e-8f4d-0987654321cd',
  'viewed',
  '2025-08-10T11:00:00Z',
  '2025-08-10T15:45:00Z'
) ON CONFLICT (request_id, contractor_id) DO NOTHING;

-- Insert contractor quotes
INSERT INTO contractor_quotes (
  request_id, contractor_id, base_price, price_per_kwp, 
  installation_timeline_days, system_specs, admin_status, created_at, updated_at
) VALUES (
  '8ac6f9e8-b234-4a7e-9f5d-1234567890ab',
  '48dbdfb7-d07f-4ab0-be26-7ec17568f6fc',
  21000,
  2000,
  30,
  '{"panels_brand": "Suntech", "inverter_brand": "SMA", "warranty_years": 25}',
  'approved',
  '2025-08-10T12:00:00Z',
  '2025-08-10T12:00:00Z'
);

INSERT INTO contractor_quotes (
  request_id, contractor_id, base_price, price_per_kwp, 
  installation_timeline_days, system_specs, admin_status, created_at, updated_at
) VALUES (
  '8ac6f9e8-b234-4a7e-9f5d-1234567890ab',
  '9f2e7d5a-c123-4b6e-8f4d-0987654321cd',
  19500,
  1857,
  28,
  '{"panels_brand": "Canadian Solar", "inverter_brand": "Fronius", "warranty_years": 20}',
  'approved',
  '2025-08-10T14:00:00Z',
  '2025-08-10T14:00:00Z'
);