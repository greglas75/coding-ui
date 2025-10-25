-- ============================================================================
-- AI Cost Dashboard - Database Verification Queries
-- ============================================================================
-- Purpose: Verify database schema, functions, indexes, and RLS policies
-- Run these queries to verify database setup is correct
-- ============================================================================

-- ============================================================================
-- STEP 1: Table & View Existence Checks
-- ============================================================================

-- Check 1: Does ai_usage_logs table exist?
SELECT
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_usage_logs'
  ) AS table_exists;

-- Check 2: Does ai_cost_unified view exist?
SELECT
  EXISTS (
    SELECT FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name = 'ai_cost_unified'
  ) AS view_exists;

-- ============================================================================
-- STEP 2: Column Verification
-- ============================================================================

-- Check 3: List all columns in ai_usage_logs
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'ai_usage_logs'
ORDER BY ordinal_position;

-- Check 4: Verify required columns exist
SELECT
  COUNT(*) FILTER (WHERE column_name = 'id') as has_id,
  COUNT(*) FILTER (WHERE column_name = 'feature_type') as has_feature_type,
  COUNT(*) FILTER (WHERE column_name = 'cost_usd') as has_cost_usd,
  COUNT(*) FILTER (WHERE column_name = 'model') as has_model,
  COUNT(*) FILTER (WHERE column_name = 'input_tokens') as has_input_tokens,
  COUNT(*) FILTER (WHERE column_name = 'output_tokens') as has_output_tokens,
  COUNT(*) FILTER (WHERE column_name = 'created_at') as has_created_at,
  COUNT(*) FILTER (WHERE column_name = 'metadata') as has_metadata,
  COUNT(*) FILTER (WHERE column_name = 'user_id') as has_user_id
FROM information_schema.columns
WHERE table_name = 'ai_usage_logs';

-- Expected: All counts should be 1

-- ============================================================================
-- STEP 3: Function Verification
-- ============================================================================

-- Check 5: Does get_monthly_cost_summary function exist?
SELECT
  EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'get_monthly_cost_summary'
  ) AS function_exists;

-- Check 6: Does get_daily_cost_trend function exist?
SELECT
  EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'get_daily_cost_trend'
  ) AS function_exists;

-- List all functions related to cost tracking
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname LIKE '%cost%'
  OR proname LIKE '%budget%';

-- ============================================================================
-- STEP 4: Index Verification
-- ============================================================================

-- Check 7: List all indexes on ai_usage_logs
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'ai_usage_logs'
ORDER BY indexname;

-- Check for specific important indexes
SELECT
  COUNT(*) FILTER (WHERE indexdef LIKE '%feature_type%') as has_feature_type_idx,
  COUNT(*) FILTER (WHERE indexdef LIKE '%created_at%') as has_created_at_idx,
  COUNT(*) FILTER (WHERE indexdef LIKE '%user_id%') as has_user_id_idx
FROM pg_indexes
WHERE tablename = 'ai_usage_logs';

-- ============================================================================
-- STEP 5: RLS Policy Verification
-- ============================================================================

-- Check 8: Is RLS enabled on ai_usage_logs?
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'ai_usage_logs';

-- Check 9: List all policies on ai_usage_logs
SELECT
  policyname AS policy_name,
  cmd AS command,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'ai_usage_logs'
ORDER BY policyname;

-- ============================================================================
-- STEP 6: Constraint Verification
-- ============================================================================

-- Check constraints on ai_usage_logs
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'ai_usage_logs'::regclass
ORDER BY contype, conname;

-- Check for CHECK constraint on feature_type
SELECT EXISTS (
  SELECT FROM pg_constraint
  WHERE conrelid = 'ai_usage_logs'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%feature_type%'
) AS has_feature_type_check;

-- ============================================================================
-- STEP 7: Sample Data Tests
-- ============================================================================

-- Check 10: Insert test data
INSERT INTO ai_usage_logs (
  feature_type,
  model,
  input_tokens,
  output_tokens,
  cost_usd,
  metadata
) VALUES (
  'answer_coding',
  'gpt-4o-mini',
  100,
  50,
  0.001,
  '{"test": true, "check_id": "db_verification"}'::jsonb
) RETURNING id, feature_type, model, cost_usd;

-- Check 11: Query test data
SELECT
  id,
  feature_type,
  model,
  input_tokens,
  output_tokens,
  cost_usd,
  created_at,
  metadata
FROM ai_usage_logs
WHERE metadata->>'test' = 'true'
  AND metadata->>'check_id' = 'db_verification';

-- Check 12: Verify data types and ranges
SELECT
  id,
  feature_type,
  cost_usd,
  (cost_usd > 0) AS cost_is_positive,
  (input_tokens > 0) AS has_input_tokens,
  (output_tokens >= 0) AS has_output_tokens,
  (created_at <= NOW()) AS timestamp_valid
FROM ai_usage_logs
WHERE metadata->>'check_id' = 'db_verification';

-- ============================================================================
-- STEP 8: Aggregation Query Tests
-- ============================================================================

-- Check 13: Test basic aggregations
SELECT
  feature_type,
  COUNT(*) as total_operations,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens
FROM ai_usage_logs
WHERE metadata->>'test' = 'true'
GROUP BY feature_type;

-- Check 14: Test date-based queries
SELECT
  DATE(created_at) as date,
  COUNT(*) as operations,
  SUM(cost_usd) as daily_cost
FROM ai_usage_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND metadata->>'test' = 'true'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- STEP 9: Performance Tests
-- ============================================================================

-- Check 15: Explain query plan for typical query
EXPLAIN ANALYZE
SELECT
  feature_type,
  COUNT(*) as count,
  SUM(cost_usd) as total_cost
FROM ai_usage_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND user_id IS NULL
GROUP BY feature_type;

-- Check execution time for detailed query
EXPLAIN ANALYZE
SELECT
  id,
  feature_type,
  model,
  cost_usd,
  created_at
FROM ai_usage_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- STEP 10: Cleanup Test Data
-- ============================================================================

-- Remove test data
DELETE FROM ai_usage_logs
WHERE metadata->>'test' = 'true'
  AND metadata->>'check_id' = 'db_verification'
RETURNING id;

-- Verify cleanup
SELECT COUNT(*) as remaining_test_records
FROM ai_usage_logs
WHERE metadata->>'test' = 'true'
  AND metadata->>'check_id' = 'db_verification';
-- Should return 0

-- ============================================================================
-- STEP 11: Current State Summary
-- ============================================================================

-- Get current database stats
SELECT
  (SELECT COUNT(*) FROM ai_usage_logs) as total_records,
  (SELECT COUNT(DISTINCT feature_type) FROM ai_usage_logs) as unique_features,
  (SELECT COUNT(DISTINCT model) FROM ai_usage_logs) as unique_models,
  (SELECT MIN(created_at) FROM ai_usage_logs) as oldest_record,
  (SELECT MAX(created_at) FROM ai_usage_logs) as newest_record,
  (SELECT SUM(cost_usd) FROM ai_usage_logs) as total_cost_all_time,
  (SELECT SUM(cost_usd) FROM ai_usage_logs WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as current_month_cost;

-- Feature type breakdown
SELECT
  feature_type,
  COUNT(*) as count,
  SUM(cost_usd)::DECIMAL(10,2) as total_cost,
  AVG(cost_usd)::DECIMAL(10,6) as avg_cost
FROM ai_usage_logs
GROUP BY feature_type
ORDER BY total_cost DESC;

-- ============================================================================
-- END OF VERIFICATION QUERIES
-- ============================================================================
