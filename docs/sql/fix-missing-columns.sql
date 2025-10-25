-- Fix missing columns in codeframe tables
-- Run this in Supabase SQL Editor

-- 1. Add mece_warnings column to codeframe_generations
ALTER TABLE codeframe_generations
ADD COLUMN IF NOT EXISTS mece_warnings JSONB DEFAULT '[]'::jsonb;

-- 2. Add display_order column to codeframe_hierarchy
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 3. Add comment for documentation
COMMENT ON COLUMN codeframe_generations.mece_warnings IS 'MECE validation warnings from code generation';
COMMENT ON COLUMN codeframe_hierarchy.display_order IS 'Display order for hierarchy nodes';
