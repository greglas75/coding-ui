-- ═══════════════════════════════════════════════════════════════
-- 🎯 AI Suggestions Column Migration
-- ═══════════════════════════════════════════════════════════════
-- Purpose: Add JSONB column to store AI suggestions for each answer
-- Created: 2025-10-07
-- Description: Stores multiple AI-suggested codes with confidence scores
-- ═══════════════════════════════════════════════════════════════

-- ✅ Add ai_suggestions column to answers table
ALTER TABLE answers 
  ADD COLUMN IF NOT EXISTS ai_suggestions JSONB;

-- ✅ Add index for JSONB queries (for filtering by model, confidence, etc.)
CREATE INDEX IF NOT EXISTS idx_answers_ai_suggestions 
  ON answers USING GIN (ai_suggestions);

-- ✅ Add index for specific JSONB path queries (get all suggestions from specific model)
CREATE INDEX IF NOT EXISTS idx_answers_ai_suggestions_model 
  ON answers ((ai_suggestions->>'model'));

-- ✅ Add comments for documentation
COMMENT ON COLUMN answers.ai_suggestions IS 
  'AI suggestions for this answer in JSONB format. Structure: {
    "suggestions": [
      {
        "code_id": "uuid",
        "code_name": "Nike",
        "confidence": 0.95,
        "reasoning": "User mentioned nike in response"
      }
    ],
    "model": "gpt-4.1-nano",
    "timestamp": "2025-10-07T12:00:00Z",
    "preset_used": "LLM Brand List"
  }';

-- ═══════════════════════════════════════════════════════════════
-- 📊 HELPER FUNCTIONS FOR AI SUGGESTIONS
-- ═══════════════════════════════════════════════════════════════

-- ✅ Get answers with high-confidence AI suggestions
CREATE OR REPLACE FUNCTION get_high_confidence_suggestions(
  p_category_id BIGINT DEFAULT NULL,
  p_min_confidence REAL DEFAULT 0.85,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  answer_id BIGINT,
  answer_text TEXT,
  suggested_code TEXT,
  confidence REAL,
  reasoning TEXT,
  model TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as answer_id,
    a.answer_text,
    (suggestion->>'code_name')::TEXT as suggested_code,
    (suggestion->>'confidence')::REAL as confidence,
    (suggestion->>'reasoning')::TEXT as reasoning,
    (a.ai_suggestions->>'model')::TEXT as model
  FROM answers a,
    LATERAL jsonb_array_elements(a.ai_suggestions->'suggestions') suggestion
  WHERE 
    a.ai_suggestions IS NOT NULL
    AND (suggestion->>'confidence')::REAL >= p_min_confidence
    AND (p_category_id IS NULL OR a.category_id = p_category_id)
    AND a.selected_code IS NULL -- Only uncoded answers
  ORDER BY (suggestion->>'confidence')::REAL DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ✅ Get AI suggestion accuracy (compare selected_code vs ai_suggested_code)
CREATE OR REPLACE FUNCTION get_ai_suggestion_accuracy(
  p_category_id BIGINT DEFAULT NULL,
  p_days INT DEFAULT 30
)
RETURNS TABLE(
  total_suggestions BIGINT,
  correct_suggestions BIGINT,
  accuracy_rate REAL,
  avg_confidence REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_suggestions,
    SUM(CASE WHEN a.selected_code = a.ai_suggested_code THEN 1 ELSE 0 END)::BIGINT as correct_suggestions,
    (SUM(CASE WHEN a.selected_code = a.ai_suggested_code THEN 1 ELSE 0 END)::REAL / NULLIF(COUNT(*), 0))::REAL as accuracy_rate,
    AVG(
      (ai_suggestions->'suggestions'->0->>'confidence')::REAL
    )::REAL as avg_confidence
  FROM answers a
  WHERE 
    a.ai_suggested_code IS NOT NULL
    AND a.selected_code IS NOT NULL
    AND a.updated_at >= NOW() - (p_days || ' days')::INTERVAL
    AND (p_category_id IS NULL OR a.category_id = p_category_id);
END;
$$ LANGUAGE plpgsql;

-- ✅ Get top suggested codes by frequency
CREATE OR REPLACE FUNCTION get_top_ai_suggested_codes(
  p_category_id BIGINT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  code_name TEXT,
  suggestion_count BIGINT,
  avg_confidence REAL,
  min_confidence REAL,
  max_confidence REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (suggestion->>'code_name')::TEXT as code_name,
    COUNT(*)::BIGINT as suggestion_count,
    AVG((suggestion->>'confidence')::REAL)::REAL as avg_confidence,
    MIN((suggestion->>'confidence')::REAL)::REAL as min_confidence,
    MAX((suggestion->>'confidence')::REAL)::REAL as max_confidence
  FROM answers a,
    LATERAL jsonb_array_elements(a.ai_suggestions->'suggestions') suggestion
  WHERE 
    a.ai_suggestions IS NOT NULL
    AND (p_category_id IS NULL OR a.category_id = p_category_id)
  GROUP BY (suggestion->>'code_name')::TEXT
  ORDER BY suggestion_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- 🧪 TEST QUERIES & EXAMPLES
-- ═══════════════════════════════════════════════════════════════

-- Example: Insert sample AI suggestions
/*
UPDATE answers 
SET ai_suggestions = '{
  "suggestions": [
    {
      "code_id": "123",
      "code_name": "Nike",
      "confidence": 0.95,
      "reasoning": "User mentioned nike sneakers in their response"
    },
    {
      "code_id": "456",
      "code_name": "Adidas",
      "confidence": 0.75,
      "reasoning": "Similar brand mentioned secondarily"
    }
  ],
  "model": "gpt-4.1-nano",
  "timestamp": "2025-10-07T12:00:00Z",
  "preset_used": "LLM Brand List"
}'::jsonb
WHERE id = 1;
*/

-- Get all high-confidence suggestions (>85%)
-- SELECT * FROM get_high_confidence_suggestions();

-- Get accuracy for specific category
-- SELECT * FROM get_ai_suggestion_accuracy(1, 30);

-- Get top suggested codes
-- SELECT * FROM get_top_ai_suggested_codes();

-- Query examples: Get answers with suggestions above confidence threshold
/*
SELECT 
  a.id,
  a.answer_text,
  suggestion->>'code_name' as suggested_code,
  (suggestion->>'confidence')::REAL as confidence,
  a.ai_suggestions->>'model' as model
FROM answers a,
  LATERAL jsonb_array_elements(a.ai_suggestions->'suggestions') suggestion
WHERE 
  (suggestion->>'confidence')::REAL > 0.90
  AND a.category_id = 1
ORDER BY (suggestion->>'confidence')::REAL DESC;
*/

-- Query: Find answers where AI suggestion differs from selected code
/*
SELECT 
  a.id,
  a.answer_text,
  a.selected_code as user_selected,
  a.ai_suggested_code as ai_suggested,
  a.ai_suggestions->'suggestions'->0->>'confidence' as confidence,
  a.ai_suggestions->'suggestions'->0->>'reasoning' as reasoning
FROM answers a
WHERE 
  a.selected_code IS NOT NULL
  AND a.ai_suggested_code IS NOT NULL
  AND a.selected_code != a.ai_suggested_code
ORDER BY a.updated_at DESC
LIMIT 50;
*/

-- Query: Get suggestion distribution by model
/*
SELECT 
  ai_suggestions->>'model' as model,
  COUNT(*) as suggestion_count,
  AVG((ai_suggestions->'suggestions'->0->>'confidence')::REAL) as avg_confidence
FROM answers
WHERE ai_suggestions IS NOT NULL
GROUP BY ai_suggestions->>'model'
ORDER BY suggestion_count DESC;
*/

-- ═══════════════════════════════════════════════════════════════
-- 🧹 MAINTENANCE
-- ═══════════════════════════════════════════════════════════════

-- Validate JSONB structure
/*
SELECT 
  id,
  answer_text,
  jsonb_typeof(ai_suggestions) as type,
  jsonb_array_length(ai_suggestions->'suggestions') as num_suggestions
FROM answers
WHERE ai_suggestions IS NOT NULL
LIMIT 10;
*/

-- Clean up invalid suggestions (optional)
/*
UPDATE answers
SET ai_suggestions = NULL
WHERE 
  ai_suggestions IS NOT NULL
  AND (
    jsonb_typeof(ai_suggestions) != 'object'
    OR ai_suggestions->'suggestions' IS NULL
    OR jsonb_typeof(ai_suggestions->'suggestions') != 'array'
  );
*/

-- ✅ Migration Complete!


