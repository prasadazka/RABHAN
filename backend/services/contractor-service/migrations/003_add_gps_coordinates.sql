-- Add GPS coordinates to contractors table for location-based services
-- This enables contractor-user matching and service area mapping

ALTER TABLE contractors 
ADD COLUMN latitude DECIMAL(10, 8),  -- Supports 8 decimal places for high precision
ADD COLUMN longitude DECIMAL(11, 8); -- Supports 8 decimal places for high precision

-- Add index for geospatial queries (future optimization)
CREATE INDEX idx_contractors_location_coordinates ON contractors(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN contractors.latitude IS 'GPS latitude coordinate for contractor location';
COMMENT ON COLUMN contractors.longitude IS 'GPS longitude coordinate for contractor location';

-- Update audit log for this schema change
INSERT INTO contractor_audit_logs (
    event_type,
    event_description,
    performed_by_type,
    regulatory_impact,
    created_at
) VALUES (
    'schema_update',
    'Added GPS coordinates (latitude, longitude) to contractors table for location-based services and SAMA compliance',
    'system',
    true,
    CURRENT_TIMESTAMP
);
