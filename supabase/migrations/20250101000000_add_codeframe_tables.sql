-- Migration: Add AI Codeframe Builder tables
-- Description: Creates tables for tracking AI-generated codeframes and their hierarchical structure
-- Dependencies: Requires existing categories, codes, and answers tables

-- Create function for updating updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Table: codeframe_generations
-- Purpose: Audit log of all codeframe generation runs
-- ============================================================================

CREATE TABLE codeframe_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,

    -- Input data
    answer_ids INTEGER[] NOT NULL,
    n_answers INTEGER NOT NULL,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'processing',
    -- Values: 'processing', 'completed', 'failed', 'applied'

    -- Results
    processing_time_ms INTEGER,
    n_clusters INTEGER,
    n_themes INTEGER,
    n_codes INTEGER,
    mece_score FLOAT,

    -- Algorithm metadata (HDBSCAN params, etc.)
    algorithm_config JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- AI usage tracking (for cost monitoring)
    ai_model VARCHAR(100),
    ai_input_tokens INTEGER,
    ai_output_tokens INTEGER,
    ai_cost_usd DECIMAL(10,6),

    -- MECE validation results
    mece_warnings JSONB,

    -- Audit fields
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for codeframe_generations
CREATE INDEX idx_codeframe_generations_category ON codeframe_generations(category_id);
CREATE INDEX idx_codeframe_generations_status ON codeframe_generations(status);
CREATE INDEX idx_codeframe_generations_created_at ON codeframe_generations(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_codeframe_generations_updated_at
    BEFORE UPDATE ON codeframe_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE codeframe_generations IS 'Audit log of AI codeframe generation runs';
COMMENT ON COLUMN codeframe_generations.answer_ids IS 'Array of answer IDs included in this generation';
COMMENT ON COLUMN codeframe_generations.status IS 'Generation status: processing, completed, failed, applied';
COMMENT ON COLUMN codeframe_generations.mece_score IS 'MECE validation score (0-100)';
COMMENT ON COLUMN codeframe_generations.algorithm_config IS 'HDBSCAN and other algorithm parameters';

-- ============================================================================
-- Table: codeframe_hierarchy
-- Purpose: Store hierarchical tree structure of generated codes
-- ============================================================================

CREATE TABLE codeframe_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_id UUID NOT NULL REFERENCES codeframe_generations(id) ON DELETE CASCADE,

    -- Tree structure (self-referential)
    parent_id UUID REFERENCES codeframe_hierarchy(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,  -- 0=root/category, 1=theme, 2=code, 3=subcode

    -- Node data
    node_type VARCHAR(50) NOT NULL,  -- 'category', 'theme', 'code'
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Link to actual code in codes table (if node_type='code')
    code_id INTEGER REFERENCES codes(id) ON DELETE SET NULL,

    -- Cluster metadata (from HDBSCAN)
    cluster_id INTEGER,
    cluster_size INTEGER,
    representative_answer_ids INTEGER[],
    confidence VARCHAR(20),  -- 'high', 'medium', 'low' (from Claude)
    frequency_estimate VARCHAR(20),  -- 'high', 'medium', 'low'

    -- Embedding for MECE validation (384-dim vector from sentence-transformers)
    -- Note: Vector type requires pgvector extension (see next migration)
    embedding VECTOR(384),

    -- Display order in UI
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Edit tracking
    is_auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    edit_history JSONB DEFAULT '[]'::jsonb,

    -- Example texts from Claude (for reference)
    example_texts JSONB,
    -- Format: [{"id": "1", "text": "example quote"}, ...]

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for codeframe_hierarchy
CREATE INDEX idx_codeframe_hierarchy_generation ON codeframe_hierarchy(generation_id);
CREATE INDEX idx_codeframe_hierarchy_parent ON codeframe_hierarchy(parent_id);
CREATE INDEX idx_codeframe_hierarchy_level ON codeframe_hierarchy(level);
CREATE INDEX idx_codeframe_hierarchy_code ON codeframe_hierarchy(code_id);
CREATE INDEX idx_codeframe_hierarchy_node_type ON codeframe_hierarchy(node_type);
CREATE INDEX idx_codeframe_hierarchy_display_order ON codeframe_hierarchy(generation_id, display_order);

-- Trigger for updated_at
CREATE TRIGGER update_codeframe_hierarchy_updated_at
    BEFORE UPDATE ON codeframe_hierarchy
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE codeframe_hierarchy IS 'Hierarchical tree structure of AI-generated codeframes';
COMMENT ON COLUMN codeframe_hierarchy.parent_id IS 'Self-referential FK for tree structure';
COMMENT ON COLUMN codeframe_hierarchy.level IS '0=root, 1=theme, 2=code, 3=subcode';
COMMENT ON COLUMN codeframe_hierarchy.embedding IS '384-dim vector from sentence-transformers for MECE validation';
COMMENT ON COLUMN codeframe_hierarchy.edit_history IS 'JSON array of edit events';

-- ============================================================================
-- Table: answer_embeddings
-- Purpose: Cache embeddings to avoid recomputation (performance optimization)
-- ============================================================================

CREATE TABLE answer_embeddings (
    answer_id INTEGER PRIMARY KEY REFERENCES answers(id) ON DELETE CASCADE,

    -- Embedding vector (384-dim from all-MiniLM-L6-v2)
    embedding VECTOR(384) NOT NULL,
    embedding_model VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',

    -- Hash to detect if answer text changed (invalidate cache)
    text_hash VARCHAR(64) NOT NULL,  -- SHA256 hash of answer_text

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for answer_embeddings
CREATE INDEX idx_answer_embeddings_model ON answer_embeddings(embedding_model);
CREATE INDEX idx_answer_embeddings_created_at ON answer_embeddings(created_at DESC);

-- Comments
COMMENT ON TABLE answer_embeddings IS 'Cached embeddings for answer texts (performance optimization)';
COMMENT ON COLUMN answer_embeddings.text_hash IS 'SHA256 hash of answer_text for cache invalidation';
COMMENT ON COLUMN answer_embeddings.embedding_model IS 'Model used for embedding (usually all-MiniLM-L6-v2)';

-- ============================================================================
-- Constraints and validation
-- ============================================================================

-- Ensure level matches node_type logically
ALTER TABLE codeframe_hierarchy
ADD CONSTRAINT chk_node_type_level
CHECK (
    (node_type = 'category' AND level = 0) OR
    (node_type = 'theme' AND level >= 1) OR
    (node_type = 'code' AND level >= 1)
);

-- Ensure status values are valid
ALTER TABLE codeframe_generations
ADD CONSTRAINT chk_status_values
CHECK (status IN ('processing', 'completed', 'failed', 'applied'));

-- Ensure confidence values are valid
ALTER TABLE codeframe_hierarchy
ADD CONSTRAINT chk_confidence_values
CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low'));

-- Ensure frequency_estimate values are valid
ALTER TABLE codeframe_hierarchy
ADD CONSTRAINT chk_frequency_values
CHECK (frequency_estimate IS NULL OR frequency_estimate IN ('high', 'medium', 'low'));
