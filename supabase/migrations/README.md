# Supabase Migrations - AI Codeframe Builder

This directory contains database migrations for the AI Codeframe Builder feature.

## Migration Files

### 1. `20250101000000_add_codeframe_tables.sql`
Creates three core tables for AI codeframe generation:

- **`codeframe_generations`**: Audit log of all generation runs
  - Tracks status, processing time, costs, MECE scores
  - Links to category and stores algorithm parameters

- **`codeframe_hierarchy`**: Hierarchical tree structure of codes
  - Stores themes, codes, and sub-codes
  - Includes embeddings (384-dim vectors) for MECE validation
  - Links to actual codes in `codes` table

- **`answer_embeddings`**: Cache for answer text embeddings
  - Performance optimization to avoid recomputation
  - Includes text hash for cache invalidation

**Key features:**
- UUID primary keys for new tables
- JSONB for flexible metadata storage
- Timestamps with auto-update triggers
- Comprehensive indexes
- Validation constraints

### 2. `20250101000001_add_pgvector_extension.sql`
Enables vector similarity search capabilities:

- Installs `pgvector` extension
- Creates IVFFlat indexes for fast cosine similarity search
- Adds helper functions:
  - `cosine_similarity()`: Calculate similarity between embeddings
  - `find_similar_codes()`: Find codes similar to an embedding
  - `find_uncovered_answers()`: Identify answers poorly covered by codes

**Performance notes:**
- IVFFlat with `lists=100` is optimized for datasets up to ~10,000 embeddings
- For larger datasets, adjust `lists = sqrt(total_rows)`
- Consider HNSW index for higher recall at cost of memory

### 3. `20250101000002_add_rls_policies_codeframe.sql`
Implements Row Level Security:

- Enables RLS on all three new tables
- Creates ownership helper functions
- Implements policies:
  - Users can only access their own data (via category ownership)
  - Service role has full access for backend operations

**Security model:**
- Data access based on category ownership
- Categories → Generations → Hierarchy → Codes
- Prevents cross-user data leakage

### 4. `20250101000003_update_codes_table.sql`
Extends existing `codes` table to support AI-generated codes:

**New columns:**
- `parent_code_id`: For hierarchical structure
- `level`: Depth in hierarchy (0 = top-level)
- `is_auto_generated`: Flag for AI-generated codes
- `generation_id`: Link to generation run
- `confidence`: AI confidence (high/medium/low)
- `original_name`: For translation tracking
- `description`: Detailed code description
- `example_texts`: Example quotes from Claude

**Helper functions:**
- `get_child_codes()`: Recursively get all children
- `get_code_path()`: Get path from root to leaf
- `validate_code_hierarchy()`: Check for consistency issues

## Running Migrations

### Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run specific migration
supabase db execute --file supabase/migrations/20250101000000_add_codeframe_tables.sql
```

### Manual (SQL Editor)

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste each migration file **in order**
3. Execute each migration
4. Verify with testing queries (see below)

## Verification

After running migrations, verify everything is set up correctly:

```sql
-- 1. Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('codeframe_generations', 'codeframe_hierarchy', 'answer_embeddings');

-- 2. Check pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 3. Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename LIKE 'codeframe%';

-- 4. Verify indexes exist
SELECT tablename, indexname
FROM pg_indexes
WHERE tablename LIKE 'codeframe%' OR tablename = 'answer_embeddings';

-- 5. Test insert (should work)
INSERT INTO codeframe_generations (category_id, answer_ids, n_answers, status)
VALUES (1, ARRAY[1,2,3], 3, 'processing')
RETURNING id;

-- 6. Validate codes table updated
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'codes'
AND column_name IN ('parent_code_id', 'generation_id', 'is_auto_generated');
```

## Database Schema

### ERD (Entity Relationship Diagram)

```
categories (existing)
    ↓ (1:N)
codeframe_generations
    ↓ (1:N)
codeframe_hierarchy
    ↓ (N:1, optional)
codes (existing)

answers (existing)
    ↓ (1:1)
answer_embeddings
```

### Table Sizes Estimation

For a project with:
- 10,000 answers
- 100 categories
- 50 generations per category

**Storage estimates:**
- `codeframe_generations`: ~5,000 rows × 2 KB = **10 MB**
- `codeframe_hierarchy`: ~25,000 nodes × 2 KB = **50 MB**
- `answer_embeddings`: 10,000 rows × 1.5 KB = **15 MB**
- Vector indexes (IVFFlat): ~**20 MB**

**Total: ~95 MB** for AI codeframe data

## Integration with Python Service

The Python service (`python-service/`) will interact with these tables:

```python
# Example flow:
1. Create generation record (status='processing')
2. Call Python service to generate codeframe
3. Python service returns themes and codes
4. Insert hierarchy nodes into codeframe_hierarchy
5. Cache embeddings in answer_embeddings
6. Update generation status to 'completed'
7. Run MECE validation using embeddings
8. Store MECE results in generation record
```

## Maintenance

### Vacuuming (for vector indexes)

After bulk inserts, optimize indexes:

```sql
VACUUM ANALYZE codeframe_hierarchy;
VACUUM ANALYZE answer_embeddings;
```

### Rebuilding Vector Indexes

If you need to adjust `lists` parameter:

```sql
-- Drop old index
DROP INDEX idx_codeframe_hierarchy_embedding_cosine;

-- Recreate with new parameters
CREATE INDEX idx_codeframe_hierarchy_embedding_cosine
ON codeframe_hierarchy
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 316);  -- Adjust based on data size
```

### Monitoring Performance

```sql
-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE '%embedding%';

-- Check table sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::text)) as size
FROM pg_tables
WHERE tablename LIKE 'codeframe%' OR tablename = 'answer_embeddings';
```

## Rollback

If you need to rollback migrations:

```sql
-- Rollback in reverse order
DROP TABLE IF EXISTS answer_embeddings CASCADE;
DROP TABLE IF EXISTS codeframe_hierarchy CASCADE;
DROP TABLE IF EXISTS codeframe_generations CASCADE;

-- Remove columns from codes table
ALTER TABLE codes DROP COLUMN IF EXISTS parent_code_id;
ALTER TABLE codes DROP COLUMN IF EXISTS level;
ALTER TABLE codes DROP COLUMN IF EXISTS is_auto_generated;
ALTER TABLE codes DROP COLUMN IF EXISTS generation_id;
ALTER TABLE codes DROP COLUMN IF EXISTS confidence;
ALTER TABLE codes DROP COLUMN IF EXISTS original_name;
ALTER TABLE codes DROP COLUMN IF EXISTS original_language;
ALTER TABLE codes DROP COLUMN IF EXISTS description;
ALTER TABLE codes DROP COLUMN IF EXISTS example_texts;

-- Drop extension (optional, only if not used elsewhere)
DROP EXTENSION IF EXISTS vector;
```

## Troubleshooting

### "extension 'vector' does not exist"
- pgvector must be enabled in your Supabase project
- Go to Database → Extensions → Enable "vector"
- Or run: `CREATE EXTENSION vector;`

### "permission denied for table"
- Check RLS policies are set up correctly
- Verify user authentication
- Use service role key for backend operations

### Slow vector similarity searches
- Ensure IVFFlat indexes are created
- Run VACUUM ANALYZE
- Consider increasing `lists` parameter
- For very large datasets (>100k), use HNSW index

### RLS blocking legitimate queries
- Check helper functions (`user_owns_category`, etc.)
- Verify `auth.jwt() ->> 'email'` returns correct email
- Test with service role to bypass RLS

## Next Steps

1. **Test with sample data**: Insert test generations and hierarchy
2. **Integrate with Python service**: Connect API endpoints
3. **Build UI**: Create frontend for viewing/editing codeframes
4. **Monitor costs**: Track AI token usage via `codeframe_generations`
5. **Optimize**: Adjust vector index parameters based on data size

## Support

For questions or issues:
- Check migration comments (inline documentation)
- Review helper function implementations
- Test queries are included at bottom of each migration file

---

**Version**: 1.0.0
**Last Updated**: 2025-01-01
**Maintainer**: TGM Research Development Team
