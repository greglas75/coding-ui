-- SIMPLE FIX: Add only missing cluster columns to codeframe_hierarchy
-- Use this if you get "relation already exists" error
-- Safe to run multiple times

-- Add cluster_id column
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS cluster_id INTEGER;

-- Add cluster_size column
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS cluster_size INTEGER;

-- Refresh PostgREST schema cache (important!)
NOTIFY pgrst, 'reload schema';

-- Verify columns exist
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'codeframe_hierarchy'
  AND column_name IN ('cluster_id', 'cluster_size')
ORDER BY column_name;
