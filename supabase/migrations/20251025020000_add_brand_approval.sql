-- Migration: Add brand approval status column
-- Description: Adds approval_status column to track human review of AI-validated brands
-- Date: 2025-10-25

-- Add approval_status column to codeframe_hierarchy
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';

-- Add constraint to ensure valid approval status values
ALTER TABLE codeframe_hierarchy
ADD CONSTRAINT chk_approval_status_values
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add index for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_codeframe_hierarchy_approval_status
ON codeframe_hierarchy (approval_status);

-- Add approved_at timestamp
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add approved_by user tracking
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);

COMMENT ON COLUMN codeframe_hierarchy.approval_status IS 'Human review status for AI-validated brands: pending, approved, rejected';
COMMENT ON COLUMN codeframe_hierarchy.approved_at IS 'Timestamp when brand was approved/rejected';
COMMENT ON COLUMN codeframe_hierarchy.approved_by IS 'User who approved/rejected the brand';
