-- ════════════════════════════════════════════════════════════════
-- SAFE Performance Indexes - Only Core Tables
-- Created: 2025-10-23
-- Purpose: Critical indexes for answers, codes, categories ONLY
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- ANSWERS TABLE INDEXES
-- ────────────────────────────────────────────────────────────────

-- Most common query: category + status filtering
CREATE INDEX IF NOT EXISTS idx_answers_category_status
  ON answers(category_id, general_status);

-- Category + created_at for sorting
CREATE INDEX IF NOT EXISTS idx_answers_category_created
  ON answers(category_id, created_at DESC);

-- JSONB index for ai_suggestions (if column exists)
CREATE INDEX IF NOT EXISTS idx_answers_ai_suggestions
  ON answers USING GIN(ai_suggestions)
  WHERE ai_suggestions IS NOT NULL;

-- Uncategorized answers (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_answers_uncategorized
  ON answers(category_id, created_at DESC)
  WHERE general_status = 'uncategorized';

-- Answers with AI suggestions
CREATE INDEX IF NOT EXISTS idx_answers_with_ai
  ON answers(category_id, created_at DESC)
  WHERE ai_suggestions IS NOT NULL;

-- Duplicate detection
CREATE INDEX IF NOT EXISTS idx_answers_duplicate_check
  ON answers(answer_text, category_id);

-- ────────────────────────────────────────────────────────────────
-- CODES TABLE INDEXES
-- ────────────────────────────────────────────────────────────────

-- Code name lookup
CREATE INDEX IF NOT EXISTS idx_codes_name
  ON codes(name);

-- Case-insensitive search
CREATE INDEX IF NOT EXISTS idx_codes_name_lower
  ON codes(LOWER(name));

-- ────────────────────────────────────────────────────────────────
-- CATEGORIES TABLE INDEXES
-- ────────────────────────────────────────────────────────────────

-- Category name lookup
CREATE INDEX IF NOT EXISTS idx_categories_name
  ON categories(name);

-- ────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ────────────────────────────────────────────────────────────────

-- Run this to verify indexes are created:
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('answers', 'codes', 'categories');

