-- =====================================================
-- COMPREHENSIVE SCHEMA AUDIT & FIX
-- For codeframe generation system
-- =====================================================

-- 1. Fix codeframe_hierarchy table
-- Make nullable columns that code doesn't populate
ALTER TABLE codeframe_hierarchy
ALTER COLUMN position DROP NOT NULL;

ALTER TABLE codeframe_hierarchy
ALTER COLUMN code_name DROP NOT NULL;

-- Add node_type if missing
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS node_type VARCHAR(50);

-- Add index for node_type
CREATE INDEX IF NOT EXISTS idx_codeframe_hierarchy_node_type
ON codeframe_hierarchy(node_type);

-- 2. Fix codeframe_generations table
-- Add missing columns
ALTER TABLE codeframe_generations
ADD COLUMN IF NOT EXISTS n_themes INTEGER;

ALTER TABLE codeframe_generations
ADD COLUMN IF NOT EXISTS n_codes INTEGER;

-- Add index for status lookups
CREATE INDEX IF NOT EXISTS idx_codeframe_generations_status
ON codeframe_generations(status);

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_codeframe_generations_category
ON codeframe_generations(category_id);

-- 3. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Verify schema
SELECT
  'codeframe_hierarchy' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'codeframe_hierarchy'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT
  'codeframe_generations' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'codeframe_generations'
  AND table_schema = 'public'
ORDER BY ordinal_position;
