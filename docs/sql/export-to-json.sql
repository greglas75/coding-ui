-- ═══════════════════════════════════════════════════════════════
-- 📤 Export Data to JSON
-- ═══════════════════════════════════════════════════════════════
-- This script exports all data to JSON format
-- Copy the results and save to files for backup
-- ═══════════════════════════════════════════════════════════════

-- Export Categories to JSON
SELECT json_agg(row_to_json(categories)) as categories_json
FROM categories;

-- Save output to: backup/categories.json

-- ───────────────────────────────────────────────────────────────

-- Export Codes to JSON
SELECT json_agg(row_to_json(codes)) as codes_json
FROM codes;

-- Save output to: backup/codes.json

-- ───────────────────────────────────────────────────────────────

-- Export Code-Category Relationships to JSON
SELECT json_agg(row_to_json(codes_categories)) as codes_categories_json
FROM codes_categories;

-- Save output to: backup/codes_categories.json

-- ───────────────────────────────────────────────────────────────

-- Export Answers to JSON (first 1000 records)
SELECT json_agg(row_to_json(answers)) as answers_json
FROM (
  SELECT * FROM answers LIMIT 1000
) answers;

-- Save output to: backup/answers_part1.json
-- For more records, change LIMIT and OFFSET

-- ───────────────────────────────────────────────────────────────

-- Export Answers in chunks (if many records)
-- Part 1: Records 1-1000
SELECT json_agg(row_to_json(answers)) as answers_json
FROM (SELECT * FROM answers ORDER BY id LIMIT 1000 OFFSET 0) answers;

-- Part 2: Records 1001-2000
SELECT json_agg(row_to_json(answers)) as answers_json
FROM (SELECT * FROM answers ORDER BY id LIMIT 1000 OFFSET 1000) answers;

-- Part 3: Records 2001-3000
SELECT json_agg(row_to_json(answers)) as answers_json
FROM (SELECT * FROM answers ORDER BY id LIMIT 1000 OFFSET 2000) answers;

-- ═══════════════════════════════════════════════════════════════
-- 📊 Data Summary
-- ═══════════════════════════════════════════════════════════════

SELECT 
  'Categories' as table_name,
  COUNT(*) as total_records,
  pg_size_pretty(pg_total_relation_size('categories')) as table_size
FROM categories
UNION ALL
SELECT 
  'Codes',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('codes'))
FROM codes
UNION ALL
SELECT 
  'Answers',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('answers'))
FROM answers
UNION ALL
SELECT 
  'Codes-Categories',
  COUNT(*),
  pg_size_pretty(pg_total_relation_size('codes_categories'))
FROM codes_categories;

-- ═══════════════════════════════════════════════════════════════
-- 📝 Instructions:
-- ═══════════════════════════════════════════════════════════════
-- 1. Run each query separately
-- 2. Copy the JSON output from results
-- 3. Save to files in backup/ directory
-- 4. Use these files to restore data if needed
-- 
-- To import back:
-- - Use Supabase dashboard import feature
-- - Or parse JSON and insert via SQL
-- ═══════════════════════════════════════════════════════════════



