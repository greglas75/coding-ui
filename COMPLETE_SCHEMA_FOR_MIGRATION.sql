-- ═══════════════════════════════════════════════════════════════
-- 🎯 TGM Research - Complete Database Schema for Supabase Migration
-- ═══════════════════════════════════════════════════════════════
-- Purpose: Full database schema for migrating from Free to Paid tier
-- Created: 2025-10-13
-- Usage: Run this entire file in Supabase SQL Editor (new project)
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 📋 STEP 1: CREATE MAIN TABLES
-- ───────────────────────────────────────────────────────────────

-- Table: categories
-- Description: Coding categories (e.g., "Home Fragrances", "Sports Brands")
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT GENERATED ALWAYS AS (regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) STORED,
  use_web_context BOOLEAN DEFAULT TRUE,  -- Enable Google Search context for AI
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: codes
-- Description: Coding codes (e.g., "Nike", "Adidas", "Lavender")
CREATE TABLE IF NOT EXISTS codes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT GENERATED ALWAYS AS (regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) STORED,
  is_whitelisted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: codes_categories
-- Description: N:M relationship between codes and categories
CREATE TABLE IF NOT EXISTS codes_categories (
  code_id BIGINT NOT NULL REFERENCES codes(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (code_id, category_id)
);

-- Table: answers
-- Description: Survey responses to be categorized (MAIN TABLE - 10k+ rows)
-- NOTE: This assumes you already have an 'answers' table from import
-- If not, create it with this structure:
CREATE TABLE IF NOT EXISTS answers (
  id BIGSERIAL PRIMARY KEY,
  answer_text TEXT NOT NULL,
  translation TEXT,
  translation_en TEXT,                    -- AI-generated translation
  language TEXT,
  country TEXT,
  quick_status TEXT CHECK (quick_status IN ('Other','Ignore','Global Blacklist','Blacklist','Confirmed')),
  general_status TEXT,
  selected_code TEXT,                     -- User-selected code
  ai_suggested_code TEXT,                 -- Top AI suggestion
  ai_suggestions JSONB,                   -- Full AI suggestions with confidence
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  coding_date TIMESTAMPTZ,
  confirmed_by TEXT,                      -- Email of user who confirmed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: answer_codes
-- Description: N:M relationship between answers and codes
CREATE TABLE IF NOT EXISTS answer_codes (
  answer_id BIGINT REFERENCES answers(id) ON DELETE CASCADE,
  code_id BIGINT REFERENCES codes(id) ON DELETE CASCADE,
  PRIMARY KEY (answer_id, code_id)
);

-- Table: file_imports
-- Description: Track all file uploads for audit
CREATE TABLE IF NOT EXISTS file_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  category_name TEXT,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  rows_imported INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  user_email TEXT DEFAULT 'system',
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  file_size_kb NUMERIC(10, 2),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- 📊 STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ───────────────────────────────────────────────────────────────

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Indexes for codes
CREATE INDEX IF NOT EXISTS idx_codes_slug ON codes(slug);
CREATE INDEX IF NOT EXISTS idx_codes_is_whitelisted ON codes(is_whitelisted);

-- Indexes for answers (CRITICAL for 10k+ rows)
CREATE INDEX IF NOT EXISTS idx_answers_language ON answers(language);
CREATE INDEX IF NOT EXISTS idx_answers_country ON answers(country);
CREATE INDEX IF NOT EXISTS idx_answers_general_status ON answers(general_status);
CREATE INDEX IF NOT EXISTS idx_answers_quick_status ON answers(quick_status);
CREATE INDEX IF NOT EXISTS idx_answers_coding_date ON answers(coding_date DESC);
CREATE INDEX IF NOT EXISTS idx_answers_category_id ON answers(category_id);
CREATE INDEX IF NOT EXISTS idx_answers_ai_suggestions ON answers USING GIN (ai_suggestions);
CREATE INDEX IF NOT EXISTS idx_answers_ai_suggestions_model ON answers ((ai_suggestions->>'model'));

-- Indexes for file_imports
CREATE INDEX IF NOT EXISTS idx_file_imports_created_at ON file_imports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_imports_status ON file_imports(status);
CREATE INDEX IF NOT EXISTS idx_file_imports_category_id ON file_imports(category_id);
CREATE INDEX IF NOT EXISTS idx_file_imports_user_email ON file_imports(user_email);

-- ───────────────────────────────────────────────────────────────
-- 🔒 STEP 3: ENABLE ROW LEVEL SECURITY (RLS)
-- ───────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_imports ENABLE ROW LEVEL SECURITY;

-- ⚠️ WARNING: These are OPEN policies for prototype/development
-- ⚠️ REPLACE with proper auth-based policies before production!

-- Policies for categories
DROP POLICY IF EXISTS "categories read" ON categories;
DROP POLICY IF EXISTS "categories write" ON categories;
CREATE POLICY "categories read" ON categories FOR SELECT USING (true);
CREATE POLICY "categories write" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Policies for codes
DROP POLICY IF EXISTS "codes read" ON codes;
DROP POLICY IF EXISTS "codes write" ON codes;
CREATE POLICY "codes read" ON codes FOR SELECT USING (true);
CREATE POLICY "codes write" ON codes FOR ALL USING (true) WITH CHECK (true);

-- Policies for codes_categories
DROP POLICY IF EXISTS "codes_categories read" ON codes_categories;
DROP POLICY IF EXISTS "codes_categories write" ON codes_categories;
CREATE POLICY "codes_categories read" ON codes_categories FOR SELECT USING (true);
CREATE POLICY "codes_categories write" ON codes_categories FOR ALL USING (true) WITH CHECK (true);

-- Policies for answers
DROP POLICY IF EXISTS "answers read" ON answers;
DROP POLICY IF EXISTS "answers write" ON answers;
CREATE POLICY "answers read" ON answers FOR SELECT USING (true);
CREATE POLICY "answers write" ON answers FOR ALL USING (true) WITH CHECK (true);

-- Policies for answer_codes
DROP POLICY IF EXISTS "answer_codes read" ON answer_codes;
DROP POLICY IF EXISTS "answer_codes write" ON answer_codes;
CREATE POLICY "answer_codes read" ON answer_codes FOR SELECT USING (true);
CREATE POLICY "answer_codes write" ON answer_codes FOR INSERT WITH CHECK (true);

-- Policies for file_imports
DROP POLICY IF EXISTS "file_imports read" ON file_imports;
DROP POLICY IF EXISTS "file_imports write" ON file_imports;
CREATE POLICY "file_imports read" ON file_imports FOR SELECT USING (true);
CREATE POLICY "file_imports write" ON file_imports FOR INSERT WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────
-- 🔧 STEP 4: CREATE FUNCTIONS & TRIGGERS
-- ───────────────────────────────────────────────────────────────

-- Function: Auto-assign whitelisted codes to new answers
CREATE OR REPLACE FUNCTION assign_whitelisted_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if answer text contains any whitelisted code
  PERFORM 1 FROM codes c
  WHERE NEW.answer_text ILIKE '%' || c.name || '%'
    AND c.is_whitelisted = TRUE
  LIMIT 1;

  IF FOUND THEN
    -- Assign the longest matching whitelisted code
    SELECT c.name INTO NEW.selected_code
    FROM codes c
    WHERE NEW.answer_text ILIKE '%' || c.name || '%'
      AND c.is_whitelisted = TRUE
    ORDER BY LENGTH(c.name) DESC
    LIMIT 1;

    -- Set status
    NEW.quick_status  := 'Confirmed';
    NEW.general_status := 'whitelist';
    NEW.coding_date   := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Run auto-assign on insert
DROP TRIGGER IF EXISTS trg_assign_whitelisted_code ON answers;
CREATE TRIGGER trg_assign_whitelisted_code
BEFORE INSERT ON answers
FOR EACH ROW EXECUTE FUNCTION assign_whitelisted_code();

-- ───────────────────────────────────────────────────────────────
-- 📊 STEP 5: CREATE HELPER FUNCTIONS FOR AI SUGGESTIONS
-- ───────────────────────────────────────────────────────────────

-- Function: Get high-confidence AI suggestions
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
    a.id AS answer_id,
    a.answer_text,
    (suggestion->>'code_name')::TEXT AS suggested_code,
    (suggestion->>'confidence')::REAL AS confidence,
    (suggestion->>'reasoning')::TEXT AS reasoning,
    (a.ai_suggestions->>'model')::TEXT AS model
  FROM answers a,
    LATERAL jsonb_array_elements(a.ai_suggestions->'suggestions') suggestion
  WHERE
    a.ai_suggestions IS NOT NULL
    AND (suggestion->>'confidence')::REAL >= p_min_confidence
    AND (p_category_id IS NULL OR a.category_id = p_category_id)
    AND a.selected_code IS NULL  -- Only uncoded answers
  ORDER BY (suggestion->>'confidence')::REAL DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get AI suggestion accuracy
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
    COUNT(*)::BIGINT AS total_suggestions,
    SUM(CASE WHEN a.selected_code = a.ai_suggested_code THEN 1 ELSE 0 END)::BIGINT AS correct_suggestions,
    (SUM(CASE WHEN a.selected_code = a.ai_suggested_code THEN 1 ELSE 0 END)::REAL / NULLIF(COUNT(*), 0))::REAL AS accuracy_rate,
    AVG(
      (ai_suggestions->'suggestions'->0->>'confidence')::REAL
    )::REAL AS avg_confidence
  FROM answers a
  WHERE
    a.ai_suggested_code IS NOT NULL
    AND a.selected_code IS NOT NULL
    AND a.updated_at >= NOW() - (p_days || ' days')::INTERVAL
    AND (p_category_id IS NULL OR a.category_id = p_category_id);
END;
$$ LANGUAGE plpgsql;

-- Function: Get top suggested codes by frequency
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
    (suggestion->>'code_name')::TEXT AS code_name,
    COUNT(*)::BIGINT AS suggestion_count,
    AVG((suggestion->>'confidence')::REAL)::REAL AS avg_confidence,
    MIN((suggestion->>'confidence')::REAL)::REAL AS min_confidence,
    MAX((suggestion->>'confidence')::REAL)::REAL AS max_confidence
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

-- ───────────────────────────────────────────────────────────────
-- 📊 STEP 6: CREATE HELPER FUNCTIONS FOR FILE IMPORTS
-- ───────────────────────────────────────────────────────────────

-- Function: Get import statistics
CREATE OR REPLACE FUNCTION get_import_stats(days INTEGER DEFAULT 7)
RETURNS TABLE (
  total_imports BIGINT,
  successful_imports BIGINT,
  failed_imports BIGINT,
  total_rows_imported BIGINT,
  avg_processing_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_imports,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT AS successful_imports,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_imports,
    COALESCE(SUM(rows_imported), 0)::BIGINT AS total_rows_imported,
    ROUND(AVG(processing_time_ms), 2) AS avg_processing_time_ms
  FROM file_imports
  WHERE created_at >= NOW() - (days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function: Get recent imports with details
CREATE OR REPLACE FUNCTION get_recent_imports(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  category_name TEXT,
  rows_imported INTEGER,
  rows_skipped INTEGER,
  user_email TEXT,
  status TEXT,
  error_message TEXT,
  file_size_kb NUMERIC,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fi.id,
    fi.file_name,
    COALESCE(fi.category_name, 'Unknown') AS category_name,
    fi.rows_imported,
    fi.rows_skipped,
    fi.user_email,
    fi.status,
    fi.error_message,
    fi.file_size_kb,
    fi.processing_time_ms,
    fi.created_at
  FROM file_imports fi
  ORDER BY fi.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────────────────────────
-- 📝 STEP 7: ADD TABLE COMMENTS (Documentation)
-- ───────────────────────────────────────────────────────────────

COMMENT ON TABLE categories IS 'Coding categories for organizing codes (e.g., Home Fragrances, Sports Brands)';
COMMENT ON TABLE codes IS 'Coding codes to assign to answers (e.g., Nike, Adidas, Lavender)';
COMMENT ON TABLE codes_categories IS 'N:M relationship between codes and categories';
COMMENT ON TABLE answers IS 'Survey responses to be categorized (MAIN TABLE with 10k+ rows)';
COMMENT ON TABLE answer_codes IS 'N:M relationship between answers and codes';
COMMENT ON TABLE file_imports IS 'Audit log of all file uploads and imports';

COMMENT ON COLUMN answers.ai_suggestions IS 'AI suggestions in JSONB format with confidence scores';
COMMENT ON COLUMN answers.ai_suggested_code IS 'Top AI suggestion (cached from ai_suggestions)';
COMMENT ON COLUMN answers.selected_code IS 'User-selected code (confirmed)';
COMMENT ON COLUMN answers.quick_status IS 'Quick status: Other, Ignore, Global Blacklist, Blacklist, Confirmed';
COMMENT ON COLUMN answers.general_status IS 'General status: uncategorized, whitelist, blacklist, categorized, etc.';
COMMENT ON COLUMN answers.translation_en IS 'AI-generated English translation (read-only)';
COMMENT ON COLUMN categories.use_web_context IS 'Enable Google Search context for AI suggestions (default: true)';
COMMENT ON COLUMN codes.is_whitelisted IS 'Auto-assign this code when found in answer text';

-- ═══════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE!
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 🧪 STEP 8: VERIFICATION QUERIES (Run to verify migration)
-- ───────────────────────────────────────────────────────────────

-- Check all tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check all indexes created
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check all functions created
SELECT
  routines.routine_name,
  parameters.data_type,
  parameters.parameter_mode
FROM information_schema.routines
LEFT JOIN information_schema.parameters
  ON routines.specific_name = parameters.specific_name
WHERE routines.specific_schema = 'public'
  AND routines.routine_type = 'FUNCTION'
ORDER BY routines.routine_name;

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ───────────────────────────────────────────────────────────────
-- 📊 SAMPLE USAGE EXAMPLES
-- ───────────────────────────────────────────────────────────────

-- Get high-confidence AI suggestions (>90%)
-- SELECT * FROM get_high_confidence_suggestions(NULL, 0.90, 50);

-- Get AI accuracy for last 30 days
-- SELECT * FROM get_ai_suggestion_accuracy(NULL, 30);

-- Get top 20 most suggested codes
-- SELECT * FROM get_top_ai_suggested_codes(NULL, 20);

-- Get import stats for last 7 days
-- SELECT * FROM get_import_stats(7);

-- Get last 20 imports
-- SELECT * FROM get_recent_imports(20);

-- ═══════════════════════════════════════════════════════════════
-- 🎯 NEXT STEPS AFTER MIGRATION
-- ═══════════════════════════════════════════════════════════════
--
-- 1. ✅ Import your data (CSV files or pg_dump)
-- 2. ⚠️ Update RLS policies for production (auth.uid() based)
-- 3. ✅ Test all queries and functions
-- 4. ✅ Update .env with new Supabase credentials
-- 5. ✅ Run application locally to verify connection
-- 6. ✅ Deploy to production (Vercel/Netlify)
-- 7. ⚠️ Monitor performance (add more indexes if needed)
-- 8. ⚠️ Setup backups and maintenance schedules
--
-- ═══════════════════════════════════════════════════════════════

-- 🚀 Ready to go!


