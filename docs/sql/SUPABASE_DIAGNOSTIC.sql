-- ═══════════════════════════════════════════════════════════════
-- 🔍 Supabase Diagnostic - Categories Table Health Check
-- Purpose: Detect and fix schema/RLS issues causing 400 errors
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- STEP 0: Check if Categories Table Exists
-- ═══════════════════════════════════════════════════════════════

SELECT
    '🔍 STEP 0: Table Existence Check' as diagnostic_step;

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'categories'
        )
        THEN '✅ Categories table exists'
        ELSE '❌ Categories table DOES NOT EXIST - Create it first!'
    END as table_status;

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Schema Verification
-- ═══════════════════════════════════════════════════════════════

SELECT
    '🔍 STEP 1: Current Schema' as diagnostic_step;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

-- Check which required columns are missing
SELECT
    '🔍 Missing Columns Check' as diagnostic_step;

SELECT
    col.column_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'categories' AND column_name = col.column_name
        )
        THEN '✅ Exists'
        ELSE '❌ MISSING - Run migration!'
    END as status
FROM (
    VALUES
        ('id'),
        ('name'),
        ('google_name'),
        ('description'),
        ('template'),
        ('preset'),
        ('model'),
        ('use_web_context'),
        ('brands_sorting'),
        ('min_length'),
        ('max_length'),
        ('created_at'),
        ('updated_at')
) AS col(column_name);

-- If any columns show MISSING, run: docs/sql/2025-add-category-columns.sql

-- Expected columns:
-- ✅ id (integer, NOT NULL, auto-increment)
-- ✅ name (text, can be NULL or NOT NULL)
-- ✅ template (text, NULLABLE - THIS IS KEY!)
-- ✅ google_name (text, NULLABLE)
-- ✅ description (text, NULLABLE)
-- ✅ preset (text, NULLABLE, default 'LLM Proper Name')
-- ✅ model (text, NULLABLE, default 'gpt-4o')
-- ✅ use_web_context (boolean, NULLABLE, default TRUE)
-- ✅ brands_sorting (text, NULLABLE)
-- ✅ min_length (integer, NULLABLE, default 0)
-- ✅ max_length (integer, NULLABLE, default 0)
-- ✅ created_at (timestamp, default now())
-- ✅ updated_at (timestamp, default now())

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Detect Problems
-- ═══════════════════════════════════════════════════════════════

SELECT
    '🔍 STEP 2: Problem Detection' as diagnostic_step;

-- Check for NOT NULL constraints on optional fields
SELECT
    column_name,
    is_nullable,
    '❌ Should be nullable!' as issue
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name IN ('template', 'google_name', 'description', 'preset', 'model', 'use_web_context')
  AND is_nullable = 'NO';

-- If this query returns rows, those columns need to be made nullable!

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: RLS Policy Check
-- ═══════════════════════════════════════════════════════════════

SELECT
    '🔍 STEP 3: RLS Policy Check' as diagnostic_step;

-- Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity THEN '✅ RLS is ON'
        ELSE '⚠️ RLS is OFF'
    END as status
FROM pg_tables
WHERE tablename = 'categories';

-- List all policies
SELECT
    policyname,
    permissive,
    cmd as operation,
    roles,
    CASE
        WHEN cmd = 'SELECT' THEN '✅ Read access'
        WHEN cmd = 'UPDATE' THEN '✅ Update access'
        WHEN cmd = 'INSERT' THEN '✅ Insert access'
        WHEN cmd = 'DELETE' THEN '✅ Delete access'
        ELSE 'Other'
    END as access_type
FROM pg_policies
WHERE tablename = 'categories';

-- Expected: At least UPDATE and SELECT policies should exist

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Fix Commands (Run if issues found)
-- ═══════════════════════════════════════════════════════════════

SELECT
    '🔧 STEP 4: Applying Fixes...' as diagnostic_step;

SELECT
    '⚠️ If columns are missing, run this first: docs/sql/2025-add-category-columns.sql' as important_note;

-- Fix 1: Make template nullable (only if column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'template'
    ) THEN
        EXECUTE 'ALTER TABLE categories ALTER COLUMN template DROP NOT NULL';
        RAISE NOTICE '✅ template column is now nullable';
    ELSE
        RAISE NOTICE '⚠️ template column does not exist - run migration first';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error modifying template column';
END $$;

-- Fix 2: Make other optional columns nullable (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'google_name') THEN
        EXECUTE 'ALTER TABLE categories ALTER COLUMN google_name DROP NOT NULL';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'description') THEN
        EXECUTE 'ALTER TABLE categories ALTER COLUMN description DROP NOT NULL';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'preset') THEN
        EXECUTE 'ALTER TABLE categories ALTER COLUMN preset DROP NOT NULL';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'model') THEN
        EXECUTE 'ALTER TABLE categories ALTER COLUMN model DROP NOT NULL';
    END IF;

    RAISE NOTICE '✅ Optional columns are now nullable (if they exist)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Some columns may not exist';
END $$;

-- Fix 3: Set default values (only for existing columns)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'template') THEN
        ALTER TABLE categories ALTER COLUMN template SET DEFAULT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'use_web_context') THEN
        ALTER TABLE categories ALTER COLUMN use_web_context SET DEFAULT TRUE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'preset') THEN
        ALTER TABLE categories ALTER COLUMN preset SET DEFAULT 'LLM Proper Name';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'model') THEN
        ALTER TABLE categories ALTER COLUMN model SET DEFAULT 'gpt-4o';
    END IF;

    RAISE NOTICE '✅ Default values set';
END $$;

-- Fix 4: Ensure RLS policies exist
DROP POLICY IF EXISTS "update categories" ON categories;
DROP POLICY IF EXISTS "select categories" ON categories;
DROP POLICY IF EXISTS "insert categories" ON categories;
DROP POLICY IF EXISTS "delete categories" ON categories;

-- Create comprehensive policies (adjust `using (true)` based on your auth requirements)
CREATE POLICY "select categories"
  ON categories
  FOR SELECT
  USING (true);  -- Allow all to read

CREATE POLICY "update categories"
  ON categories
  FOR UPDATE
  USING (true)  -- Allow all to update
  WITH CHECK (true);

CREATE POLICY "insert categories"
  ON categories
  FOR INSERT
  WITH CHECK (true);  -- Allow all to insert

CREATE POLICY "delete categories"
  ON categories
  FOR DELETE
  USING (true);  -- Allow all to delete

-- Note: In production, replace `true` with proper auth checks:
-- Example: USING (auth.uid() = created_by)
-- Example: USING (auth.role() = 'authenticated')

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: Sanity Test
-- ═══════════════════════════════════════════════════════════════

SELECT
    '🧪 STEP 5: Sanity Test' as diagnostic_step;

-- Try updating a category (use real ID from your data)
-- This should work without errors:
UPDATE categories
SET
    template = NULL,  -- Should work now
    description = 'Test description'
WHERE id = (SELECT id FROM categories LIMIT 1)
RETURNING id, name, template, description;

-- If successful, you'll see the updated row

-- ═══════════════════════════════════════════════════════════════
-- STEP 6: Final Verification
-- ═══════════════════════════════════════════════════════════════

SELECT
    '✅ STEP 6: Final Verification' as diagnostic_step;

-- Count nullable columns (should be high for optional fields)
SELECT
    COUNT(*) FILTER (WHERE is_nullable = 'YES') as nullable_columns,
    COUNT(*) FILTER (WHERE is_nullable = 'NO') as required_columns
FROM information_schema.columns
WHERE table_name = 'categories';

-- Verify policies
SELECT
    COUNT(*) as total_policies,
    COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
    COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
    COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
    COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_policies
FROM pg_policies
WHERE tablename = 'categories';

-- Expected:
-- total_policies: 4 (or more)
-- update_policies: >= 1
-- select_policies: >= 1

-- ═══════════════════════════════════════════════════════════════
-- 🎯 Summary Report
-- ═══════════════════════════════════════════════════════════════

SELECT
    '📊 DIAGNOSTIC SUMMARY' as summary;

WITH schema_check AS (
    SELECT
        COUNT(*) FILTER (WHERE column_name = 'template' AND is_nullable = 'YES') as template_nullable,
        COUNT(*) FILTER (WHERE column_name = 'use_web_context') as has_web_context_column
    FROM information_schema.columns
    WHERE table_name = 'categories'
),
policy_check AS (
    SELECT
        COUNT(*) FILTER (WHERE cmd = 'UPDATE') > 0 as has_update_policy,
        COUNT(*) FILTER (WHERE cmd = 'SELECT') > 0 as has_select_policy
    FROM pg_policies
    WHERE tablename = 'categories'
)
SELECT
    CASE WHEN s.template_nullable > 0 THEN '✅' ELSE '❌' END as template_nullable_status,
    CASE WHEN s.has_web_context_column > 0 THEN '✅' ELSE '❌' END as web_context_column_status,
    CASE WHEN p.has_update_policy THEN '✅' ELSE '❌' END as update_policy_status,
    CASE WHEN p.has_select_policy THEN '✅' ELSE '❌' END as select_policy_status,
    CASE
        WHEN s.template_nullable > 0
         AND s.has_web_context_column > 0
         AND p.has_update_policy
         AND p.has_select_policy
        THEN '🎉 ALL CHECKS PASSED - READY TO USE!'
        ELSE '⚠️ ISSUES DETECTED - Review above steps'
    END as overall_status
FROM schema_check s, policy_check p;

-- ═══════════════════════════════════════════════════════════════
-- 💡 TROUBLESHOOTING TIPS
-- ═══════════════════════════════════════════════════════════════

/*
COMMON ISSUES:

1️⃣ "null value in column violates not-null constraint"
   → Run: ALTER TABLE categories ALTER COLUMN template DROP NOT NULL;

2️⃣ "new row violates row-level security policy"
   → Run: CREATE POLICY "insert categories" ON categories FOR INSERT WITH CHECK (true);

3️⃣ "permission denied for table categories"
   → Check: Your user role has proper grants
   → Run: GRANT ALL ON categories TO your_role;

4️⃣ "column does not exist"
   → Run the full migration from: docs/sql/2025-category-settings-fix.sql

5️⃣ Still getting 400 errors?
   → Check browser console for exact error message
   → Verify payload in Network tab (should not include empty strings)
   → Run sanity test (Step 5)
*/

-- ═══════════════════════════════════════════════════════════════
-- END OF DIAGNOSTIC
-- ═══════════════════════════════════════════════════════════════

