-- Migration: Add validation_evidence column for brand validation details
-- Description: Stores full Google validation results (search results, images, Knowledge Graph)
-- Date: 2025-10-25

-- Add validation_evidence column to codeframe_hierarchy
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS validation_evidence JSONB;

COMMENT ON COLUMN codeframe_hierarchy.validation_evidence IS 'Full brand validation results from Google (search, images, Knowledge Graph) stored as JSON';

-- Add index for faster queries on validation status
CREATE INDEX IF NOT EXISTS idx_codeframe_hierarchy_validation_evidence
ON codeframe_hierarchy USING gin (validation_evidence);
