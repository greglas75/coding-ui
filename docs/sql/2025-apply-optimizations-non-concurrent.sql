-- ═══════════════════════════════════════════════════════════════
-- 🚀 QUICK DEPLOY (NON-CONCURRENT) - Apply All Optimizations
-- ═══════════════════════════════════════════════════════════════
-- Use this script if your SQL editor runs everything in a single
-- transaction (e.g., Supabase SQL Editor with "Run in single
-- transaction" enabled). This variant avoids CONCURRENTLY.
-- NOTE: CREATE INDEX (without CONCURRENTLY) may lock writes briefly
-- on large tables. Run during low-traffic windows if needed.
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Step 2: Create indexes (non-concurrent)
CREATE INDEX IF NOT EXISTS idx_answers_category_id 
  ON answers(category_id) 
  WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_answers_category_status 
  ON answers(category_id, general_status) 
  WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_answers_category_language 
  ON answers(category_id, language) 
  WHERE category_id IS NOT NULL AND language IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_answers_category_country 
  ON answers(category_id, country) 
  WHERE category_id IS NOT NULL AND country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_answers_text_search 
  ON answers USING gin(answer_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_answers_selected_code 
  ON answers(selected_code) 
  WHERE selected_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_codes_name_search 
  ON codes USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_codes_categories_category_code 
  ON codes_categories(category_id, code_id);

CREATE INDEX IF NOT EXISTS idx_codes_categories_code_category 
  ON codes_categories(code_id, category_id);

CREATE INDEX IF NOT EXISTS idx_answer_codes_answer_id 
  ON answer_codes(answer_id);

CREATE INDEX IF NOT EXISTS idx_answer_codes_code_id 
  ON answer_codes(code_id);

-- Step 3: Create optimized RPC functions
CREATE OR REPLACE FUNCTION get_category_stats()
RETURNS TABLE(
  category_id int,
  whitelisted bigint,
  blacklisted bigint,
  gibberish bigint,
  categorized bigint,
  not_categorized bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.category_id::int,
    COUNT(*) FILTER (WHERE a.general_status = 'whitelist')::bigint as whitelisted,
    COUNT(*) FILTER (WHERE a.general_status = 'blacklist')::bigint as blacklisted,
    COUNT(*) FILTER (WHERE a.general_status = 'gibberish')::bigint as gibberish,
    COUNT(*) FILTER (WHERE a.general_status = 'categorized')::bigint as categorized,
    COUNT(*) FILTER (WHERE a.general_status = 'uncategorized')::bigint as not_categorized
  FROM answers a
  WHERE a.category_id IS NOT NULL
  GROUP BY a.category_id;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_filter_options(p_category_id int)
RETURNS TABLE(
  types text[],
  statuses text[],
  languages text[],
  countries text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    array_agg(DISTINCT general_status ORDER BY general_status) FILTER (WHERE general_status IS NOT NULL),
    array_agg(DISTINCT quick_status ORDER BY quick_status) FILTER (WHERE quick_status IS NOT NULL),
    array_agg(DISTINCT language ORDER BY language) FILTER (WHERE language IS NOT NULL),
    array_agg(DISTINCT country ORDER BY country) FILTER (WHERE country IS NOT NULL)
  FROM answers
  WHERE category_id = p_category_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION get_category_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_filter_options(int) TO anon, authenticated;

-- Step 5: Update statistics
ANALYZE answers;
ANALYZE codes;
ANALYZE codes_categories;
ANALYZE answer_codes;
ANALYZE categories;

-- Verification helpers
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;


