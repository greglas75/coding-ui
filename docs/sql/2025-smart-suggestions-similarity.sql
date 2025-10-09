-- FILE: docs/sql/2025-smart-suggestions-similarity.sql
-- Run this in Supabase SQL Editor

-- ============================================================================
-- SMART SUGGESTIONS based on TEXT SIMILARITY (not just frequency)
-- ============================================================================

-- Enable pg_trgm extension for similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop old function if exists
DROP FUNCTION IF EXISTS get_smart_suggestions(TEXT, TEXT, INT, VARCHAR);

-- Create new similarity-based function
CREATE OR REPLACE FUNCTION get_smart_suggestions(
  p_answer_text TEXT,
  p_translation TEXT DEFAULT NULL,
  p_category_id INT DEFAULT NULL,
  p_language VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  code_id INT,
  code_name VARCHAR,
  confidence FLOAT,
  times_coded INT,
  avg_similarity FLOAT,
  similar_answers TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH similar_coded_answers AS (
    -- Find similar answers that were already coded
    SELECT 
      a.id,
      a.answer_text,
      a.translation_en,
      ac.code_id,
      c.name as code_name,
      -- Calculate similarity score (0.0 - 1.0)
      GREATEST(
        similarity(LOWER(a.answer_text), LOWER(p_answer_text)),
        CASE 
          WHEN a.translation_en IS NOT NULL AND p_translation IS NOT NULL
          THEN similarity(LOWER(a.translation_en), LOWER(p_translation))
          ELSE 0.0 
        END
      ) as similarity_score
    FROM answers a
    JOIN answer_codes ac ON a.id = ac.answer_id
    JOIN codes c ON ac.code_id = c.id
    WHERE 
      -- Filter by category if provided
      (p_category_id IS NULL OR a.category_id = p_category_id)
      -- Filter by language if provided
      AND (p_language IS NULL OR a.language = p_language)
      -- Only coded answers
      AND ac.code_id IS NOT NULL
      -- Only similar answers (threshold 0.3)
      AND (
        similarity(LOWER(a.answer_text), LOWER(p_answer_text)) > 0.3
        OR (
          a.translation_en IS NOT NULL 
          AND p_translation IS NOT NULL
          AND similarity(LOWER(a.translation_en), LOWER(p_translation)) > 0.3
        )
      )
  ),
  grouped_suggestions AS (
    SELECT 
      code_id,
      code_name,
      COUNT(*)::int as times_coded,
      AVG(similarity_score) as avg_similarity,
      ARRAY_AGG(DISTINCT answer_text ORDER BY answer_text) FILTER (WHERE answer_text IS NOT NULL) as similar_answers
    FROM similar_coded_answers
    GROUP BY code_id, code_name
  )
  SELECT 
    code_id,
    code_name,
    -- Confidence calculation:
    -- 70% weight on similarity + 30% weight on frequency
    (avg_similarity * 0.7 + 
     (times_coded::float / NULLIF(MAX(times_coded) OVER (), 0)) * 0.3
    )::float as confidence,
    times_coded,
    avg_similarity::float,
    similar_answers
  FROM grouped_suggestions
  WHERE times_coded >= 2  -- Minimum 2 similar answers for confidence
  ORDER BY confidence DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Create index for faster similarity searches
CREATE INDEX IF NOT EXISTS idx_answers_text_trgm ON answers USING gin (lower(answer_text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_answers_translation_trgm ON answers USING gin (lower(translation_en) gin_trgm_ops);

-- Test the function
SELECT * FROM get_smart_suggestions(
  'signal',           -- answer_text
  'signal',           -- translation
  1,                  -- category_id (optional)
  'en'                -- language (optional)
);

-- Expected output:
-- code_id | code_name | confidence | times_coded | avg_similarity | similar_answers
-- --------|-----------|------------|-------------|----------------|------------------
-- 15      | Signal    | 0.95       | 20          | 0.98           | {signal, signa, signal tp}
