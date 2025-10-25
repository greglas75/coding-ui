-- ============================================================================
-- Migration: Add LLM Template Configuration Columns
-- Description: Add llm_preset and gpt_template columns to categories table
-- Date: 2025-01-10
-- ============================================================================

-- Add llm_preset column (template preset name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'llm_preset'
    ) THEN
        ALTER TABLE categories ADD COLUMN llm_preset TEXT;
        RAISE NOTICE '✅ Added column: llm_preset';
    ELSE
        RAISE NOTICE 'ℹ️ Column llm_preset already exists';
    END IF;
END $$;

-- Add gpt_template column (custom template text)
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

-- Set default preset for existing categories
UPDATE categories
SET llm_preset = COALESCE(llm_preset, 'LLM Proper Name')
WHERE llm_preset IS NULL;

-- Add column comments
COMMENT ON COLUMN categories.llm_preset IS 'Template preset name (e.g., "LLM Proper Name", "LLM Brand List")';
COMMENT ON COLUMN categories.gpt_template IS 'Custom GPT template text (overrides preset if provided)';

-- Verification
SELECT '✅ Migration complete! Verifying schema...' as info;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name IN ('llm_preset', 'gpt_template', 'template', 'preset')
ORDER BY column_name;

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE 'Migration Summary:';
RAISE NOTICE '  - llm_preset column: Added';
RAISE NOTICE '  - gpt_template column: Added';
RAISE NOTICE '  - Default preset set: LLM Proper Name';
RAISE NOTICE '========================================';
