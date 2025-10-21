-- Migration: Enable pgvector extension and create vector indexes
-- Description: Enables pgvector for similarity search and creates optimized indexes
-- Dependencies: Requires previous migration (20250101000000_add_codeframe_tables.sql)

-- ============================================================================
-- Enable pgvector extension
-- ============================================================================

-- Install pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

COMMENT ON EXTENSION vector IS 'Vector similarity search extension for embeddings';

-- ============================================================================
-- Create vector indexes for fast similarity search
-- ============================================================================

-- IVFFlat index for codeframe_hierarchy embeddings
-- IVFFlat (Inverted File with Flat compression) is optimized for large datasets
-- lists = 100 is a good starting point (adjust based on data size)
-- Rule of thumb: lists = sqrt(rows), but 100 is minimum for good performance

CREATE INDEX idx_codeframe_hierarchy_embedding_cosine
ON codeframe_hierarchy
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMENT ON INDEX idx_codeframe_hierarchy_embedding_cosine IS
'IVFFlat index for cosine similarity search on code embeddings';

-- IVFFlat index for answer_embeddings
CREATE INDEX idx_answer_embeddings_embedding_cosine
ON answer_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMENT ON INDEX idx_answer_embeddings_embedding_cosine IS
'IVFFlat index for cosine similarity search on answer embeddings';

-- ============================================================================
-- Helper functions for vector operations
-- ============================================================================

-- Function to calculate cosine similarity between two embeddings
CREATE OR REPLACE FUNCTION cosine_similarity(a VECTOR(384), b VECTOR(384))
RETURNS FLOAT AS $$
BEGIN
    RETURN 1 - (a <=> b);  -- pgvector uses distance, convert to similarity
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION cosine_similarity IS
'Calculate cosine similarity (0-1) between two 384-dim vectors';

-- Function to find most similar codes to a given embedding
CREATE OR REPLACE FUNCTION find_similar_codes(
    query_embedding VECTOR(384),
    generation_id_filter UUID,
    limit_count INTEGER DEFAULT 10,
    min_similarity FLOAT DEFAULT 0.0
)
RETURNS TABLE (
    hierarchy_id UUID,
    code_name VARCHAR(255),
    similarity FLOAT,
    node_type VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ch.id,
        ch.name,
        cosine_similarity(ch.embedding, query_embedding) as sim,
        ch.node_type
    FROM codeframe_hierarchy ch
    WHERE ch.generation_id = generation_id_filter
        AND ch.embedding IS NOT NULL
        AND cosine_similarity(ch.embedding, query_embedding) >= min_similarity
    ORDER BY ch.embedding <=> query_embedding  -- Cosine distance (lower = more similar)
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_similar_codes IS
'Find codes most similar to a given embedding within a generation';

-- Function to find uncovered answers (for MECE exhaustiveness check)
CREATE OR REPLACE FUNCTION find_uncovered_answers(
    generation_id_param UUID,
    coverage_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    answer_id INTEGER,
    answer_text TEXT,
    best_match_code VARCHAR(255),
    best_similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH answer_best_matches AS (
        SELECT
            ae.answer_id,
            a.answer_text,
            ch.name as code_name,
            cosine_similarity(ae.embedding, ch.embedding) as similarity,
            ROW_NUMBER() OVER (PARTITION BY ae.answer_id ORDER BY ae.embedding <=> ch.embedding) as rn
        FROM answer_embeddings ae
        JOIN answers a ON a.id = ae.answer_id
        CROSS JOIN codeframe_hierarchy ch
        WHERE ch.generation_id = generation_id_param
            AND ch.embedding IS NOT NULL
            AND ch.node_type = 'code'
    )
    SELECT
        answer_id,
        answer_text,
        code_name,
        similarity
    FROM answer_best_matches
    WHERE rn = 1
        AND similarity < coverage_threshold
    ORDER BY similarity ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_uncovered_answers IS
'Find answers poorly covered by generated codes (MECE exhaustiveness validation)';

-- ============================================================================
-- Performance optimization notes
-- ============================================================================

-- For production with >10,000 embeddings, consider:
-- 1. Increase 'lists' parameter: lists = sqrt(total_rows)
--    Example: 100,000 rows → lists = 316
--    Rebuild index: CREATE INDEX CONCURRENTLY ...

-- 2. Use HNSW index (better recall, higher memory):
--    CREATE INDEX idx_name ON table USING hnsw (embedding vector_cosine_ops);

-- 3. Vacuum and analyze after bulk inserts:
--    VACUUM ANALYZE codeframe_hierarchy;
--    VACUUM ANALYZE answer_embeddings;

-- 4. Monitor index usage:
--    SELECT * FROM pg_stat_user_indexes WHERE indexrelname LIKE '%embedding%';
