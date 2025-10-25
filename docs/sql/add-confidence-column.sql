-- Add missing confidence column to codeframe_hierarchy
-- Run this in Supabase SQL Editor

-- Add confidence column
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS confidence VARCHAR(20);

-- Refresh PostgREST schema cache (important!)
NOTIFY pgrst, 'reload schema';

-- Verify column exists
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'codeframe_hierarchy'
  AND column_name = 'confidence'
ORDER BY column_name;
