-- Make code_name column nullable
ALTER TABLE codeframe_hierarchy
ALTER COLUMN code_name DROP NOT NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
