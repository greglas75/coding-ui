-- ═══════════════════════════════════════════════════════════════
-- 🗑️  Clean Test Data Script
-- ═══════════════════════════════════════════════════════════════
-- This script removes all test data from the database
-- Run this in Supabase SQL Editor
-- ⚠️  WARNING: This will delete ALL data - use with caution!
-- ═══════════════════════════════════════════════════════════════

-- 1️⃣ Delete all answers
DELETE FROM answers;

-- 2️⃣ Delete all code-category relationships
DELETE FROM codes_categories;

-- 3️⃣ Delete all codes
DELETE FROM codes;

-- 4️⃣ Delete all categories
DELETE FROM categories;

-- ═══════════════════════════════════════════════════════════════
-- ✅ Reset sequences (optional - resets IDs to start from 1)
-- ═══════════════════════════════════════════════════════════════

-- Reset answers sequence
ALTER SEQUENCE answers_id_seq RESTART WITH 1;

-- Reset codes sequence
ALTER SEQUENCE codes_id_seq RESTART WITH 1;

-- Reset categories sequence
ALTER SEQUENCE categories_id_seq RESTART WITH 1;

-- ═══════════════════════════════════════════════════════════════
-- 📊 Verify deletion
-- ═══════════════════════════════════════════════════════════════

SELECT 
  'Answers' as table_name, 
  COUNT(*) as remaining_rows 
FROM answers
UNION ALL
SELECT 
  'Codes' as table_name, 
  COUNT(*) as remaining_rows 
FROM codes
UNION ALL
SELECT 
  'Categories' as table_name, 
  COUNT(*) as remaining_rows 
FROM categories
UNION ALL
SELECT 
  'Codes-Categories' as table_name, 
  COUNT(*) as remaining_rows 
FROM codes_categories;

-- ═══════════════════════════════════════════════════════════════
-- ✅ Result: All tables should show 0 rows
-- ═══════════════════════════════════════════════════════════════

