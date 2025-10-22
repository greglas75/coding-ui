-- ═══════════════════════════════════════════════════════════════
-- 🔧 Vision Model & Sentiment Analysis Columns
-- Purpose: Add missing columns for vision model and sentiment analysis
-- Date: 2025-01-11
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Add Vision Model Column
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Adding vision model column...' as info;

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

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Add Sentiment Analysis Columns
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Adding sentiment analysis columns...' as info;

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
-- STEP 3: Add LLM Preset and GPT Template Columns
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Adding LLM preset and GPT template columns...' as info;

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

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Migrate existing data
-- ═══════════════════════════════════════════════════════════════

SELECT '📦 Migrating existing data...' as info;

-- Copy preset to llm_preset if llm_preset is NULL
UPDATE categories
SET llm_preset = preset
WHERE llm_preset IS NULL
  AND preset IS NOT NULL
  AND preset != '';

-- Copy template to gpt_template if gpt_template is NULL
UPDATE categories
SET gpt_template = template
WHERE gpt_template IS NULL
  AND template IS NOT NULL
  AND template != '';

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: Add column comments
-- ═══════════════════════════════════════════════════════════════

COMMENT ON COLUMN categories.vision_model IS 'Vision model for image analysis (defaults to gemini-2.5-flash-lite)';
COMMENT ON COLUMN categories.sentiment_enabled IS 'Enable sentiment analysis for this category';
COMMENT ON COLUMN categories.sentiment_mode IS 'Sentiment analysis mode: smart, always, or never';
COMMENT ON COLUMN categories.llm_preset IS 'LLM preset type (new column, replaces preset)';
COMMENT ON COLUMN categories.gpt_template IS 'GPT template (new column, replaces template)';

-- ═══════════════════════════════════════════════════════════════
-- STEP 6: Verification
-- ═══════════════════════════════════════════════════════════════

SELECT '✅ Migration complete! Verifying schema...' as info;

-- Check all new columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name IN (
    'vision_model',
    'sentiment_enabled',
    'sentiment_mode',
    'llm_preset',
    'gpt_template'
  )
ORDER BY column_name;

-- Sample data check
SELECT
    id,
    name,
    vision_model,
    sentiment_enabled,
    sentiment_mode,
    llm_preset,
    gpt_template
FROM categories
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════
-- Notes:
-- - vision_model defaults to 'gemini-2.5-flash-lite' (cheapest vision model)
-- - sentiment_enabled defaults to FALSE (disabled by default)
-- - sentiment_mode defaults to 'smart' (AI decides when to use sentiment)
-- - Migration is idempotent and safe to run multiple times
-- ═══════════════════════════════════════════════════════════════
