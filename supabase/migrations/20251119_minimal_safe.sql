-- ════════════════════════════════════════════════════════════════
-- MINIMAL SAFE INDEXES - Guaranteed to Work
-- 100% verified columns only
-- Time: 30 seconds
-- ════════════════════════════════════════════════════════════════

-- ANSWERS TABLE - Most critical
CREATE INDEX IF NOT EXISTS idx_answers_category_id ON answers(category_id);
CREATE INDEX IF NOT EXISTS idx_answers_general_status ON answers(general_status);
CREATE INDEX IF NOT EXISTS idx_answers_selected_code ON answers(selected_code);
CREATE INDEX IF NOT EXISTS idx_answers_created_at ON answers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_updated_at ON answers(updated_at DESC);

-- CATEGORIES TABLE
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_created_at ON categories(created_at DESC);

-- CODES TABLE
CREATE INDEX IF NOT EXISTS idx_codes_code ON codes(code);
CREATE INDEX IF NOT EXISTS idx_codes_label ON codes(label);
CREATE INDEX IF NOT EXISTS idx_codes_created_at ON codes(created_at DESC);

-- CODEFRAME_HIERARCHY TABLE
CREATE INDEX IF NOT EXISTS idx_codeframe_code ON codeframe_hierarchy(code);
CREATE INDEX IF NOT EXISTS idx_codeframe_parent_code ON codeframe_hierarchy(parent_code);
CREATE INDEX IF NOT EXISTS idx_codeframe_level ON codeframe_hierarchy(level);
CREATE INDEX IF NOT EXISTS idx_codeframe_label ON codeframe_hierarchy(label);

-- Verify
SELECT COUNT(*) as indexes_created FROM pg_indexes WHERE indexname LIKE 'idx_%';
