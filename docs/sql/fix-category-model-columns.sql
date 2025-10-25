-- ═══════════════════════════════════════════════════════════════
-- 🔧 Fix Category Model Columns - Complete Migration
-- Purpose: Add all missing AI model columns to categories table
-- Date: 2025-01-11
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Check Current Schema
-- ═══════════════════════════════════════════════════════════════

SELECT '🔍 Current Categories Schema' as info;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Add Missing AI Model Columns
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Adding missing AI model columns...' as info;

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

-- Add vision_model column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'vision_model'
    ) THEN
        ALTER TABLE categories ADD COLUMN vision_model TEXT DEFAULT 'gemini-2.5-flash-lite';
        RAISE NOTICE '✅ Added column: vision_model';
    ELSE
        RAISE NOTICE 'ℹ️ Column vision_model already exists';
    END IF;
END $$;

-- Add llm_preset column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'llm_preset'
    ) THEN
        ALTER TABLE categories ADD COLUMN llm_preset TEXT DEFAULT 'LLM Proper Name';
        RAISE NOTICE '✅ Added column: llm_preset';
    ELSE
        RAISE NOTICE 'ℹ️ Column llm_preset already exists';
    END IF;
END $$;

-- Add gpt_template column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'gpt_template'
    ) THEN
        ALTER TABLE categories ADD COLUMN gpt_template TEXT;
        RAISE NOTICE '✅ Added column: gpt_template';
    ELSE
        RAISE NOTICE 'ℹ️ Column gpt_template already exists';
    END IF;
END $$;

-- Add sentiment_enabled column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'sentiment_enabled'
    ) THEN
        ALTER TABLE categories ADD COLUMN sentiment_enabled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added column: sentiment_enabled';
    ELSE
        RAISE NOTICE 'ℹ️ Column sentiment_enabled already exists';
    END IF;
END $$;

-- Add sentiment_mode column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'sentiment_mode'
    ) THEN
        ALTER TABLE categories ADD COLUMN sentiment_mode TEXT DEFAULT 'smart' CHECK (sentiment_mode IN ('smart', 'always', 'never'));
        RAISE NOTICE '✅ Added column: sentiment_mode';
    ELSE
        RAISE NOTICE 'ℹ️ Column sentiment_mode already exists';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Migrate existing data
-- ═══════════════════════════════════════════════════════════════

SELECT '📦 Migrating existing data...' as info;

-- Copy model to appropriate provider column
UPDATE categories
SET openai_model = model
WHERE openai_model IS NULL
  AND model IS NOT NULL
  AND model != ''
  AND (model LIKE 'gpt-%' OR model LIKE 'o1-%');

UPDATE categories
SET claude_model = model
WHERE claude_model IS NULL
  AND model IS NOT NULL
  AND model != ''
  AND model LIKE 'claude-%';

UPDATE categories
SET gemini_model = model
WHERE gemini_model IS NULL
  AND model IS NOT NULL
  AND model != ''
  AND model LIKE 'gemini-%';

-- Copy preset to llm_preset
UPDATE categories
SET llm_preset = preset
WHERE llm_preset IS NULL
  AND preset IS NOT NULL
  AND preset != '';

-- Copy template to gpt_template
UPDATE categories
SET gpt_template = template
WHERE gpt_template IS NULL
  AND template IS NOT NULL
  AND template != '';

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Add column comments
-- ═══════════════════════════════════════════════════════════════

COMMENT ON COLUMN categories.openai_model IS 'OpenAI model override for this category';
COMMENT ON COLUMN categories.claude_model IS 'Claude/Anthropic model override for this category';
COMMENT ON COLUMN categories.gemini_model IS 'Google Gemini model override for this category';
COMMENT ON COLUMN categories.vision_model IS 'Vision model for image analysis';
COMMENT ON COLUMN categories.llm_preset IS 'LLM preset type (new column)';
COMMENT ON COLUMN categories.gpt_template IS 'GPT template (new column)';
COMMENT ON COLUMN categories.sentiment_enabled IS 'Enable sentiment analysis for this category';
COMMENT ON COLUMN categories.sentiment_mode IS 'Sentiment analysis mode: smart, always, or never';

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: Verification
-- ═══════════════════════════════════════════════════════════════

SELECT '✅ Migration complete! Verifying schema...' as info;

-- Check all AI model columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name IN (
    'model', 'openai_model', 'claude_model', 'gemini_model',
    'vision_model', 'llm_preset', 'gpt_template',
    'sentiment_enabled', 'sentiment_mode'
  )
ORDER BY column_name;

-- Sample data check
SELECT
    id,
    name,
    model as old_model,
    openai_model,
    claude_model,
    gemini_model,
    vision_model,
    llm_preset,
    sentiment_enabled,
    sentiment_mode
FROM categories
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════
-- Notes:
-- - All columns are nullable to avoid constraint issues
-- - Migration is idempotent and safe to run multiple times
-- - Existing data is preserved and migrated to new columns
-- ═══════════════════════════════════════════════════════════════
