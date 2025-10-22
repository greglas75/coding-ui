-- ============================================================
-- 🗑️ Clear Old AI Suggestions (Before Search Query Update)
-- ============================================================
-- This removes AI suggestions that don't have the new fields:
-- - searchQuery (added for transparency)
-- - categoryName (added for better context)
-- - visionResult (optional, for Gemini Vision analysis)
--
-- Users can regenerate suggestions with the 🔄 button to get:
-- ✅ Full search query with category ("Toothpaste crest")
-- ✅ Vision AI analysis results
-- ✅ Better web context
-- ============================================================

-- First, let's see how many old suggestions we have
SELECT
  COUNT(*) as total_with_suggestions,
  COUNT(CASE WHEN ai_suggestions->>'searchQuery' IS NULL THEN 1 END) as old_format,
  COUNT(CASE WHEN ai_suggestions->>'searchQuery' IS NOT NULL THEN 1 END) as new_format
FROM answers
WHERE ai_suggestions IS NOT NULL;

-- Clear old AI suggestions (without searchQuery or categoryName)
UPDATE answers
SET
  ai_suggestions = NULL,
  ai_suggested_code = NULL  -- Also clear the suggested code
WHERE
  ai_suggestions IS NOT NULL
  AND (
    ai_suggestions->>'searchQuery' IS NULL
    OR ai_suggestions->>'categoryName' IS NULL
  );

-- Verify: Show remaining suggestions (should only have new format)
SELECT
  id,
  answer_text,
  ai_suggestions->>'searchQuery' as search_query,
  ai_suggestions->>'categoryName' as category_name,
  jsonb_array_length(ai_suggestions->'suggestions') as num_suggestions
FROM answers
WHERE ai_suggestions IS NOT NULL
LIMIT 10;

-- Summary
SELECT
  'Old suggestions cleared!' as status,
  COUNT(*) as remaining_suggestions
FROM answers
WHERE ai_suggestions IS NOT NULL;
