# 🔧 Quick Fix: Category Model Saving Issue

## Problem

W edycji kategorii nie zapisują się zmiany modeli AI. Użytkownik wybiera inny model, klika "Save", ale zmiany nie są zapisywane.

## Root Cause

Brakuje kolumn dla modeli AI w tabeli `categories` w bazie danych Supabase.

## Solution

### 1. Run Database Migration

Execute this SQL in Supabase SQL Editor:

```sql
-- ═══════════════════════════════════════════════════════════════
-- 🔧 Fix Category Model Columns - Complete Migration
-- ═══════════════════════════════════════════════════════════════

-- Add missing AI model columns
DO $$
BEGIN
    -- Add openai_model column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'openai_model'
    ) THEN
        ALTER TABLE categories ADD COLUMN openai_model TEXT;
        RAISE NOTICE '✅ Added column: openai_model';
    END IF;

    -- Add claude_model column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'claude_model'
    ) THEN
        ALTER TABLE categories ADD COLUMN claude_model TEXT;
        RAISE NOTICE '✅ Added column: claude_model';
    END IF;

    -- Add gemini_model column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'gemini_model'
    ) THEN
        ALTER TABLE categories ADD COLUMN gemini_model TEXT;
        RAISE NOTICE '✅ Added column: gemini_model';
    END IF;

    -- Add vision_model column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'vision_model'
    ) THEN
        ALTER TABLE categories ADD COLUMN vision_model TEXT DEFAULT 'gemini-2.5-flash-lite';
        RAISE NOTICE '✅ Added column: vision_model';
    END IF;

    -- Add llm_preset column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'llm_preset'
    ) THEN
        ALTER TABLE categories ADD COLUMN llm_preset TEXT DEFAULT 'LLM Proper Name';
        RAISE NOTICE '✅ Added column: llm_preset';
    END IF;

    -- Add gpt_template column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'gpt_template'
    ) THEN
        ALTER TABLE categories ADD COLUMN gpt_template TEXT;
        RAISE NOTICE '✅ Added column: gpt_template';
    END IF;

    -- Add sentiment_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'sentiment_enabled'
    ) THEN
        ALTER TABLE categories ADD COLUMN sentiment_enabled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added column: sentiment_enabled';
    END IF;

    -- Add sentiment_mode column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'sentiment_mode'
    ) THEN
        ALTER TABLE categories ADD COLUMN sentiment_mode TEXT DEFAULT 'smart' CHECK (sentiment_mode IN ('smart', 'always', 'never'));
        RAISE NOTICE '✅ Added column: sentiment_mode';
    END IF;
END $$;

-- Migrate existing data
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

UPDATE categories
SET llm_preset = preset
WHERE llm_preset IS NULL
  AND preset IS NOT NULL
  AND preset != '';

UPDATE categories
SET gpt_template = template
WHERE gpt_template IS NULL
  AND template IS NOT NULL
  AND template != '';

-- Add column comments
COMMENT ON COLUMN categories.openai_model IS 'OpenAI model override for this category';
COMMENT ON COLUMN categories.claude_model IS 'Claude/Anthropic model override for this category';
COMMENT ON COLUMN categories.gemini_model IS 'Google Gemini model override for this category';
COMMENT ON COLUMN categories.vision_model IS 'Vision model for image analysis';
COMMENT ON COLUMN categories.llm_preset IS 'LLM preset type (new column)';
COMMENT ON COLUMN categories.gpt_template IS 'GPT template (new column)';
COMMENT ON COLUMN categories.sentiment_enabled IS 'Enable sentiment analysis for this category';
COMMENT ON COLUMN categories.sentiment_mode IS 'Sentiment analysis mode: smart, always, or never';
```

### 2. Verify Migration

Run this to check if columns exist:

```sql
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
```

### 3. Test the Fix

1. Open the app
2. Go to Categories page
3. Click "Edit" on any category
4. Change the AI model
5. Click "Save & Close"
6. Reopen the category - model should be saved

## Files Modified

- ✅ `src/pages/CategoriesPage.tsx` - Fixed local state update to include all AI model fields
- ✅ `docs/sql/2025-vision-sentiment-columns.sql` - Created migration for missing columns
- ✅ `fix-category-model-columns.sql` - Complete migration script

## Status

- 🔧 **Database Migration**: Ready to run
- 🔧 **Code Fix**: Applied
- 🧪 **Testing**: Pending user verification

## Next Steps

1. Run the SQL migration in Supabase
2. Test the category model saving
3. Verify all AI model columns are working
