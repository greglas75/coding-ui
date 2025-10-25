-- Migration: Update embedding dimension for text-embedding-3-large
-- Description: Changes embedding column from VECTOR(384) to VECTOR(3072) to support OpenAI text-embedding-3-large model
-- Date: 2025-10-25

-- ============================================================================
-- Enable pgvector extension (if not already enabled)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Update codeframe_hierarchy.embedding to support text-embedding-3-large
-- ============================================================================

-- Drop the existing embedding column and recreate with correct dimension
ALTER TABLE codeframe_hierarchy
DROP COLUMN IF EXISTS embedding;

-- Store as JSONB instead of VECTOR type because pgvector indexes have 2000 dimension limit
-- text-embedding-3-large produces 3072 dimensions, which exceeds both IVFFlat and HNSW limits
-- Vector similarity search will be handled by Pinecone, not in-database
ALTER TABLE codeframe_hierarchy
ADD COLUMN embedding JSONB;

-- Update comment to reflect new model and storage strategy
COMMENT ON COLUMN codeframe_hierarchy.embedding IS '3072-dim vector from OpenAI text-embedding-3-large stored as JSON array. Vector similarity search handled by Pinecone, not in-database.';

-- No vector index created because pgvector has 2000 dimension limit
-- For vector similarity search, use Pinecone with the same embeddings

-- ============================================================================
-- Additional metadata tracking
-- ============================================================================

-- Add embedding_model column to track which model was used
ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-large';

COMMENT ON COLUMN codeframe_hierarchy.embedding_model IS 'Embedding model used (e.g., text-embedding-3-large, sentence-transformers)';
