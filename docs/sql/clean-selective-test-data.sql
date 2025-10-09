-- ═══════════════════════════════════════════════════════════════
-- 🗑️  Clean Selective Test Data Script
-- ═══════════════════════════════════════════════════════════════
-- This script removes ONLY test/sample data, keeping production data
-- Adjust the WHERE clauses based on your actual test data patterns
-- ═══════════════════════════════════════════════════════════════

-- 1️⃣ Delete test answers (example: answers with specific patterns)
-- Uncomment and adjust based on your test data:

-- Delete answers containing test keywords
DELETE FROM answers 
WHERE 
  answer_text ILIKE '%test%' 
  OR answer_text ILIKE '%sample%'
  OR answer_text ILIKE '%demo%';

-- Delete answers with specific IDs (if you know the range)
-- DELETE FROM answers WHERE id BETWEEN 1 AND 100;

-- Delete answers from specific dates (e.g., created today)
-- DELETE FROM answers WHERE DATE(created_at) = CURRENT_DATE;

-- ═══════════════════════════════════════════════════════════════

-- 2️⃣ Delete test codes
-- Delete codes containing test keywords
DELETE FROM codes 
WHERE 
  name ILIKE '%test%' 
  OR name ILIKE '%sample%'
  OR name ILIKE '%demo%';

-- Delete specific test codes by name
-- DELETE FROM codes WHERE name IN ('Test Code 1', 'Test Code 2', 'Sample Brand');

-- ═══════════════════════════════════════════════════════════════

-- 3️⃣ Delete test categories
-- Delete categories containing test keywords
DELETE FROM categories 
WHERE 
  name ILIKE '%test%' 
  OR name ILIKE '%sample%'
  OR name ILIKE '%demo%';

-- Delete specific test categories by name
-- DELETE FROM categories WHERE name IN ('Test Category', 'Home Fragrances', 'Luxury Brand');

-- ═══════════════════════════════════════════════════════════════

-- 4️⃣ Clean orphaned code-category relationships
-- Remove relationships where either code or category no longer exists
DELETE FROM codes_categories 
WHERE 
  code_id NOT IN (SELECT id FROM codes)
  OR category_id NOT IN (SELECT id FROM categories);

-- ═══════════════════════════════════════════════════════════════
-- 📊 Verify remaining data
-- ═══════════════════════════════════════════════════════════════

SELECT 
  'Answers' as table_name, 
  COUNT(*) as remaining_rows,
  COUNT(CASE WHEN answer_text ILIKE '%test%' THEN 1 END) as test_rows
FROM answers
UNION ALL
SELECT 
  'Codes' as table_name, 
  COUNT(*) as remaining_rows,
  COUNT(CASE WHEN name ILIKE '%test%' THEN 1 END) as test_rows
FROM codes
UNION ALL
SELECT 
  'Categories' as table_name, 
  COUNT(*) as remaining_rows,
  COUNT(CASE WHEN name ILIKE '%test%' THEN 1 END) as test_rows
FROM categories
UNION ALL
SELECT 
  'Codes-Categories' as table_name, 
  COUNT(*) as remaining_rows,
  0 as test_rows
FROM codes_categories;

-- ═══════════════════════════════════════════════════════════════
-- 📝 Notes:
-- - Adjust WHERE clauses to match your actual test data patterns
-- - Always backup before running delete operations
-- - Test on a development database first
-- ═══════════════════════════════════════════════════════════════



