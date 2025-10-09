-- ═══════════════════════════════════════════════════════════════
-- 🗑️  Safe Clean Test Data Script (with Transaction)
-- ═══════════════════════════════════════════════════════════════
-- This script removes all test data within a transaction
-- If anything goes wrong, all changes are rolled back
-- ⚠️  WARNING: This will delete ALL data - use with caution!
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- Step 1: Count records before deletion (for verification)
DO $$
DECLARE
  answers_count INTEGER;
  codes_count INTEGER;
  categories_count INTEGER;
  cc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO answers_count FROM answers;
  SELECT COUNT(*) INTO codes_count FROM codes;
  SELECT COUNT(*) INTO categories_count FROM categories;
  SELECT COUNT(*) INTO cc_count FROM codes_categories;
  
  RAISE NOTICE '📊 BEFORE DELETION:';
  RAISE NOTICE '   Answers: %', answers_count;
  RAISE NOTICE '   Codes: %', codes_count;
  RAISE NOTICE '   Categories: %', categories_count;
  RAISE NOTICE '   Code-Category Links: %', cc_count;
END $$;

-- Step 2: Delete data in correct order (respecting foreign keys)

-- Delete answers (references codes via selected_code)
DELETE FROM answers;
RAISE NOTICE '✅ Deleted all answers';

-- Delete code-category relationships
DELETE FROM codes_categories;
RAISE NOTICE '✅ Deleted all code-category relationships';

-- Delete codes
DELETE FROM codes;
RAISE NOTICE '✅ Deleted all codes';

-- Delete categories
DELETE FROM categories;
RAISE NOTICE '✅ Deleted all categories';

-- Step 3: Reset sequences (optional - resets IDs to start from 1)
ALTER SEQUENCE IF EXISTS answers_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS codes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS categories_id_seq RESTART WITH 1;
RAISE NOTICE '✅ Reset all ID sequences';

-- Step 4: Verify deletion
DO $$
DECLARE
  answers_count INTEGER;
  codes_count INTEGER;
  categories_count INTEGER;
  cc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO answers_count FROM answers;
  SELECT COUNT(*) INTO codes_count FROM codes;
  SELECT COUNT(*) INTO categories_count FROM categories;
  SELECT COUNT(*) INTO cc_count FROM codes_categories;
  
  RAISE NOTICE '📊 AFTER DELETION:';
  RAISE NOTICE '   Answers: %', answers_count;
  RAISE NOTICE '   Codes: %', codes_count;
  RAISE NOTICE '   Categories: %', categories_count;
  RAISE NOTICE '   Code-Category Links: %', cc_count;
  
  -- Verify all counts are 0
  IF answers_count > 0 OR codes_count > 0 OR categories_count > 0 OR cc_count > 0 THEN
    RAISE EXCEPTION '❌ Deletion failed - some records remain';
  ELSE
    RAISE NOTICE '✅ All records successfully deleted';
  END IF;
END $$;

-- Step 5: Final verification query
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
-- 🎯 COMMIT or ROLLBACK
-- ═══════════════════════════════════════════════════════════════

-- If everything looks good, run:
COMMIT;

-- If you want to undo all changes, run instead:
-- ROLLBACK;

-- ═══════════════════════════════════════════════════════════════
-- 📝 Notes:
-- - All operations are wrapped in a transaction
-- - If any error occurs, all changes are automatically rolled back
-- - You can manually ROLLBACK before COMMIT if needed
-- - Check the NOTICE messages for progress updates
-- ═══════════════════════════════════════════════════════════════



