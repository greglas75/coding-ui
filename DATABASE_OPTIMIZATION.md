# 🗄️ Database Performance & Optimization

Recommendations for Supabase PostgreSQL database indexes and query optimization.

## 📊 Recommended Indexes

Based on query patterns in the codebase, the following indexes are recommended for optimal performance:

### Answers Table

```sql
-- Primary lookup by ID (usually auto-indexed)
CREATE INDEX IF NOT EXISTS idx_answers_id ON answers(id);

-- Filter by category
CREATE INDEX IF NOT EXISTS idx_answers_category_id ON answers(category_id);

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_answers_general_status ON answers(general_status);

-- Sort by coding date
CREATE INDEX IF NOT EXISTS idx_answers_coding_date ON answers(coding_date DESC);

-- Composite index for common filters
CREATE INDEX IF NOT EXISTS idx_answers_category_status
  ON answers(category_id, general_status);

-- Full-text search on answer text (GIN index for better performance)
CREATE INDEX IF NOT EXISTS idx_answers_text_search
  ON answers USING gin(to_tsvector('english', answer_text));
```

### Codes Table

```sql
-- Primary lookup by ID (usually auto-indexed)
CREATE INDEX IF NOT EXISTS idx_codes_id ON codes(id);

-- Search by name (supports ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_codes_name ON codes(name text_pattern_ops);

-- Filter whitelisted codes
CREATE INDEX IF NOT EXISTS idx_codes_whitelisted ON codes(is_whitelisted)
  WHERE is_whitelisted = true;

-- Full-text search on name
CREATE INDEX IF NOT EXISTS idx_codes_name_search
  ON codes USING gin(to_tsvector('english', name));
```

### Categories Table

```sql
-- Primary lookup by ID (usually auto-indexed)
CREATE INDEX IF NOT EXISTS idx_categories_id ON categories(id);

-- Search by name
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Sort by name (common operation)
CREATE INDEX IF NOT EXISTS idx_categories_name_asc ON categories(name ASC);
```

### Codes_Categories (Junction Table)

```sql
-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_codes_categories_code_id
  ON codes_categories(code_id);

CREATE INDEX IF NOT EXISTS idx_codes_categories_category_id
  ON codes_categories(category_id);

-- Composite index for bidirectional lookups
CREATE INDEX IF NOT EXISTS idx_codes_categories_both
  ON codes_categories(code_id, category_id);
```

### File_Imports Table

```sql
-- Lookup recent imports
CREATE INDEX IF NOT EXISTS idx_file_imports_created_at
  ON file_imports(created_at DESC);

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_file_imports_status ON file_imports(status);
```

## 🔍 How to Check Existing Indexes

### Via Supabase Dashboard:

1. Go to Supabase Dashboard → Database → Indexes
2. Check which indexes exist for each table
3. Review index usage statistics

### Via SQL:

```sql
-- List all indexes for a table
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'answers'  -- or 'codes', 'categories', etc.
ORDER BY indexname;

-- Check index size and usage
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## 📈 Query Optimization Patterns

### ✅ Optimized Queries (Already Implemented)

1. **Specific field selection** (src/lib/supabase/queries.ts:95):

   ```typescript
   // Good: Select only needed fields
   .select('id, name, is_whitelisted, created_at, updated_at')
   ```

2. **Client-side caching** (src/lib/supabase/cache.ts):

   ```typescript
   // Cache frequently accessed data
   cache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes
   ```

3. **Pagination with range()** (src/lib/supabase/queries.ts:97):
   ```typescript
   .range(start, end)  // Limit results returned
   ```

### ⚠️ Potential Improvements

1. **Add database indexes** for frequently filtered/sorted columns
2. **Use materialized views** for complex analytics queries
3. **Implement connection pooling** (Supabase provides this by default)
4. **Enable query result caching** on Supabase dashboard

## 🚀 Performance Monitoring

### Check Slow Queries in Supabase:

1. Go to Supabase Dashboard → Database → Query Performance
2. Identify queries with long execution times (> 500ms)
3. Add indexes for columns used in WHERE, ORDER BY, JOIN clauses

### Key Metrics to Monitor:

- **Query execution time**: Should be < 100ms for simple queries
- **Index usage**: Ensure indexes are being used (check `EXPLAIN ANALYZE`)
- **Table scans**: Minimize full table scans on large tables
- **Cache hit ratio**: Aim for > 90% cache hits

## 📝 Best Practices

### 1. Query Optimization

```typescript
// ❌ Bad: Select all fields
const { data } = await supabase.from('codes').select('*');

// ✅ Good: Select specific fields
const { data } = await supabase.from('codes').select('id, name, is_whitelisted');
```

### 2. Filter Early

```typescript
// ✅ Good: Filter in database, not in JavaScript
const { data } = await supabase
  .from('answers')
  .select('id, answer_text')
  .eq('category_id', categoryId)
  .eq('general_status', 'uncategorized')
  .limit(100);
```

### 3. Use Pagination

```typescript
// ✅ Good: Paginate large result sets
const { data, count } = await supabase
  .from('codes')
  .select('*', { count: 'exact' })
  .range(start, end);
```

### 4. Leverage Caching

```typescript
// ✅ Good: Cache frequently accessed static data
const cached = cache.get<Category[]>('categories:all');
if (cached) return cached;

const { data } = await supabase.from('categories').select('*');
cache.set('categories:all', data, 5 * 60 * 1000);
```

## 🔧 Implementation Checklist

- [x] Add API response caching with Cache-Control headers
- [x] Optimize fetchCodesOptimized query to select specific fields
- [ ] Create recommended indexes in Supabase dashboard
- [ ] Monitor slow queries and add indexes as needed
- [ ] Set up query performance alerts (> 500ms)
- [ ] Review and optimize N+1 query patterns
- [ ] Consider materialized views for complex analytics

## 📚 Resources

- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [Supabase Caching](https://supabase.com/docs/guides/platform/performance#caching)
