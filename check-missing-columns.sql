-- ═══════════════════════════════════════════════════════════════
-- 🔍 Check Missing Columns in Categories Table
-- ═══════════════════════════════════════════════════════════════

-- Check current schema
SELECT
    '🔍 Current Categories Schema' as info;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- Check for missing AI model columns
SELECT
    '🔍 Missing Columns Check' as info;

SELECT
    col.column_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'categories' AND column_name = col.column_name
        )
        THEN '✅ Exists'
        ELSE '❌ MISSING - Run migration!'
    END as status
FROM (
    VALUES
        ('model'),           -- Legacy column
        ('openai_model'),    -- OpenAI models
        ('claude_model'),    -- Claude models
        ('gemini_model'),    -- Gemini models
        ('vision_model'),    -- Vision models
        ('llm_preset'),      -- New preset column
        ('gpt_template'),   -- New template column
        ('sentiment_enabled'), -- Sentiment analysis
        ('sentiment_mode')   -- Sentiment mode
) AS col(column_name);

-- Check if any categories have model data
SELECT
    '🔍 Sample Category Data' as info;

SELECT
    id,
    name,
    model,
    openai_model,
    claude_model,
    gemini_model,
    vision_model,
    llm_preset,
    sentiment_enabled,
    sentiment_mode
FROM categories
LIMIT 5;
