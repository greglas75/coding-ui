-- Add n_themes and n_codes columns to codeframe_generations table
ALTER TABLE codeframe_generations
ADD COLUMN IF NOT EXISTS n_themes INTEGER,
ADD COLUMN IF NOT EXISTS n_codes INTEGER;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
