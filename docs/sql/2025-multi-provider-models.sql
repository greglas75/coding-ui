-- ═══════════════════════════════════════════════════════════════
-- 🔧 Multi-Provider AI Model Support
-- Purpose: Add separate model columns for OpenAI, Claude, and Gemini
-- Date: 2025-01-10
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Add new model columns
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Adding multi-provider model columns...' as info;

-- Add openai_model column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'openai_model'
    ) THEN
        ALTER TABLE categories ADD COLUMN openai_model TEXT;
        RAISE NOTICE '✅ Added column: openai_model';
    ELSE
        RAISE NOTICE 'ℹ️ Column openai_model already exists';
    END IF;
END $$;

-- Add claude_model column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'claude_model'
    ) THEN
        ALTER TABLE categories ADD COLUMN claude_model TEXT;
        RAISE NOTICE '✅ Added column: claude_model';
    ELSE
        RAISE NOTICE 'ℹ️ Column claude_model already exists';
    END IF;
END $$;

-- Add gemini_model column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'gemini_model'
    ) THEN
        ALTER TABLE categories ADD COLUMN gemini_model TEXT;
        RAISE NOTICE '✅ Added column: gemini_model';
    ELSE
        RAISE NOTICE 'ℹ️ Column gemini_model already exists';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Migrate existing data
-- ═══════════════════════════════════════════════════════════════

SELECT '📦 Migrating existing model data...' as info;

-- Copy values from 'model' column to 'openai_model'
-- Only if openai_model is NULL and model is not NULL
UPDATE categories
SET openai_model = model
WHERE openai_model IS NULL
  AND model IS NOT NULL
  AND model != '';

-- Set default values for claude_model and gemini_model if they're NULL
-- These will match the localStorage defaults from Settings page
UPDATE categories
SET
  claude_model = COALESCE(claude_model, 'claude-sonnet-4.5-20250929'),
  gemini_model = COALESCE(gemini_model, 'gemini-2.0-pro-experimental')
WHERE claude_model IS NULL OR gemini_model IS NULL;

SELECT
  COUNT(*) FILTER (WHERE openai_model IS NOT NULL) as categories_with_openai,
  COUNT(*) FILTER (WHERE claude_model IS NOT NULL) as categories_with_claude,
  COUNT(*) FILTER (WHERE gemini_model IS NOT NULL) as categories_with_gemini
FROM categories;

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Add column comments
-- ═══════════════════════════════════════════════════════════════

COMMENT ON COLUMN categories.openai_model IS 'OpenAI model override for this category (defaults to localStorage.openai_model if NULL)';
COMMENT ON COLUMN categories.claude_model IS 'Claude/Anthropic model override for this category (defaults to localStorage.anthropic_model if NULL)';
COMMENT ON COLUMN categories.gemini_model IS 'Google Gemini model override for this category (defaults to localStorage.google_gemini_model if NULL)';

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Verification
-- ═══════════════════════════════════════════════════════════════

SELECT '✅ Migration complete! Verifying schema...' as info;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name IN ('model', 'openai_model', 'claude_model', 'gemini_model')
ORDER BY column_name;

-- Sample data check
SELECT
    id,
    name,
    model as old_model,
    openai_model,
    claude_model,
    gemini_model
FROM categories
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════
-- Notes:
-- - Old 'model' column is kept for backwards compatibility
-- - Categories without custom models will fallback to localStorage values in code
-- - Migration is idempotent and safe to run multiple times
-- ═══════════════════════════════════════════════════════════════


