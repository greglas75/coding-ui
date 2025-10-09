import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════════
// 🎯 OPTIMIZED SUPABASE QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Pagination helper for large datasets
 * Usage: const { data, count } = await paginatedQuery('answers', 0, 100);
 */
export async function paginatedQuery<T = any>(
  table: string,
  page: number,
  limit: number = 100,
  filters?: Record<string, any>,
  orderBy?: { column: string; ascending?: boolean }
) {
  const start = page * limit;
  const end = start + limit - 1;

  let query = supabase
    .from(table)
    .select('*', { count: 'exact' })
    .range(start, end);

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });
  }

  // Apply ordering
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
  }

  const { data, error, count } = await query;

  if (error) {
    console.error(`❌ [Supabase] Paginated query failed:`, error);
    throw error;
  }

  return {
    data: data as T[],
    count: count || 0,
    hasMore: count ? end < count - 1 : false,
    page,
    limit,
  };
}

// ═══════════════════════════════════════════════════════════════
// 💾 CACHING LAYER
// ═══════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SupabaseCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const cache = new SupabaseCache();

// ═══════════════════════════════════════════════════════════════
// 📊 OPTIMIZED CATEGORY QUERIES
// ═══════════════════════════════════════════════════════════════

export async function fetchCategoriesOptimized(forceRefresh = false) {
  const cacheKey = 'categories:all';

  // Try cache first
  if (!forceRefresh) {
    const cached = cache.get<any[]>(cacheKey);
    if (cached) {
      console.log('✅ [Supabase] Categories from cache');
      return { success: true, data: cached, source: 'cache' };
    }
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, google_name, description')
      .order('name');

    if (error) throw error;

    // Cache for 5 minutes
    cache.set(cacheKey, data, 5 * 60 * 1000);

    console.log(`✅ [Supabase] Fetched ${data?.length || 0} categories`);
    return { success: true, data: data || [], source: 'database' };
  } catch (error) {
    console.error('❌ [Supabase] Error fetching categories:', error);
    return { success: false, data: [], error };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 OPTIMIZED CODE QUERIES
// ═══════════════════════════════════════════════════════════════

export async function fetchCodesOptimized(
  page: number = 0,
  limit: number = 100,
  filters?: {
    search?: string;
    categoryId?: number[];
    onlyWhitelisted?: boolean;
  }
) {
  const start = page * limit;
  const end = start + limit - 1;

  let query = supabase
    .from('codes')
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })
    .range(start, end);

  // Apply filters
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  if (filters?.onlyWhitelisted) {
    query = query.eq('is_whitelisted', true);
  }

  const { data: codes, error, count } = await query;

  if (error) {
    console.error('❌ [Supabase] Error fetching codes:', error);
    throw error;
  }

  // Fetch category relations only for current page
  if (codes && codes.length > 0 && filters?.categoryId) {
    const codeIds = codes.map(c => c.id);
    const { data: relations } = await supabase
      .from('codes_categories')
      .select('code_id, category_id')
      .in('code_id', codeIds);

    const relationsMap = new Map<number, number[]>();
    relations?.forEach(rel => {
      if (!relationsMap.has(rel.code_id)) {
        relationsMap.set(rel.code_id, []);
      }
      relationsMap.get(rel.code_id)!.push(rel.category_id);
    });

    const codesWithCategories = codes.map(code => ({
      ...code,
      category_ids: relationsMap.get(code.id) || []
    }));

    // Filter by category
    const filtered = filters.categoryId.length > 0
      ? codesWithCategories.filter(code =>
          filters.categoryId!.some(catId => code.category_ids.includes(catId))
        )
      : codesWithCategories;

    return {
      data: filtered,
      count: filtered.length,
      hasMore: end < (count || 0) - 1,
      page,
    };
  }

  return {
    data: codes?.map(c => ({ ...c, category_ids: [] })) || [],
    count: count || 0,
    hasMore: end < (count || 0) - 1,
    page,
  };
}

// ═══════════════════════════════════════════════════════════════
// ⚡ OPTIMISTIC UPDATES
// ═══════════════════════════════════════════════════════════════

export async function optimisticUpdate<T extends { id: number }>(
  table: string,
  id: number,
  updates: Partial<T>,
  localState: T[],
  setLocalState: (state: T[]) => void
) {
  // 1. Update UI immediately (optimistic)
  setLocalState(
    localState.map(item =>
      item.id === id ? { ...item, ...updates } : item
    )
  );

  // 2. Update database in background
  try {
    const { error } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    console.log(`✅ [Supabase] Optimistic update succeeded for ${table}:${id}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ [Supabase] Optimistic update failed:`, error);

    // Revert optimistic update on error
    setLocalState(localState);

    return { success: false, error };
  }
}

// ═══════════════════════════════════════════════════════════════
// 📦 BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function batchUpdate(
  table: string,
  ids: number[],
  updates: Record<string, any>
) {
  if (ids.length === 0) return { success: true, count: 0 };

  try {
    const { error, count } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw error;

    console.log(`✅ [Supabase] Batch updated ${count} rows in ${table}`);
    return { success: true, count: count || 0 };
  } catch (error) {
    console.error(`❌ [Supabase] Batch update failed:`, error);
    return { success: false, error, count: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔍 SMART SEARCH WITH CACHING
// ═══════════════════════════════════════════════════════════════

export async function searchWithCache<T = any>(
  query: string,
  table: string,
  columns: string[],
  limit: number = 100,
  ttl: number = 60 * 1000 // 1 minute cache
): Promise<T[]> {
  if (!query.trim()) return [];

  const cacheKey = `search:${table}:${query}:${limit}`;

  // Check cache
  const cached = cache.get<T[]>(cacheKey);
  if (cached) {
    console.log(`✅ [Supabase] Search from cache: "${query}"`);
    return cached;
  }

  // Build search query for multiple columns
  let supabaseQuery = supabase.from(table).select('*').limit(limit);

  // Search across multiple columns with OR
  if (columns.length === 1) {
    supabaseQuery = supabaseQuery.ilike(columns[0], `%${query}%`);
  } else {
    // For multiple columns, use textSearch or multiple ilike with or
    supabaseQuery = supabaseQuery.or(
      columns.map(col => `${col}.ilike.%${query}%`).join(',')
    );
  }

  const { data, error } = await supabaseQuery;

  if (error) {
    console.error('❌ [Supabase] Search failed:', error);
    return [];
  }

  // Cache results
  cache.set(cacheKey, data || [], ttl);

  console.log(`✅ [Supabase] Search found ${data?.length || 0} results for "${query}"`);
  return data as T[] || [];
}

// ═══════════════════════════════════════════════════════════════
// 🚀 PREFETCH HELPER
// ═══════════════════════════════════════════════════════════════

export async function prefetchData(
  table: string,
  cacheKey: string,
  query: any,
  ttl: number = 10 * 60 * 1000 // 10 minutes
) {
  try {
    const { data, error } = await query;

    if (error) throw error;

    cache.set(cacheKey, data, ttl);
    console.log(`✅ [Supabase] Prefetched ${table} (${data?.length || 0} rows)`);

    return data;
  } catch (error) {
    console.error(`❌ [Supabase] Prefetch failed for ${table}:`, error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 COUNT OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Fast count without fetching data
 */
export async function fastCount(
  table: string,
  filters?: Record<string, any>
): Promise<number> {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value);
      }
    });
  }

  const { count, error } = await query;

  if (error) {
    console.error('❌ [Supabase] Count failed:', error);
    return 0;
  }

  return count || 0;
}

// ═══════════════════════════════════════════════════════════════
// 🎯 SINGLE-ROW UPDATE (Optimized)
// ═══════════════════════════════════════════════════════════════

export async function updateSingleRow<T extends Record<string, any>>(
  table: string,
  id: number,
  updates: Partial<T>,
  options?: {
    returnUpdated?: boolean;
    skipTimestamp?: boolean;
  }
) {
  const updatePayload = {
    ...updates,
    ...(options?.skipTimestamp ? {} : { updated_at: new Date().toISOString() })
  };

  if (options?.returnUpdated) {
    const { data, error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`❌ [Supabase] Update failed for ${table}:${id}:`, error);
      return { success: false, error };
    }

    console.log(`✅ [Supabase] Updated ${table}:${id}`);
    return { success: true, data };
  } else {
    const { error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error(`❌ [Supabase] Update failed for ${table}:${id}:`, error);
      return { success: false, error };
    }

    console.log(`✅ [Supabase] Updated ${table}:${id}`);
    return { success: true };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔄 UPSERT HELPER
// ═══════════════════════════════════════════════════════════════

export async function upsertRow<T extends Record<string, any>>(
  table: string,
  data: T,
  uniqueColumn: string = 'id'
) {
  const { data: result, error } = await supabase
    .from(table)
    .upsert(data, {
      onConflict: uniqueColumn,
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ [Supabase] Upsert failed for ${table}:`, error);
    return { success: false, error };
  }

  console.log(`✅ [Supabase] Upserted ${table}`);
  return { success: true, data: result };
}

// ═══════════════════════════════════════════════════════════════
// 🎯 LAZY LOADING HELPER
// ═══════════════════════════════════════════════════════════════

export class LazyLoader<T> {
  private table: string;
  private pageSize: number;
  private currentPage: number = 0;
  private totalCount: number = 0;
  private hasMore: boolean = true;
  private filters: Record<string, any>;
  private orderBy?: { column: string; ascending?: boolean };

  constructor(
    table: string,
    pageSize: number = 100,
    filters: Record<string, any> = {},
    orderBy?: { column: string; ascending?: boolean }
  ) {
    this.table = table;
    this.pageSize = pageSize;
    this.filters = filters;
    this.orderBy = orderBy;
  }

  async loadNext(): Promise<{ data: T[]; hasMore: boolean; total: number }> {
    if (!this.hasMore && this.currentPage > 0) {
      return { data: [], hasMore: false, total: this.totalCount };
    }

    const result = await paginatedQuery<T>(
      this.table,
      this.currentPage,
      this.pageSize,
      this.filters,
      this.orderBy
    );

    this.totalCount = result.count;
    this.hasMore = result.hasMore;
    this.currentPage++;

    return {
      data: result.data,
      hasMore: this.hasMore,
      total: this.totalCount,
    };
  }

  reset() {
    this.currentPage = 0;
    this.hasMore = true;
    this.totalCount = 0;
  }

  updateFilters(newFilters: Record<string, any>) {
    this.filters = newFilters;
    this.reset();
  }
}

// ═══════════════════════════════════════════════════════════════
// 📈 PERFORMANCE MONITORING
// ═══════════════════════════════════════════════════════════════

interface QueryMetrics {
  table: string;
  operation: string;
  duration: number;
  rowCount?: number;
  cached: boolean;
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];

  log(metric: QueryMetrics) {
    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Log slow queries
    if (metric.duration > 1000 && !metric.cached) {
      console.warn(`⚠️ [Performance] Slow query detected:`, metric);
    }
  }

  getAverageTime(table: string, operation: string): number {
    const filtered = this.metrics.filter(
      m => m.table === table && m.operation === operation
    );

    if (filtered.length === 0) return 0;

    const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
    return sum / filtered.length;
  }

  getCacheHitRate(): number {
    if (this.metrics.length === 0) return 0;
    const cached = this.metrics.filter(m => m.cached).length;
    return (cached / this.metrics.length) * 100;
  }

  getStats() {
    return {
      totalQueries: this.metrics.length,
      cacheHitRate: this.getCacheHitRate().toFixed(1) + '%',
      avgDuration: (
        this.metrics.reduce((sum, m) => sum + m.duration, 0) /
        this.metrics.length
      ).toFixed(0) + 'ms',
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

// ═══════════════════════════════════════════════════════════════
// 🎯 WRAPPER WITH MONITORING
// ═══════════════════════════════════════════════════════════════

export async function monitoredQuery(
  table: string,
  operation: string,
  queryFn: () => Promise<any>
): Promise<any> {
  const startTime = performance.now();
  const result = await queryFn();
  const duration = performance.now() - startTime;

  performanceMonitor.log({
    table,
    operation,
    duration,
    rowCount: Array.isArray(result.data) ? result.data.length : 1,
    cached: false,
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
// 📚 USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════

/*
// Example 1: Paginated query
const { data, count, hasMore } = await paginatedQuery(
  'answers',
  0,  // page
  100, // limit
  { category_id: 1, general_status: 'uncategorized' },
  { column: 'created_at', ascending: false }
);

// Example 2: Optimistic update
await optimisticUpdate(
  'answers',
  answerId,
  { general_status: 'whitelist' },
  localAnswers,
  setLocalAnswers
);

// Example 3: Batch update
await batchUpdate(
  'answers',
  [1, 2, 3],
  { general_status: 'whitelist' }
);

// Example 4: Cached categories
const { data: categories } = await fetchCategoriesOptimized();

// Example 5: Lazy loading
const loader = new LazyLoader('codes', 100);
const { data, hasMore } = await loader.loadNext();
// Later: load more
const { data: moreData } = await loader.loadNext();

// Example 6: Performance stats
console.log(performanceMonitor.getStats());
// { totalQueries: 45, cacheHitRate: '67.5%', avgDuration: '125ms' }
*/
