-- Make position column nullable or set default value
-- Option 1: Make it nullable
ALTER TABLE codeframe_hierarchy
ALTER COLUMN position DROP NOT NULL;

-- Option 2: Set a default value (uncomment if you prefer this)
-- ALTER TABLE codeframe_hierarchy
-- ALTER COLUMN position SET DEFAULT 0;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
