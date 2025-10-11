-- ═══════════════════════════════════════════════════════════════
-- 🔧 Add Missing Columns to Categories Table
-- Purpose: Add all LLM-related columns needed for AI system
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Check Current Schema
-- ═══════════════════════════════════════════════════════════════

SELECT
    '🔍 Current Categories Schema' as info;

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Add Missing Columns (Safe - IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════

SELECT
    '🔧 Adding missing columns...' as info;

-- Add google_name (search term for Google API)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'google_name'
    ) THEN
        ALTER TABLE categories ADD COLUMN google_name TEXT;
        RAISE NOTICE '✅ Added column: google_name';
    ELSE
        RAISE NOTICE 'ℹ️ Column google_name already exists';
    END IF;
END $$;

-- Add description
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'description'
    ) THEN
        ALTER TABLE categories ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added column: description';
    ELSE
        RAISE NOTICE 'ℹ️ Column description already exists';
    END IF;
END $$;

-- Add template (GPT template)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'template'
    ) THEN
        ALTER TABLE categories ADD COLUMN template TEXT DEFAULT NULL;
        RAISE NOTICE '✅ Added column: template';
    ELSE
        RAISE NOTICE 'ℹ️ Column template already exists';
    END IF;
END $$;

-- Add preset (LLM preset type)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'preset'
    ) THEN
        ALTER TABLE categories ADD COLUMN preset TEXT DEFAULT 'LLM Proper Name';
        RAISE NOTICE '✅ Added column: preset';
    ELSE
        RAISE NOTICE 'ℹ️ Column preset already exists';
    END IF;
END $$;

-- Add model (AI model selection)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'model'
    ) THEN
        ALTER TABLE categories ADD COLUMN model TEXT DEFAULT 'gpt-4o';
        RAISE NOTICE '✅ Added column: model';
    ELSE
        RAISE NOTICE 'ℹ️ Column model already exists';
    END IF;
END $$;

-- Add use_web_context (enable/disable Google Search)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'use_web_context'
    ) THEN
        ALTER TABLE categories ADD COLUMN use_web_context BOOLEAN DEFAULT TRUE;
        RAISE NOTICE '✅ Added column: use_web_context';
    ELSE
        RAISE NOTICE 'ℹ️ Column use_web_context already exists';
    END IF;
END $$;

-- Add brands_sorting
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'brands_sorting'
    ) THEN
        ALTER TABLE categories ADD COLUMN brands_sorting TEXT DEFAULT 'Alphanumerical';
        RAISE NOTICE '✅ Added column: brands_sorting';
    ELSE
        RAISE NOTICE 'ℹ️ Column brands_sorting already exists';
    END IF;
END $$;

-- Add min_length (minimum answer length validation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'min_length'
    ) THEN
        ALTER TABLE categories ADD COLUMN min_length INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added column: min_length';
    ELSE
        RAISE NOTICE 'ℹ️ Column min_length already exists';
    END IF;
END $$;

-- Add max_length (maximum answer length validation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'max_length'
    ) THEN
        ALTER TABLE categories ADD COLUMN max_length INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added column: max_length';
    ELSE
        RAISE NOTICE 'ℹ️ Column max_length already exists';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Ensure Timestamps Exist
-- ═══════════════════════════════════════════════════════════════

-- Add created_at if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE categories ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added column: created_at';
    ELSE
        RAISE NOTICE 'ℹ️ Column created_at already exists';
    END IF;
END $$;

-- Add updated_at if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE categories ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added column: updated_at';
    ELSE
        RAISE NOTICE 'ℹ️ Column updated_at already exists';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Add Comments for Documentation
-- ═══════════════════════════════════════════════════════════════

COMMENT ON COLUMN categories.google_name IS 'Search term used for Google Custom Search API';
COMMENT ON COLUMN categories.description IS 'Category description for context';
COMMENT ON COLUMN categories.template IS 'GPT prompt template (nullable, can be empty)';
COMMENT ON COLUMN categories.preset IS 'LLM preset type (e.g., "LLM Proper Name")';
COMMENT ON COLUMN categories.model IS 'AI model to use (e.g., "gpt-4o", "claude-3.5-sonnet")';
COMMENT ON COLUMN categories.use_web_context IS 'Enable Google Search context for AI (default: true)';
COMMENT ON COLUMN categories.brands_sorting IS 'How to sort brands in UI (e.g., "Alphanumerical")';
COMMENT ON COLUMN categories.min_length IS 'Minimum answer length (0 = no limit)';
COMMENT ON COLUMN categories.max_length IS 'Maximum answer length (0 = no limit)';

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: Verify All Columns Added
-- ═══════════════════════════════════════════════════════════════

SELECT
    '✅ Final Schema Verification' as info;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- Expected columns:
-- ✅ id
-- ✅ name
-- ✅ google_name
-- ✅ description
-- ✅ template
-- ✅ preset
-- ✅ model
-- ✅ use_web_context
-- ✅ brands_sorting
-- ✅ min_length
-- ✅ max_length
-- ✅ created_at
-- ✅ updated_at

-- ═══════════════════════════════════════════════════════════════
-- STEP 6: Enable RLS and Create Policies
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS if not already enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "select categories" ON categories;
DROP POLICY IF EXISTS "update categories" ON categories;
DROP POLICY IF EXISTS "insert categories" ON categories;
DROP POLICY IF EXISTS "delete categories" ON categories;

-- Create policies (allow all for now - adjust based on your auth)
CREATE POLICY "select categories"
  ON categories
  FOR SELECT
  USING (true);

CREATE POLICY "update categories"
  ON categories
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "insert categories"
  ON categories
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "delete categories"
  ON categories
  FOR DELETE
  USING (true);

-- ═══════════════════════════════════════════════════════════════
-- STEP 7: Test Update
-- ═══════════════════════════════════════════════════════════════

SELECT
    '🧪 Testing update capability...' as info;

-- Try updating first category
UPDATE categories
SET
    template = NULL,
    description = 'Test description - migration successful',
    use_web_context = TRUE
WHERE id = (SELECT id FROM categories LIMIT 1)
RETURNING id, name, template, use_web_context;

-- If you see a row returned, migration was successful! ✅

-- ═══════════════════════════════════════════════════════════════
-- 🎯 SUMMARY
-- ═══════════════════════════════════════════════════════════════

/*
✅ MIGRATION COMPLETE!

What was added:
- google_name (TEXT)
- description (TEXT)
- template (TEXT, nullable)
- preset (TEXT, default 'LLM Proper Name')
- model (TEXT, default 'gpt-4o')
- use_web_context (BOOLEAN, default TRUE)
- brands_sorting (TEXT, default 'Alphanumerical')
- min_length (INTEGER, default 0)
- max_length (INTEGER, default 0)
- created_at (TIMESTAMP, default NOW())
- updated_at (TIMESTAMP, default NOW())

RLS Policies:
✅ SELECT - Allow all
✅ UPDATE - Allow all
✅ INSERT - Allow all
✅ DELETE - Allow all

Next Steps:
1. Run this migration in Supabase SQL Editor
2. Verify all columns added (check output above)
3. Test saving category in your app
4. Should work without 400 errors!

If still having issues:
- Run: docs/sql/SUPABASE_DIAGNOSTIC.sql
*/

-- ═══════════════════════════════════════════════════════════════

