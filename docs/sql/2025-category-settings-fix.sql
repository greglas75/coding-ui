-- ═══════════════════════════════════════════════════════════════
-- 🔧 Category Settings Fix - Handle null templates & add use_web_context
-- ═══════════════════════════════════════════════════════════════

-- 1️⃣ Allow null templates (fix 400 Bad Request on empty template)
ALTER TABLE categories
  ALTER COLUMN template DROP NOT NULL;

ALTER TABLE categories
  ALTER COLUMN template SET DEFAULT NULL;

-- 2️⃣ Add use_web_context column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='categories' AND column_name='use_web_context') THEN
        ALTER TABLE categories
          ADD COLUMN use_web_context BOOLEAN DEFAULT TRUE;

        COMMENT ON COLUMN categories.use_web_context IS
          'Enable Google Search context for AI categorization (default: true)';
    END IF;
END $$;

-- 3️⃣ Add other LLM-related columns if missing
DO $$
BEGIN
    -- google_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='categories' AND column_name='google_name') THEN
        ALTER TABLE categories
          ADD COLUMN google_name TEXT;
    END IF;

    -- description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='categories' AND column_name='description') THEN
        ALTER TABLE categories
          ADD COLUMN description TEXT;
    END IF;

    -- preset column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='categories' AND column_name='preset') THEN
        ALTER TABLE categories
          ADD COLUMN preset TEXT DEFAULT 'LLM Proper Name';
    END IF;

    -- model column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='categories' AND column_name='model') THEN
        ALTER TABLE categories
          ADD COLUMN model TEXT DEFAULT 'gpt-4o';
    END IF;

    -- brands_sorting column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='categories' AND column_name='brands_sorting') THEN
        ALTER TABLE categories
          ADD COLUMN brands_sorting TEXT DEFAULT 'Alphanumerical';
    END IF;

    -- min_length column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='categories' AND column_name='min_length') THEN
        ALTER TABLE categories
          ADD COLUMN min_length INTEGER DEFAULT 0;
    END IF;

    -- max_length column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='categories' AND column_name='max_length') THEN
        ALTER TABLE categories
          ADD COLUMN max_length INTEGER DEFAULT 0;
    END IF;
END $$;

-- 4️⃣ Ensure RLS policies allow updates
-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "update categories" ON categories;

-- Create comprehensive update policy
CREATE POLICY "update categories"
  ON categories
  FOR UPDATE
  USING (true)  -- Allow all users to update (adjust based on your auth requirements)
  WITH CHECK (true);

-- Optional: Add select policy if missing
DROP POLICY IF EXISTS "select categories" ON categories;

CREATE POLICY "select categories"
  ON categories
  FOR SELECT
  USING (true);

-- 5️⃣ Verify schema
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name IN (
    'id', 'name', 'template', 'google_name', 'description',
    'preset', 'model', 'use_web_context', 'brands_sorting',
    'min_length', 'max_length'
  )
ORDER BY ordinal_position;

-- 6️⃣ Verify RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'categories';

-- ═══════════════════════════════════════════════════════════════
-- 🎯 Expected Results:
-- ═══════════════════════════════════════════════════════════════
--
-- template: TEXT, nullable, default NULL
-- use_web_context: BOOLEAN, nullable, default TRUE
-- RLS policies: update and select policies exist
--
-- ═══════════════════════════════════════════════════════════════

