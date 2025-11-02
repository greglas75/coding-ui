-- Add variants column to codeframe_hierarchy table
-- This column stores brand variants extracted during brand codeframe generation

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT NULL;

COMMENT ON COLUMN codeframe_hierarchy.variants IS 'Brand variants/alternative names (for brand codes only)';
