-- ═══════════════════════════════════════════════════════════════
-- 🧪 AI Suggestions Testing & Verification Script
-- ═══════════════════════════════════════════════════════════════
-- Purpose: Test that ai_suggestions column and functions work correctly
-- Run this AFTER applying 2025-10-07-add-ai-suggestions.sql
-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 1: Verify Column Exists
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'answers' 
AND column_name = 'ai_suggestions';

-- Expected output:
-- column_name    | data_type | is_nullable
-- ai_suggestions | jsonb     | YES

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 2: Verify Indexes Created
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'answers' 
AND indexname LIKE '%ai_suggestions%';

-- Expected output: 2 indexes
-- idx_answers_ai_suggestions
-- idx_answers_ai_suggestions_model

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 3: Verify Helper Functions Exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN (
  'get_high_confidence_suggestions',
  'get_ai_suggestion_accuracy',
  'get_top_ai_suggested_codes'
)
ORDER BY routine_name;

-- Expected output: 3 functions

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 4: Test Insert Sample Data
-- Create a test suggestion on the first answer
UPDATE answers 
SET ai_suggestions = '{
  "suggestions": [
    {
      "code_id": "test-123",
      "code_name": "Test Brand A",
      "confidence": 0.95,
      "reasoning": "This is a test suggestion with high confidence"
    },
    {
      "code_id": "test-456",
      "code_name": "Test Brand B",
      "confidence": 0.72,
      "reasoning": "This is a secondary test suggestion"
    }
  ],
  "model": "gpt-4.1-nano",
  "timestamp": "2025-10-07T12:00:00Z",
  "preset_used": "Test Preset"
}'::jsonb,
ai_suggested_code = 'Test Brand A'
WHERE id = (SELECT MIN(id) FROM answers)
RETURNING id, answer_text, ai_suggestions->>'model' as model;

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 5: Verify Data Structure
SELECT 
  id,
  answer_text,
  jsonb_typeof(ai_suggestions) as type,
  ai_suggestions->>'model' as model,
  ai_suggestions->>'timestamp' as timestamp,
  jsonb_array_length(ai_suggestions->'suggestions') as num_suggestions
FROM answers
WHERE ai_suggestions IS NOT NULL
LIMIT 5;

-- Expected output: Should show test data with type='object', num_suggestions=2

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 6: Test Query Individual Suggestions
SELECT 
  a.id,
  a.answer_text,
  suggestion->>'code_name' as suggested_code,
  (suggestion->>'confidence')::REAL as confidence,
  suggestion->>'reasoning' as reasoning
FROM answers a,
  LATERAL jsonb_array_elements(a.ai_suggestions->'suggestions') suggestion
WHERE a.ai_suggestions IS NOT NULL
LIMIT 10;

-- Expected output: Should show individual suggestions with all fields

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 7: Test High Confidence Function
SELECT * FROM get_high_confidence_suggestions(
  NULL,   -- all categories
  0.85,   -- min confidence
  10      -- limit
);

-- Expected output: Should include our test suggestion

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 8: Test Top Suggested Codes Function
SELECT * FROM get_top_ai_suggested_codes(
  NULL,   -- all categories
  10      -- limit
);

-- Expected output: Should show "Test Brand A" with count and confidence stats

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 9: Test Accuracy Function
-- (Will only work if you have answers with both ai_suggested_code and selected_code)
SELECT * FROM get_ai_suggestion_accuracy(
  NULL,   -- all categories
  30      -- last 30 days
);

-- Expected output: Statistics about suggestion accuracy

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 10: Test JSONB Indexing Performance
EXPLAIN ANALYZE
SELECT * FROM answers 
WHERE ai_suggestions->>'model' = 'gpt-4.1-nano'
LIMIT 100;

-- Expected output: Should use index scan (check "Index Scan" in plan)

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 11: Test Complex Query (Multiple Filters)
SELECT 
  id,
  answer_text,
  ai_suggestions->'suggestions'->0->>'code_name' as top_suggestion,
  (ai_suggestions->'suggestions'->0->>'confidence')::REAL as confidence
FROM answers
WHERE 
  ai_suggestions IS NOT NULL
  AND (ai_suggestions->'suggestions'->0->>'confidence')::REAL > 0.90
  AND category_id = 1
ORDER BY (ai_suggestions->'suggestions'->0->>'confidence')::REAL DESC
LIMIT 20;

-- Expected output: Answers with high-confidence suggestions in category 1

-- ═══════════════════════════════════════════════════════════════

-- ✅ Step 12: Clean Up Test Data (Optional)
-- Uncomment to remove test suggestion
/*
UPDATE answers 
SET ai_suggestions = NULL,
    ai_suggested_code = NULL
WHERE ai_suggestions->>'model' = 'gpt-4.1-nano'
AND ai_suggestions->>'preset_used' = 'Test Preset';
*/

-- ═══════════════════════════════════════════════════════════════
-- 🎉 VERIFICATION COMPLETE
-- ═══════════════════════════════════════════════════════════════

-- If all steps passed, you should see:
-- ✅ Column exists (jsonb type)
-- ✅ 2 indexes created
-- ✅ 3 helper functions exist
-- ✅ Test data inserted successfully
-- ✅ Queries return expected results
-- ✅ Functions work correctly
-- ✅ Index is being used (check EXPLAIN)

-- 🚀 Ready to use AI suggestions in production!

-- ═══════════════════════════════════════════════════════════════
-- 📊 ADDITIONAL USEFUL QUERIES
-- ═══════════════════════════════════════════════════════════════

-- Count answers with AI suggestions by category
SELECT 
  c.name as category_name,
  COUNT(a.id) as answers_with_suggestions,
  ROUND(AVG((a.ai_suggestions->'suggestions'->0->>'confidence')::REAL)::NUMERIC, 3) as avg_confidence
FROM answers a
JOIN categories c ON a.category_id = c.id
WHERE a.ai_suggestions IS NOT NULL
GROUP BY c.name
ORDER BY answers_with_suggestions DESC;

-- Find suggestions that differ from user selections
SELECT 
  a.id,
  a.answer_text,
  a.ai_suggested_code as ai_suggested,
  a.selected_code as user_selected,
  (a.ai_suggestions->'suggestions'->0->>'confidence')::REAL as ai_confidence,
  a.ai_suggestions->'suggestions'->0->>'reasoning' as ai_reasoning
FROM answers a
WHERE 
  a.ai_suggested_code IS NOT NULL
  AND a.selected_code IS NOT NULL
  AND a.ai_suggested_code != a.selected_code
ORDER BY (a.ai_suggestions->'suggestions'->0->>'confidence')::REAL DESC
LIMIT 50;

-- Get suggestion distribution by confidence range
SELECT 
  CASE 
    WHEN (suggestion->>'confidence')::REAL >= 0.95 THEN '95-100%'
    WHEN (suggestion->>'confidence')::REAL >= 0.85 THEN '85-95%'
    WHEN (suggestion->>'confidence')::REAL >= 0.75 THEN '75-85%'
    WHEN (suggestion->>'confidence')::REAL >= 0.50 THEN '50-75%'
    ELSE '<50%'
  END as confidence_range,
  COUNT(*) as count
FROM answers a,
  LATERAL jsonb_array_elements(a.ai_suggestions->'suggestions') suggestion
WHERE a.ai_suggestions IS NOT NULL
GROUP BY confidence_range
ORDER BY confidence_range DESC;

-- ═══════════════════════════════════════════════════════════════


