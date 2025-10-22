-- Add node_type column to codeframe_hierarchy table
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS node_type VARCHAR(50);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_codeframe_hierarchy_node_type
ON codeframe_hierarchy(node_type);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
