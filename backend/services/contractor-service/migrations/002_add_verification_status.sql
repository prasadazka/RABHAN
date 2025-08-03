-- Add verification status to contractors table
-- This mirrors the user verification system

-- Add verification_status column if it doesn't exist
DO $$ 
BEGIN
    -- Check if verification_status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contractors' 
        AND column_name = 'verification_status'
    ) THEN
        -- Add verification_status column
        ALTER TABLE contractors 
        ADD COLUMN verification_status VARCHAR(20) DEFAULT 'not_verified' 
        CHECK (verification_status IN ('not_verified', 'pending', 'verified', 'rejected'));
        
        -- Add index for performance
        CREATE INDEX idx_contractors_verification_status ON contractors(verification_status);
        
        -- Log the addition
        RAISE NOTICE 'Added verification_status column to contractors table';
    ELSE
        RAISE NOTICE 'verification_status column already exists in contractors table';
    END IF;
END $$;

-- Update existing contractors to have proper verification status based on their current status
UPDATE contractors 
SET verification_status = CASE 
    WHEN status = 'verified' OR status = 'active' THEN 'verified'
    WHEN status = 'verification' OR status = 'pending' THEN 'pending'
    WHEN status = 'rejected' THEN 'rejected'
    ELSE 'not_verified'
END
WHERE verification_status = 'not_verified';

-- Add comment to document the field
COMMENT ON COLUMN contractors.verification_status IS 'Contractor verification status: not_verified (incomplete profile/docs), pending (awaiting admin review), verified (approved), rejected (denied)';

-- Create function to calculate contractor verification status
-- This mirrors the user verification calculation
CREATE OR REPLACE FUNCTION calculate_contractor_verification_status(contractor_uuid UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    profile_completion INTEGER;
    document_completion INTEGER;
    result_status VARCHAR(20);
BEGIN
    -- Calculate profile completion percentage
    -- This is a simplified version - in practice, you'd check all required fields
    SELECT 
        CASE 
            WHEN business_name IS NOT NULL 
                AND business_type IS NOT NULL 
                AND email IS NOT NULL 
                AND phone IS NOT NULL 
                AND address_line1 IS NOT NULL 
                AND city IS NOT NULL 
                AND region IS NOT NULL 
                AND service_categories IS NOT NULL 
                AND array_length(service_categories, 1) > 0
            THEN 100
            ELSE 50
        END INTO profile_completion
    FROM contractors 
    WHERE id = contractor_uuid;
    
    -- For MVP: Set document completion to 0 (will be updated when document service integration is complete)
    document_completion := 0;
    
    -- Determine verification status
    IF profile_completion >= 80 AND document_completion >= 100 THEN
        result_status := 'verified';
    ELSIF profile_completion >= 80 AND document_completion >= 50 THEN
        result_status := 'pending';
    ELSIF profile_completion >= 80 THEN
        result_status := 'not_verified';
    ELSE
        result_status := 'not_verified';
    END IF;
    
    RETURN result_status;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update verification status when contractor profile changes
CREATE OR REPLACE FUNCTION update_contractor_verification_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update verification_status if profile fields changed
    IF TG_OP = 'UPDATE' AND (
        OLD.business_name IS DISTINCT FROM NEW.business_name OR
        OLD.business_type IS DISTINCT FROM NEW.business_type OR
        OLD.email IS DISTINCT FROM NEW.email OR
        OLD.phone IS DISTINCT FROM NEW.phone OR
        OLD.address_line1 IS DISTINCT FROM NEW.address_line1 OR
        OLD.city IS DISTINCT FROM NEW.city OR
        OLD.region IS DISTINCT FROM NEW.region OR
        OLD.service_categories IS DISTINCT FROM NEW.service_categories
    ) THEN
        NEW.verification_status := calculate_contractor_verification_status(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'contractor_verification_update_trigger'
    ) THEN
        CREATE TRIGGER contractor_verification_update_trigger
            BEFORE UPDATE ON contractors
            FOR EACH ROW
            EXECUTE FUNCTION update_contractor_verification_trigger();
        
        RAISE NOTICE 'Created contractor verification update trigger';
    ELSE
        RAISE NOTICE 'Contractor verification update trigger already exists';
    END IF;
END $$;

-- Update verification_level based on verification_status for consistency
UPDATE contractors 
SET verification_level = CASE 
    WHEN verification_status = 'verified' THEN 5
    WHEN verification_status = 'pending' THEN 3
    WHEN verification_status = 'rejected' THEN 1
    ELSE 0
END;

-- Add some initial contractor document categories
-- These should match the document service categories
INSERT INTO contractor_business_documents (
    id, contractor_id, document_type, document_name, verification_status
) 
SELECT 
    uuid_generate_v4(),
    c.id,
    'profile_completion',
    'Business Profile Completion',
    CASE 
        WHEN c.verification_status = 'verified' THEN 'approved'
        WHEN c.verification_status = 'pending' THEN 'pending'
        ELSE 'pending'
    END
FROM contractors c
WHERE NOT EXISTS (
    SELECT 1 FROM contractor_business_documents 
    WHERE contractor_id = c.id AND document_type = 'profile_completion'
)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contractors_verification_user_id ON contractors(user_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_contractors_verification_status_created ON contractors(verification_status, created_at DESC);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Contractor verification status migration completed successfully';
    RAISE NOTICE 'Updated % contractors with verification status', (SELECT COUNT(*) FROM contractors);
END $$;