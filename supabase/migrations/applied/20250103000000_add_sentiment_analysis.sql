-- ============================================================================
-- Migration: Context-Aware Sentiment Analysis
-- Description: Adds intelligent sentiment analysis with smart detection
--              to categories and answers tables
-- Date: 2025-01-03
-- ============================================================================

-- ============================================================================
-- PART 1: Add Sentiment Settings to Categories Table
-- ============================================================================

-- Add sentiment settings columns to categories
DO $$
BEGIN
    -- Add sentiment_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'sentiment_enabled'
    ) THEN
        ALTER TABLE categories
        ADD COLUMN sentiment_enabled BOOLEAN DEFAULT FALSE;

        RAISE NOTICE 'Added sentiment_enabled column to categories';
    END IF;

    -- Add sentiment_mode column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'sentiment_mode'
    ) THEN
        ALTER TABLE categories
        ADD COLUMN sentiment_mode VARCHAR(20) DEFAULT 'smart';

        RAISE NOTICE 'Added sentiment_mode column to categories';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN categories.sentiment_enabled IS
'Enable/disable sentiment analysis for this category';

COMMENT ON COLUMN categories.sentiment_mode IS
'smart: AI decides per answer if sentiment applicable
 always: Calculate sentiment for all answers
 never: Never calculate sentiment';

-- Add check constraint for sentiment_mode
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'categories_sentiment_mode_check'
    ) THEN
        ALTER TABLE categories
        ADD CONSTRAINT categories_sentiment_mode_check
        CHECK (sentiment_mode IN ('smart', 'always', 'never'));

        RAISE NOTICE 'Added sentiment_mode check constraint';
    END IF;
END $$;

-- Create index for sentiment-enabled categories
CREATE INDEX IF NOT EXISTS idx_categories_sentiment_enabled
ON categories(sentiment_enabled) WHERE sentiment_enabled = TRUE;

-- ============================================================================
-- PART 2: Add Sentiment Columns to Answers Table
-- ============================================================================

DO $$
BEGIN
    -- Add sentiment column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'answers'
        AND column_name = 'sentiment'
    ) THEN
        ALTER TABLE answers
        ADD COLUMN sentiment VARCHAR(20);

        RAISE NOTICE 'Added sentiment column to answers';
    END IF;

    -- Add sentiment_score column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'answers'
        AND column_name = 'sentiment_score'
    ) THEN
        ALTER TABLE answers
        ADD COLUMN sentiment_score DECIMAL(3,2);

        RAISE NOTICE 'Added sentiment_score column to answers';
    END IF;

    -- Add sentiment_confidence column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'answers'
        AND column_name = 'sentiment_confidence'
    ) THEN
        ALTER TABLE answers
        ADD COLUMN sentiment_confidence DECIMAL(3,2);

        RAISE NOTICE 'Added sentiment_confidence column to answers';
    END IF;

    -- Add sentiment_applicable column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'answers'
        AND column_name = 'sentiment_applicable'
    ) THEN
        ALTER TABLE answers
        ADD COLUMN sentiment_applicable BOOLEAN DEFAULT TRUE;

        RAISE NOTICE 'Added sentiment_applicable column to answers';
    END IF;

    -- Add sentiment_reasoning column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'answers'
        AND column_name = 'sentiment_reasoning'
    ) THEN
        ALTER TABLE answers
        ADD COLUMN sentiment_reasoning TEXT;

        RAISE NOTICE 'Added sentiment_reasoning column to answers';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN answers.sentiment IS
'Overall sentiment: positive, neutral, negative, mixed';

COMMENT ON COLUMN answers.sentiment_score IS
'Sentiment polarity score: 0.0 (very negative) to 1.0 (very positive)';

COMMENT ON COLUMN answers.sentiment_confidence IS
'AI confidence in sentiment assessment (0.0 to 1.0)';

COMMENT ON COLUMN answers.sentiment_applicable IS
'AI-determined: Does sentiment analysis make sense for this text?
 FALSE if text is just brand name, product ID, factual statement, etc.';

COMMENT ON COLUMN answers.sentiment_reasoning IS
'AI explanation for sentiment decision (for debugging/transparency)';

-- Add check constraints
DO $$
BEGIN
    -- Check constraint for sentiment values
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'answers_sentiment_check'
    ) THEN
        ALTER TABLE answers
        ADD CONSTRAINT answers_sentiment_check
        CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed', NULL));

        RAISE NOTICE 'Added sentiment check constraint';
    END IF;

    -- Check constraint for sentiment_score range
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'answers_sentiment_score_check'
    ) THEN
        ALTER TABLE answers
        ADD CONSTRAINT answers_sentiment_score_check
        CHECK (sentiment_score IS NULL OR (sentiment_score >= 0 AND sentiment_score <= 1));

        RAISE NOTICE 'Added sentiment_score check constraint';
    END IF;

    -- Check constraint for sentiment_confidence range
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'answers_sentiment_confidence_check'
    ) THEN
        ALTER TABLE answers
        ADD CONSTRAINT answers_sentiment_confidence_check
        CHECK (sentiment_confidence IS NULL OR (sentiment_confidence >= 0 AND sentiment_confidence <= 1));

        RAISE NOTICE 'Added sentiment_confidence check constraint';
    END IF;
END $$;

-- Create indexes for filtering and analytics
CREATE INDEX IF NOT EXISTS idx_answers_sentiment
ON answers(sentiment) WHERE sentiment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_answers_sentiment_applicable
ON answers(sentiment_applicable);

CREATE INDEX IF NOT EXISTS idx_answers_sentiment_category
ON answers(category_id, sentiment) WHERE sentiment IS NOT NULL;

-- ============================================================================
-- PART 3: Update ai_usage_logs for Sentiment Tracking
-- ============================================================================

-- Update check constraint to include 'sentiment' feature type
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ai_usage_logs_feature_type_check'
    ) THEN
        ALTER TABLE ai_usage_logs
        DROP CONSTRAINT ai_usage_logs_feature_type_check;

        RAISE NOTICE 'Dropped old feature_type check constraint';
    END IF;

    -- Add new constraint with sentiment included
    ALTER TABLE ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_feature_type_check
    CHECK (feature_type IN (
        'answer_coding',
        'codeframe_generation',
        'translation',
        'sentiment'
    ));

    RAISE NOTICE 'Added sentiment to feature_type check constraint';
END $$;

-- ============================================================================
-- PART 4: Create Analytics Functions
-- ============================================================================

-- Function: Get sentiment distribution by code
CREATE OR REPLACE FUNCTION get_sentiment_by_code(p_category_id INTEGER)
RETURNS TABLE (
    code_id INTEGER,
    code_name VARCHAR,
    total_count BIGINT,
    positive_count BIGINT,
    neutral_count BIGINT,
    negative_count BIGINT,
    mixed_count BIGINT,
    positive_pct DECIMAL,
    neutral_pct DECIMAL,
    negative_pct DECIMAL,
    mixed_pct DECIMAL,
    avg_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS code_id,
        c.name AS code_name,
        COUNT(a.id)::BIGINT AS total_count,
        COUNT(a.id) FILTER (WHERE a.sentiment = 'positive')::BIGINT AS positive_count,
        COUNT(a.id) FILTER (WHERE a.sentiment = 'neutral')::BIGINT AS neutral_count,
        COUNT(a.id) FILTER (WHERE a.sentiment = 'negative')::BIGINT AS negative_count,
        COUNT(a.id) FILTER (WHERE a.sentiment = 'mixed')::BIGINT AS mixed_count,
        ROUND((COUNT(a.id) FILTER (WHERE a.sentiment = 'positive')::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100, 1) AS positive_pct,
        ROUND((COUNT(a.id) FILTER (WHERE a.sentiment = 'neutral')::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100, 1) AS neutral_pct,
        ROUND((COUNT(a.id) FILTER (WHERE a.sentiment = 'negative')::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100, 1) AS negative_pct,
        ROUND((COUNT(a.id) FILTER (WHERE a.sentiment = 'mixed')::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100, 1) AS mixed_pct,
        ROUND(AVG(a.sentiment_score), 2) AS avg_score
    FROM codes c
    JOIN answer_codes ac ON c.id = ac.code_id
    JOIN answers a ON ac.answer_id = a.id
    WHERE a.category_id = p_category_id
        AND a.sentiment IS NOT NULL
        AND a.sentiment_applicable = TRUE
    GROUP BY c.id, c.name
    HAVING COUNT(a.id) > 0
    ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get overall sentiment statistics
CREATE OR REPLACE FUNCTION get_sentiment_stats(p_category_id INTEGER)
RETURNS TABLE (
    total_answers BIGINT,
    sentiment_applicable_count BIGINT,
    sentiment_not_applicable_count BIGINT,
    applicable_percentage DECIMAL,
    positive_count BIGINT,
    neutral_count BIGINT,
    negative_count BIGINT,
    mixed_count BIGINT,
    avg_sentiment_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_answers,
        COUNT(*) FILTER (WHERE a.sentiment_applicable = TRUE)::BIGINT AS sentiment_applicable_count,
        COUNT(*) FILTER (WHERE a.sentiment_applicable = FALSE)::BIGINT AS sentiment_not_applicable_count,
        ROUND((COUNT(*) FILTER (WHERE a.sentiment_applicable = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 1) AS applicable_percentage,
        COUNT(*) FILTER (WHERE a.sentiment = 'positive')::BIGINT AS positive_count,
        COUNT(*) FILTER (WHERE a.sentiment = 'neutral')::BIGINT AS neutral_count,
        COUNT(*) FILTER (WHERE a.sentiment = 'negative')::BIGINT AS negative_count,
        COUNT(*) FILTER (WHERE a.sentiment = 'mixed')::BIGINT AS mixed_count,
        ROUND(AVG(a.sentiment_score) FILTER (WHERE a.sentiment IS NOT NULL), 2) AS avg_sentiment_score
    FROM answers a
    WHERE a.category_id = p_category_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments to functions
COMMENT ON FUNCTION get_sentiment_by_code(INTEGER) IS
'Returns sentiment distribution breakdown by code for a category';

COMMENT ON FUNCTION get_sentiment_stats(INTEGER) IS
'Returns overall sentiment statistics for a category';

-- ============================================================================
-- PART 5: Migration Complete
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Sentiment Analysis migration complete!';
    RAISE NOTICE '   - Added sentiment settings to categories table';
    RAISE NOTICE '   - Added 5 sentiment columns to answers table';
    RAISE NOTICE '   - Updated ai_usage_logs feature types';
    RAISE NOTICE '   - Created 2 analytics functions';
    RAISE NOTICE '   - Created 4 indexes for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '   1. Deploy backend sentiment service';
    RAISE NOTICE '   2. Deploy frontend UI components';
    RAISE NOTICE '   3. Enable sentiment for test category';
END $$;
