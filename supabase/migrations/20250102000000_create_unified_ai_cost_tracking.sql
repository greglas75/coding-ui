-- ============================================================================
-- Migration: Unified AI Cost Tracking System
-- Description: Creates ai_usage_logs table and unified cost tracking across
--              answer coding (GPT) and codeframe generation (Claude)
-- Date: 2025-01-02
-- ============================================================================

-- ============================================================================
-- PART 1: Ensure codeframe_generations has AI cost columns
-- ============================================================================

-- Add AI cost tracking columns to codeframe_generations if they don't exist
DO $$
BEGIN
    -- Check and add ai_model column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'codeframe_generations'
        AND column_name = 'ai_model'
    ) THEN
        ALTER TABLE codeframe_generations
        ADD COLUMN ai_model VARCHAR(100);

        RAISE NOTICE 'Added ai_model column to codeframe_generations';
    END IF;

    -- Check and add ai_input_tokens column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'codeframe_generations'
        AND column_name = 'ai_input_tokens'
    ) THEN
        ALTER TABLE codeframe_generations
        ADD COLUMN ai_input_tokens INTEGER;

        RAISE NOTICE 'Added ai_input_tokens column to codeframe_generations';
    END IF;

    -- Check and add ai_output_tokens column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'codeframe_generations'
        AND column_name = 'ai_output_tokens'
    ) THEN
        ALTER TABLE codeframe_generations
        ADD COLUMN ai_output_tokens INTEGER;

        RAISE NOTICE 'Added ai_output_tokens column to codeframe_generations';
    END IF;

    -- Check and add ai_cost_usd column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'codeframe_generations'
        AND column_name = 'ai_cost_usd'
    ) THEN
        ALTER TABLE codeframe_generations
        ADD COLUMN ai_cost_usd DECIMAL(10, 6);

        RAISE NOTICE 'Added ai_cost_usd column to codeframe_generations';
    END IF;
END $$;

-- ============================================================================
-- PART 2: Create ai_usage_logs table (unified cost tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Feature identification
    feature_type VARCHAR(50) NOT NULL,
    -- Values: 'answer_coding' | 'codeframe_generation'

    -- User & context
    user_id UUID,  -- May be NULL for system operations
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,

    -- Related entities (nullable foreign keys)
    generation_id UUID REFERENCES codeframe_generations(id) ON DELETE SET NULL,
    answer_id INTEGER REFERENCES answers(id) ON DELETE SET NULL,

    -- AI model info
    model VARCHAR(100) NOT NULL,
    -- Examples: 'gpt-4o-mini', 'gpt-4', 'claude-sonnet-4-5-20251022'

    -- Token usage
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,

    -- Cost
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

    -- Additional metadata (flexible JSONB)
    metadata JSONB DEFAULT '{}'::jsonb,
    -- For answer_coding: { "confidence": 0.95, "auto_confirmed": true, "code_id": "123" }
    -- For codeframe: { "n_clusters": 8, "n_codes": 24, "mece_score": 87.5, "processing_time_ms": 5000 }

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_feature_type CHECK (feature_type IN ('answer_coding', 'codeframe_generation'))
);

-- Indexes for ai_usage_logs
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature_type ON ai_usage_logs(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_date ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_category ON ai_usage_logs(category_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_generation ON ai_usage_logs(generation_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_answer ON ai_usage_logs(answer_id);

-- Table comments
COMMENT ON TABLE ai_usage_logs IS 'Unified tracking of all AI API usage and costs across features';
COMMENT ON COLUMN ai_usage_logs.feature_type IS 'Type of AI feature: answer_coding | codeframe_generation';
COMMENT ON COLUMN ai_usage_logs.metadata IS 'Flexible JSONB for feature-specific data';

-- ============================================================================
-- PART 3: Create triggers to auto-populate ai_usage_logs
-- ============================================================================

-- Function: Log answer coding costs from ai_suggestions updates
CREATE OR REPLACE FUNCTION log_answer_coding_cost()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if ai_suggestions was updated and has cost data
    IF NEW.ai_suggestions IS NOT NULL
       AND NEW.ai_suggestions::jsonb ? 'model' THEN

        INSERT INTO ai_usage_logs (
            feature_type,
            category_id,
            answer_id,
            model,
            input_tokens,
            output_tokens,
            cost_usd,
            metadata
        ) VALUES (
            'answer_coding',
            NEW.category_id,
            NEW.id,
            COALESCE(NEW.ai_suggestions->>'model', 'gpt-4o-mini'),
            COALESCE((NEW.ai_suggestions->>'input_tokens')::INTEGER, 0),
            COALESCE((NEW.ai_suggestions->>'output_tokens')::INTEGER, 0),
            COALESCE((NEW.ai_suggestions->>'cost_usd')::DECIMAL, 0),
            jsonb_build_object(
                'confidence', NEW.ai_suggestions->'suggestions'->0->>'confidence',
                'auto_confirmed', NEW.quick_status = 'Confirmed',
                'code_id', NEW.ai_suggestions->'suggestions'->0->>'code_id',
                'generated_at', NEW.ai_suggestions->>'generated_at'
            )
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Log answer coding on ai_suggestions update
DROP TRIGGER IF EXISTS trigger_log_answer_coding ON answers;
CREATE TRIGGER trigger_log_answer_coding
    AFTER UPDATE OF ai_suggestions ON answers
    FOR EACH ROW
    WHEN (OLD.ai_suggestions IS DISTINCT FROM NEW.ai_suggestions)
    EXECUTE FUNCTION log_answer_coding_cost();

COMMENT ON FUNCTION log_answer_coding_cost() IS
'Automatically logs AI costs to ai_usage_logs when answers.ai_suggestions is updated';

-- Function: Sync codeframe generation costs
CREATE OR REPLACE FUNCTION sync_codeframe_cost_to_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log completed generations with cost data
    IF NEW.status = 'completed'
       AND NEW.ai_cost_usd IS NOT NULL
       AND NEW.ai_model IS NOT NULL THEN

        INSERT INTO ai_usage_logs (
            feature_type,
            category_id,
            generation_id,
            model,
            input_tokens,
            output_tokens,
            cost_usd,
            metadata
        ) VALUES (
            'codeframe_generation',
            NEW.category_id,
            NEW.id,
            NEW.ai_model,
            COALESCE(NEW.ai_input_tokens, 0),
            COALESCE(NEW.ai_output_tokens, 0),
            NEW.ai_cost_usd,
            jsonb_build_object(
                'n_clusters', NEW.n_clusters,
                'n_themes', NEW.n_themes,
                'n_codes', NEW.n_codes,
                'mece_score', NEW.mece_score,
                'processing_time_ms', NEW.processing_time_ms,
                'n_answers', NEW.n_answers
            )
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Sync codeframe costs when status changes to completed
DROP TRIGGER IF EXISTS trigger_sync_codeframe_cost ON codeframe_generations;
CREATE TRIGGER trigger_sync_codeframe_cost
    AFTER INSERT OR UPDATE OF status, ai_cost_usd ON codeframe_generations
    FOR EACH ROW
    EXECUTE FUNCTION sync_codeframe_cost_to_log();

COMMENT ON FUNCTION sync_codeframe_cost_to_log() IS
'Automatically syncs codeframe generation costs to ai_usage_logs when completed';

-- ============================================================================
-- PART 4: Create helper functions for querying costs
-- ============================================================================

-- Function: Get monthly cost summary by feature type
CREATE OR REPLACE FUNCTION get_monthly_cost_summary(
    p_user_id UUID DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT DATE_TRUNC('month', CURRENT_TIMESTAMP),
    p_end_date TIMESTAMPTZ DEFAULT DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
)
RETURNS TABLE (
    feature_type VARCHAR,
    total_cost_usd NUMERIC,
    total_requests BIGINT,
    avg_cost_per_request NUMERIC,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_tokens BIGINT,
    model VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.feature_type,
        ROUND(SUM(l.cost_usd)::NUMERIC, 6) AS total_cost_usd,
        COUNT(*)::BIGINT AS total_requests,
        ROUND((SUM(l.cost_usd) / NULLIF(COUNT(*), 0))::NUMERIC, 6) AS avg_cost_per_request,
        SUM(l.input_tokens)::BIGINT AS total_input_tokens,
        SUM(l.output_tokens)::BIGINT AS total_output_tokens,
        (SUM(l.input_tokens) + SUM(l.output_tokens))::BIGINT AS total_tokens,
        l.model
    FROM ai_usage_logs l
    WHERE l.created_at >= p_start_date
        AND l.created_at < p_end_date
        AND (p_user_id IS NULL OR l.user_id = p_user_id)
    GROUP BY l.feature_type, l.model
    ORDER BY total_cost_usd DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_monthly_cost_summary IS
'Returns cost summary grouped by feature type and model for a given time period';

-- Function: Get daily cost trend
CREATE OR REPLACE FUNCTION get_daily_cost_trend(
    p_days INTEGER DEFAULT 30,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    date DATE,
    answer_coding_cost NUMERIC,
    codeframe_cost NUMERIC,
    total_cost NUMERIC,
    answer_coding_requests BIGINT,
    codeframe_requests BIGINT,
    total_requests BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_costs AS (
        SELECT
            DATE(created_at) AS log_date,
            feature_type,
            SUM(cost_usd) AS cost,
            COUNT(*) AS requests
        FROM ai_usage_logs
        WHERE created_at >= CURRENT_DATE - p_days
            AND (p_user_id IS NULL OR user_id = p_user_id)
        GROUP BY DATE(created_at), feature_type
    ),
    date_series AS (
        SELECT generate_series(
            CURRENT_DATE - p_days,
            CURRENT_DATE - 1,
            '1 day'::INTERVAL
        )::DATE AS date
    )
    SELECT
        ds.date,
        COALESCE(ROUND(MAX(CASE WHEN dc.feature_type = 'answer_coding' THEN dc.cost END)::NUMERIC, 6), 0) AS answer_coding_cost,
        COALESCE(ROUND(MAX(CASE WHEN dc.feature_type = 'codeframe_generation' THEN dc.cost END)::NUMERIC, 6), 0) AS codeframe_cost,
        COALESCE(ROUND(SUM(dc.cost)::NUMERIC, 6), 0) AS total_cost,
        COALESCE(MAX(CASE WHEN dc.feature_type = 'answer_coding' THEN dc.requests END)::BIGINT, 0) AS answer_coding_requests,
        COALESCE(MAX(CASE WHEN dc.feature_type = 'codeframe_generation' THEN dc.requests END)::BIGINT, 0) AS codeframe_requests,
        COALESCE(SUM(dc.requests)::BIGINT, 0) AS total_requests
    FROM date_series ds
    LEFT JOIN daily_costs dc ON dc.log_date = ds.date
    GROUP BY ds.date
    ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_daily_cost_trend IS
'Returns daily cost trend for the last N days with breakdown by feature type';

-- ============================================================================
-- PART 5: Enable RLS and create policies
-- ============================================================================

-- Enable RLS on ai_usage_logs
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for backend operations)
CREATE POLICY "Service role has full access"
    ON ai_usage_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Users can view their own usage (when auth is enabled)
CREATE POLICY "Users can view own AI usage"
    ON ai_usage_logs
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR
        -- Allow viewing category-level costs for owned categories
        category_id IN (
            SELECT id FROM categories
            WHERE created_by = (auth.jwt() ->> 'email')::VARCHAR
        )
    );

-- Policy: System can insert logs (backend operations)
CREATE POLICY "System can insert AI usage logs"
    ON ai_usage_logs
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- Policy: Allow anonymous read for development (can be removed in production)
CREATE POLICY "Allow anonymous read for development"
    ON ai_usage_logs
    FOR SELECT
    TO anon
    USING (true);

COMMENT ON POLICY "Service role has full access" ON ai_usage_logs IS
'Backend services (using SERVICE_ROLE_KEY) can read/write all logs';

COMMENT ON POLICY "Users can view own AI usage" ON ai_usage_logs IS
'Authenticated users can view logs for their own usage or their categories';

-- ============================================================================
-- PART 6: Create materialized view for fast queries (optional optimization)
-- ============================================================================

-- Note: This is commented out by default. Uncomment if you need faster dashboard queries
-- and set up a cron job to refresh it periodically.

/*
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_cost_summary_daily AS
SELECT
    DATE(created_at) AS date,
    feature_type,
    model,
    category_id,
    COUNT(*) AS request_count,
    SUM(input_tokens) AS total_input_tokens,
    SUM(output_tokens) AS total_output_tokens,
    SUM(cost_usd) AS total_cost_usd,
    AVG(cost_usd) AS avg_cost_usd,
    MIN(created_at) AS first_request_at,
    MAX(created_at) AS last_request_at
FROM ai_usage_logs
GROUP BY DATE(created_at), feature_type, model, category_id;

CREATE INDEX IF NOT EXISTS idx_ai_cost_summary_daily_date
    ON ai_cost_summary_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_summary_daily_feature
    ON ai_cost_summary_daily(feature_type);

COMMENT ON MATERIALIZED VIEW ai_cost_summary_daily IS
'Pre-aggregated daily cost summaries for fast dashboard queries. Refresh daily.';
*/

-- ============================================================================
-- PART 7: Insert sample data (for testing)
-- ============================================================================

-- This is for testing only - comment out in production
-- Uncomment to insert sample data:

/*
-- Sample answer coding log
INSERT INTO ai_usage_logs (
    feature_type,
    category_id,
    model,
    input_tokens,
    output_tokens,
    cost_usd,
    metadata
) VALUES (
    'answer_coding',
    1,  -- Adjust category_id as needed
    'gpt-4o-mini',
    1500,
    250,
    0.000375,
    '{"confidence": 0.95, "auto_confirmed": true}'::jsonb
);

-- Sample codeframe generation log
INSERT INTO ai_usage_logs (
    feature_type,
    category_id,
    model,
    input_tokens,
    output_tokens,
    cost_usd,
    metadata
) VALUES (
    'codeframe_generation',
    1,  -- Adjust category_id as needed
    'claude-sonnet-4-5-20251022',
    15000,
    5000,
    0.125,
    '{"n_clusters": 8, "n_codes": 24, "mece_score": 87.5}'::jsonb
);
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_usage_logs') THEN
        RAISE NOTICE '✅ ai_usage_logs table created successfully';
    ELSE
        RAISE WARNING '❌ ai_usage_logs table was not created';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'codeframe_generations' AND column_name = 'ai_cost_usd') THEN
        RAISE NOTICE '✅ codeframe_generations AI cost columns verified';
    ELSE
        RAISE WARNING '⚠️  codeframe_generations may be missing AI cost columns';
    END IF;
END $$;

-- Print summary
DO $$
DECLARE
    log_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO log_count FROM ai_usage_logs;
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  - ai_usage_logs table: Created';
    RAISE NOTICE '  - Current log count: %', log_count;
    RAISE NOTICE '  - Helper functions: 2 created';
    RAISE NOTICE '  - Triggers: 2 created';
    RAISE NOTICE '  - RLS policies: 4 created';
    RAISE NOTICE '========================================';
END $$;
