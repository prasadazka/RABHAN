-- Create contractor quote assignments table
CREATE TABLE IF NOT EXISTS contractor_quote_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'viewed', 'accepted', 'rejected', 'quote_submitted')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    response_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one assignment per contractor per request
    CONSTRAINT unique_contractor_request UNIQUE (request_id, contractor_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contractor_assignments_contractor_id ON contractor_quote_assignments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_assignments_request_id ON contractor_quote_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_contractor_assignments_status ON contractor_quote_assignments(status);

-- Add comments
COMMENT ON TABLE contractor_quote_assignments IS 'Tracks which contractors have been assigned to quote requests and their response status';
COMMENT ON COLUMN contractor_quote_assignments.status IS 'Tracks contractor progress: assigned -> viewed -> accepted/rejected -> quote_submitted';