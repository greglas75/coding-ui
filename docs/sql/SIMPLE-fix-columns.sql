-- SIMPLE VERSION: Just add missing columns
-- Run this if the other SQL has errors

-- Add all missing columns
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS confidence VARCHAR(20);
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS frequency_estimate VARCHAR(20);
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS example_texts JSONB;
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS cluster_id INTEGER;
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS cluster_size INTEGER;
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT TRUE;
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE codeframe_hierarchy ADD COLUMN IF NOT EXISTS representative_answer_ids INTEGER[];

-- Refresh cache
NOTIFY pgrst, 'reload schema';

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'codeframe_hierarchy'
AND column_name IN ('name', 'description', 'confidence', 'display_order')
ORDER BY column_name;
