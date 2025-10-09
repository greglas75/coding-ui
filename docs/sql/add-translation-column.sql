-- ═══════════════════════════════════════════════════════════════
-- 🔧 Add Translation Column to Answers Table
-- ═══════════════════════════════════════════════════════════════
-- This script adds the missing 'translation' column to answers table
-- Run this BEFORE inserting Toothpaste demo data
-- ═══════════════════════════════════════════════════════════════

-- Check if translation column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'answers' 
        AND column_name = 'translation'
    ) THEN
        ALTER TABLE answers 
        ADD COLUMN translation text;
        
        RAISE NOTICE '✅ Added translation column to answers table';
    ELSE
        RAISE NOTICE 'ℹ️  Translation column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'answers'
AND column_name IN ('answer_text', 'translation')
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- ✅ Complete! Translation column added
-- ═══════════════════════════════════════════════════════════════
-- 
-- Next steps:
-- 1. Run setup-toothpaste-demo.sql
-- 2. Check that translations are populated
-- ═══════════════════════════════════════════════════════════════

