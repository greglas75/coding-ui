-- ⚠️ URGENT: Fix codeframe_hierarchy table - missing columns
-- Execute this in Supabase SQL Editor NOW
-- This will fix the "Could not find the 'name' column" error

-- First, let's see what columns exist
DO $$
BEGIN
  RAISE NOTICE '=== Current codeframe_hierarchy columns ===';
END $$;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'codeframe_hierarchy'
ORDER BY ordinal_position;

-- Add all missing columns
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'Unnamed';

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS confidence VARCHAR(20);

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS frequency_estimate VARCHAR(20);

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS example_texts JSONB;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS cluster_id INTEGER;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS cluster_size INTEGER;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT TRUE;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS representative_answer_ids INTEGER[];

-- Remove NOT NULL constraint from name if we want to allow null during migration
ALTER TABLE codeframe_hierarchy
ALTER COLUMN name DROP NOT NULL;

-- Add constraints (drop first if they exist to avoid errors)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_confidence_values') THEN
    ALTER TABLE codeframe_hierarchy
    ADD CONSTRAINT chk_confidence_values
    CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_frequency_values') THEN
    ALTER TABLE codeframe_hierarchy
    ADD CONSTRAINT chk_frequency_values
    CHECK (frequency_estimate IS NULL OR frequency_estimate IN ('high', 'medium', 'low'));
  END IF;
END $$;

-- CRITICAL: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '=== AFTER FIX - codeframe_hierarchy columns ===';
END $$;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'codeframe_hierarchy'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Schema fixed! PostgREST cache refreshed!';
  RAISE NOTICE 'You can now restart the API server.';
END $$;
