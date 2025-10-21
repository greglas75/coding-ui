-- ============================================================================
-- AI Cost Dashboard - Sample Data Seeding Script
-- ============================================================================
-- Purpose: Populate ai_usage_logs with realistic sample data for testing
-- Usage: psql -h host -U user -d database -f scripts/seed-cost-data.sql
-- Warning: This creates test data. Do not run in production!
-- ============================================================================

BEGIN;

-- Clean up any existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM ai_usage_logs WHERE metadata->>'test_data' = 'true';

-- ============================================================================
-- Answer Coding Sample Data (GPT-4o-mini)
-- ============================================================================
-- Generates 100 sample answer coding operations
-- - Distributed over last 30 days
-- - Realistic token counts and costs
-- - Varied by time of day and day of week
-- ============================================================================

INSERT INTO ai_usage_logs (
  feature_type,
  model,
  input_tokens,
  output_tokens,
  cost_usd,
  created_at,
  metadata
)
SELECT
  'answer_coding' AS feature_type,
  'gpt-4o-mini' AS model,

  -- Random input tokens: 500-1500 (typical for answer categorization)
  (500 + random() * 1000)::INTEGER AS input_tokens,

  -- Random output tokens: 50-300 (category assignments + reasoning)
  (50 + random() * 250)::INTEGER AS output_tokens,

  -- Cost calculation for GPT-4o-mini
  -- Input: $0.15 per 1M tokens = $0.00000015 per token
  -- Output: $0.60 per 1M tokens = $0.00000060 per token
  (
    ((500 + random() * 1000) * 0.00000015) +
    ((50 + random() * 250) * 0.00000060)
  )::DECIMAL(10, 6) AS cost_usd,

  -- Random timestamp in last 30 days
  -- Weighted towards business hours (9am-5pm weekdays)
  (
    NOW() -
    (random() * 30 || ' days')::INTERVAL -
    (
      CASE
        WHEN random() < 0.7 THEN (8 + random() * 8)::INTEGER -- Business hours
        ELSE (random() * 24)::INTEGER -- Any time
      END || ' hours'
    )::INTERVAL
  ) AS created_at,

  -- Metadata with test flag and descriptive info
  jsonb_build_object(
    'test_data', true,
    'answers_count', (1 + random() * 20)::INTEGER,
    'category_name',
      CASE (random() * 10)::INTEGER
        WHEN 0 THEN 'Customer Feedback'
        WHEN 1 THEN 'Product Issues'
        WHEN 2 THEN 'Feature Requests'
        WHEN 3 THEN 'Complaints'
        WHEN 4 THEN 'Praise'
        WHEN 5 THEN 'Questions'
        WHEN 6 THEN 'Technical Support'
        WHEN 7 THEN 'Billing Inquiries'
        WHEN 8 THEN 'General Comments'
        ELSE 'Other'
      END,
    'confidence',
      CASE
        WHEN random() < 0.6 THEN 'high'
        WHEN random() < 0.9 THEN 'medium'
        ELSE 'low'
      END
  ) AS metadata
FROM generate_series(1, 100);

-- ============================================================================
-- Codeframe Generation Sample Data (Claude Sonnet 4.5)
-- ============================================================================
-- Generates 15 sample codeframe generation operations
-- - More expensive than answer coding
-- - Larger token counts
-- - Less frequent (spread over 30 days)
-- ============================================================================

INSERT INTO ai_usage_logs (
  feature_type,
  model,
  input_tokens,
  output_tokens,
  cost_usd,
  created_at,
  metadata
)
SELECT
  'codeframe_generation' AS feature_type,
  'claude-sonnet-4-5' AS model,

  -- Random input tokens: 2000-8000 (sample responses + instructions)
  (2000 + random() * 6000)::INTEGER AS input_tokens,

  -- Random output tokens: 500-2000 (generated codeframe)
  (500 + random() * 1500)::INTEGER AS output_tokens,

  -- Cost calculation for Claude Sonnet 4.5
  -- Input: $3 per 1M tokens = $0.000003 per token
  -- Output: $15 per 1M tokens = $0.000015 per token
  (
    ((2000 + random() * 6000) * 0.000003) +
    ((500 + random() * 1500) * 0.000015)
  )::DECIMAL(10, 6) AS cost_usd,

  -- Random timestamp in last 30 days
  -- Less frequent than answer coding
  (
    NOW() -
    (random() * 30 || ' days')::INTERVAL -
    ((random() * 24)::INTEGER || ' hours')::INTERVAL
  ) AS created_at,

  -- Metadata for codeframe generation
  jsonb_build_object(
    'test_data', true,
    'samples_count', (10 + random() * 90)::INTEGER,
    'codes_generated', (5 + random() * 45)::INTEGER,
    'iteration', (random() < 0.3) THEN 2 ELSE 1, -- Sometimes we regenerate
    'codeframe_type',
      CASE (random() * 5)::INTEGER
        WHEN 0 THEN 'Open-ended survey responses'
        WHEN 1 THEN 'Interview transcripts'
        WHEN 2 THEN 'Customer feedback'
        WHEN 3 THEN 'Focus group notes'
        ELSE 'Mixed qualitative data'
      END
  ) AS metadata
FROM generate_series(1, 15);

-- ============================================================================
-- Add some specific high-cost outliers for testing
-- ============================================================================
-- These represent unusually expensive operations

-- Very large batch of answer coding
INSERT INTO ai_usage_logs (
  feature_type, model, input_tokens, output_tokens, cost_usd, created_at, metadata
) VALUES (
  'answer_coding',
  'gpt-4o-mini',
  8500,  -- Large batch
  1200,
  0.001995,  -- About $0.002
  NOW() - INTERVAL '5 days',
  '{"test_data": true, "answers_count": 150, "category_name": "Large Survey Batch", "note": "Outlier - very large batch"}'::JSONB
);

-- Complex codeframe with multiple iterations
INSERT INTO ai_usage_logs (
  feature_type, model, input_tokens, output_tokens, cost_usd, created_at, metadata
) VALUES (
  'codeframe_generation',
  'claude-sonnet-4-5',
  12000,  -- Very large input
  3500,   -- Complex output
  0.0885,  -- About $0.09
  NOW() - INTERVAL '12 days',
  '{"test_data": true, "samples_count": 200, "codes_generated": 75, "iteration": 3, "note": "Outlier - complex project with iterations"}'::JSONB
);

-- ============================================================================
-- Create a pattern showing cost increase over time
-- ============================================================================
-- Simulates increasing usage as platform adoption grows

INSERT INTO ai_usage_logs (
  feature_type, model, input_tokens, output_tokens, cost_usd, created_at, metadata
)
SELECT
  'answer_coding',
  'gpt-4o-mini',
  (600 + random() * 800 + (week_num * 50))::INTEGER,  -- Increases with each week
  (80 + random() * 150 + (week_num * 10))::INTEGER,
  (
    ((600 + random() * 800 + (week_num * 50)) * 0.00000015) +
    ((80 + random() * 150 + (week_num * 10)) * 0.00000060)
  )::DECIMAL(10, 6),
  NOW() - ((4 - week_num) * 7 || ' days')::INTERVAL - (random() * 7 || ' days')::INTERVAL,
  jsonb_build_object(
    'test_data', true,
    'answers_count', (5 + random() * 15)::INTEGER,
    'category_name', 'Growing Usage Pattern',
    'week_number', week_num
  )
FROM generate_series(0, 4) AS week_num,
     generate_series(1, 5);  -- 5 operations per week

-- ============================================================================
-- Summary Statistics
-- ============================================================================

DO $$
DECLARE
  total_records INTEGER;
  total_cost DECIMAL(10, 2);
  answer_coding_count INTEGER;
  codeframe_count INTEGER;
  date_range TEXT;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO total_records
  FROM ai_usage_logs
  WHERE metadata->>'test_data' = 'true';

  -- Calculate total cost
  SELECT SUM(cost_usd)::DECIMAL(10, 2) INTO total_cost
  FROM ai_usage_logs
  WHERE metadata->>'test_data' = 'true';

  -- Count by feature type
  SELECT COUNT(*) INTO answer_coding_count
  FROM ai_usage_logs
  WHERE metadata->>'test_data' = 'true' AND feature_type = 'answer_coding';

  SELECT COUNT(*) INTO codeframe_count
  FROM ai_usage_logs
  WHERE metadata->>'test_data' = 'true' AND feature_type = 'codeframe_generation';

  -- Date range
  SELECT
    TO_CHAR(MIN(created_at), 'YYYY-MM-DD') || ' to ' || TO_CHAR(MAX(created_at), 'YYYY-MM-DD')
    INTO date_range
  FROM ai_usage_logs
  WHERE metadata->>'test_data' = 'true';

  -- Output summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sample Data Seeding Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total records inserted: %', total_records;
  RAISE NOTICE 'Total sample cost: $%', total_cost;
  RAISE NOTICE 'Answer coding operations: %', answer_coding_count;
  RAISE NOTICE 'Codeframe generations: %', codeframe_count;
  RAISE NOTICE 'Date range: %', date_range;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Dashboard should now show populated charts!';
  RAISE NOTICE 'Visit: http://localhost:5173/cost-dashboard';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- Cleanup Script (Optional)
-- ============================================================================
-- To remove all test data, run:
-- DELETE FROM ai_usage_logs WHERE metadata->>'test_data' = 'true';
-- ============================================================================

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify data was inserted correctly:

-- Daily cost breakdown
-- SELECT
--   DATE(created_at) AS date,
--   feature_type,
--   COUNT(*) AS operations,
--   SUM(cost_usd)::DECIMAL(10, 2) AS daily_cost
-- FROM ai_usage_logs
-- WHERE metadata->>'test_data' = 'true'
-- GROUP BY DATE(created_at), feature_type
-- ORDER BY date DESC;

-- Cost by feature type
-- SELECT
--   feature_type,
--   COUNT(*) AS total_operations,
--   SUM(cost_usd)::DECIMAL(10, 2) AS total_cost,
--   AVG(cost_usd)::DECIMAL(10, 6) AS avg_cost,
--   SUM(input_tokens) AS total_input_tokens,
--   SUM(output_tokens) AS total_output_tokens
-- FROM ai_usage_logs
-- WHERE metadata->>'test_data' = 'true'
-- GROUP BY feature_type;
