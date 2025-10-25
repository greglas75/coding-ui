-- ═══════════════════════════════════════════════════════════════
-- 🔧 FIXED MIGRATION - Works with Existing Tables
-- ═══════════════════════════════════════════════════════════════
-- Purpose: Add new codeframe tables + fix existing tables
-- Date: 2025-10-21
-- Usage: Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- STEP 1: Fix existing tables (add slug columns if missing)
-- ───────────────────────────────────────────────────────────────

-- Add slug to categories (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='categories' AND column_name='slug'
    ) THEN
        ALTER TABLE categories 
        ADD COLUMN slug TEXT GENERATED ALWAYS AS (
            regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')
        ) STORED;
        
        CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
    END IF;
END $$;

-- Add slug to codes (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='codes' AND column_name='slug'
    ) THEN
        ALTER TABLE codes 
        ADD COLUMN slug TEXT GENERATED ALWAYS AS (
            regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')
        ) STORED;
        
        CREATE INDEX IF NOT EXISTS idx_codes_slug ON codes(slug);
    END IF;
END $$;

-- ───────────────────────────────────────────────────────────────
-- STEP 2: Create NEW codeframe tables (for AI feature)
-- ───────────────────────────────────────────────────────────────

-- Table: answer_embeddings
-- Description: Cache embeddings for answers to speed up clustering
CREATE TABLE IF NOT EXISTS answer_embeddings (
  id BIGSERIAL PRIMARY KEY,
  answer_id BIGINT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  embedding_vector BYTEA NOT NULL,  -- Pickled numpy array
  model_name TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  embedding_hash TEXT NOT NULL,     -- SHA256 hash of answer text
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(answer_id, model_name)
);

-- Table: codeframe_generations
-- Description: Track AI codeframe generation jobs
CREATE TABLE IF NOT EXISTS codeframe_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Configuration
  config JSONB NOT NULL,  -- Generation parameters
  
  -- Progress tracking
  progress_percent INTEGER DEFAULT 0,
  current_step TEXT,
  
  -- Results
  result JSONB,  -- Final codeframe hierarchy
  error JSONB,   -- Error details if failed
  
  -- Metadata
  n_answers INTEGER,
  n_clusters INTEGER,
  tokens_used INTEGER,
  cost_usd NUMERIC(10, 4),
  processing_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Indexes
  created_by TEXT  -- User email
);

-- Table: codeframe_hierarchy
-- Description: Store generated codeframe hierarchy nodes
CREATE TABLE IF NOT EXISTS codeframe_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES codeframe_generations(id) ON DELETE CASCADE,
  
  -- Tree structure
  parent_id UUID REFERENCES codeframe_hierarchy(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 4),
  position INTEGER NOT NULL,  -- Order within parent
  
  -- Node data
  code_name TEXT NOT NULL,
  description TEXT,
  example_answers TEXT[],
  answer_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(generation_id, parent_id, code_name)
);

-- ───────────────────────────────────────────────────────────────
-- STEP 3: Create indexes for new tables
-- ───────────────────────────────────────────────────────────────

-- Indexes for answer_embeddings
CREATE INDEX IF NOT EXISTS idx_answer_embeddings_answer_id 
  ON answer_embeddings(answer_id);
CREATE INDEX IF NOT EXISTS idx_answer_embeddings_hash 
  ON answer_embeddings(embedding_hash);
CREATE INDEX IF NOT EXISTS idx_answer_embeddings_model 
  ON answer_embeddings(model_name);

-- Indexes for codeframe_generations
CREATE INDEX IF NOT EXISTS idx_codeframe_generations_category_id 
  ON codeframe_generations(category_id);
CREATE INDEX IF NOT EXISTS idx_codeframe_generations_status 
  ON codeframe_generations(status);
CREATE INDEX IF NOT EXISTS idx_codeframe_generations_created_at 
  ON codeframe_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_codeframe_generations_created_by 
  ON codeframe_generations(created_by);

-- Indexes for codeframe_hierarchy
CREATE INDEX IF NOT EXISTS idx_codeframe_hierarchy_generation_id 
  ON codeframe_hierarchy(generation_id);
CREATE INDEX IF NOT EXISTS idx_codeframe_hierarchy_parent_id 
  ON codeframe_hierarchy(parent_id);
CREATE INDEX IF NOT EXISTS idx_codeframe_hierarchy_level 
  ON codeframe_hierarchy(level);

-- ───────────────────────────────────────────────────────────────
-- STEP 4: Enable RLS on new tables
-- ───────────────────────────────────────────────────────────────

ALTER TABLE answer_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE codeframe_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE codeframe_hierarchy ENABLE ROW LEVEL SECURITY;

-- ⚠️ WARNING: Open policies for development
-- ⚠️ Replace with auth-based policies before production!

-- Policies for answer_embeddings
DROP POLICY IF EXISTS "answer_embeddings read" ON answer_embeddings;
DROP POLICY IF EXISTS "answer_embeddings write" ON answer_embeddings;
CREATE POLICY "answer_embeddings read" ON answer_embeddings 
  FOR SELECT USING (true);
CREATE POLICY "answer_embeddings write" ON answer_embeddings 
  FOR ALL USING (true) WITH CHECK (true);

-- Policies for codeframe_generations
DROP POLICY IF EXISTS "codeframe_generations read" ON codeframe_generations;
DROP POLICY IF EXISTS "codeframe_generations write" ON codeframe_generations;
CREATE POLICY "codeframe_generations read" ON codeframe_generations 
  FOR SELECT USING (true);
CREATE POLICY "codeframe_generations write" ON codeframe_generations 
  FOR ALL USING (true) WITH CHECK (true);

-- Policies for codeframe_hierarchy
DROP POLICY IF EXISTS "codeframe_hierarchy read" ON codeframe_hierarchy;
DROP POLICY IF EXISTS "codeframe_hierarchy write" ON codeframe_hierarchy;
CREATE POLICY "codeframe_hierarchy read" ON codeframe_hierarchy 
  FOR SELECT USING (true);
CREATE POLICY "codeframe_hierarchy write" ON codeframe_hierarchy 
  FOR ALL USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────
-- STEP 5: Add comments
-- ───────────────────────────────────────────────────────────────

COMMENT ON TABLE answer_embeddings IS 'Cached embeddings for answers (all-MiniLM-L6-v2)';
COMMENT ON TABLE codeframe_generations IS 'AI codeframe generation jobs (status, progress, results)';
COMMENT ON TABLE codeframe_hierarchy IS 'Generated codeframe hierarchy tree (max 4 levels)';

COMMENT ON COLUMN codeframe_generations.config IS 'Generation parameters: max_depth, max_codes_per_level, mece_validation';
COMMENT ON COLUMN codeframe_generations.result IS 'Final codeframe hierarchy in JSON format';
COMMENT ON COLUMN codeframe_hierarchy.level IS 'Tree depth: 0=root, 1-4=sub-levels';
COMMENT ON COLUMN answer_embeddings.embedding_vector IS 'Pickled numpy array (384 dimensions)';

-- ═══════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE!
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 🧪 VERIFICATION (Run to check)
-- ───────────────────────────────────────────────────────────────

-- Check all tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'categories', 'codes', 'answers', 
    'answer_embeddings', 'codeframe_generations', 'codeframe_hierarchy'
  )
ORDER BY table_name;

-- Check slug columns added
SELECT 
  table_name,
  column_name,
  data_type,
  is_generated
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'slug'
  AND table_name IN ('categories', 'codes');

-- Check codeframe tables created
SELECT COUNT(*) as codeframe_tables_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%codeframe%' OR table_name = 'answer_embeddings';

-- ═══════════════════════════════════════════════════════════════
-- 📝 NEXT STEPS
-- ═══════════════════════════════════════════════════════════════
--
-- 1. ✅ Run this entire file in Supabase SQL Editor
-- 2. ✅ Check verification queries show all tables
-- 3. ✅ Start React UI: npm run dev
-- 4. ✅ Test E2E flow: Select category → Generate codeframe
-- 5. ⚠️ Update RLS policies for production (before going live)
--
-- ═══════════════════════════════════════════════════════════════
