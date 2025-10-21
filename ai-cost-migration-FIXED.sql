-- ============================================================================
-- AI Cost Tracking Migration - FIXED VERSION
-- Creates ai_usage_logs table for unified cost tracking
-- ============================================================================

-- Create ai_usage_logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN ('answer_coding', 'codeframe_generation')),
    user_id UUID,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES codeframe_generations(id) ON DELETE SET NULL,
    answer_id INTEGER REFERENCES answers(id) ON DELETE SET NULL,
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature_type ON ai_usage_logs(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_date ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_category ON ai_usage_logs(category_id);

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role has full access
CREATE POLICY IF NOT EXISTS "Service role has full access"
    ON ai_usage_logs FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- RLS Policy: Allow all inserts (for logging from backend)
CREATE POLICY IF NOT EXISTS "Allow all inserts"
    ON ai_usage_logs FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- RLS Policy: Allow all selects (can be restricted later)
CREATE POLICY IF NOT EXISTS "Allow all selects"
    ON ai_usage_logs FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

-- Add AI cost columns to codeframe_generations if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'codeframe_generations' AND column_name = 'ai_model') THEN
        ALTER TABLE codeframe_generations ADD COLUMN ai_model VARCHAR(100);
        ALTER TABLE codeframe_generations ADD COLUMN ai_input_tokens INTEGER;
        ALTER TABLE codeframe_generations ADD COLUMN ai_output_tokens INTEGER;
        ALTER TABLE codeframe_generations ADD COLUMN ai_cost_usd DECIMAL(10, 6);
        RAISE NOTICE 'Added AI cost columns to codeframe_generations';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'AI Cost Tracking Migration Complete!';
    RAISE NOTICE '  - ai_usage_logs table: Created';
    RAISE NOTICE '  - Indexes: 4 created';
    RAISE NOTICE '  - RLS policies: 3 created';
    RAISE NOTICE '  - codeframe_generations: AI columns added';
    RAISE NOTICE '========================================';
END $$;
