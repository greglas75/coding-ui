-- Fix codeframe_hierarchy schema and refresh PostgREST cache
-- Run this in Supabase SQL Editor

-- 1. Verify current schema
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'codeframe_hierarchy'
ORDER BY ordinal_position;

-- 2. Add missing columns if they don't exist
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS confidence VARCHAR(20);

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS example_texts JSONB;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS frequency_estimate VARCHAR(20);

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS cluster_id INTEGER;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS cluster_size INTEGER;

-- 3. CRITICAL: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 4. Verify the schema was updated
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'codeframe_hierarchy'
  AND column_name IN ('name', 'description', 'confidence', 'display_order')
ORDER BY column_name;
