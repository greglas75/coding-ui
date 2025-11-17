/**
 * Supabase Client and Helper Functions
 *
 * Centralized Supabase operations for the application.
 * Includes client creation, basic CRUD operations, and advanced features.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// CLIENT CREATION
// ═══════════════════════════════════════════════════════════════

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client instance.
 * This ensures only one client is created, preventing multiple GoTrueClient warnings.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        headers: { 'x-application-name': 'CodingApp' }
      }
    });

    // Debug guard in development
    if (import.meta.env.DEV) {
      console.info('✅ Supabase client initialized once (singleton)');
    }
  }

  return supabaseInstance;
}

// Export the singleton instance (backward compatibility)
export const supabase = getSupabaseClient();

// ═══════════════════════════════════════════════════════════════
// BASIC CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all codes from the database
 *
 * @returns Array of codes with id and name
 *
 * @example
 * const codes = await fetchCodes();
 * // [{ id: 1, name: 'Code1' }, { id: 2, name: 'Code2' }]
 */
export async function fetchCodes() {
  simpleLogger.info("🟡 [fetchCodes] Fetching all codes...");
  const { data, error } = await supabase
    .from("codes")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) {
    simpleLogger.error("❌ Error fetching codes:", error);
    return [];
  }
  simpleLogger.info(`✅ [fetchCodes] ${data.length} codes fetched.`);
  return data;
}

/**
 * Create a new code
 *
 * @param name - Code name
 * @returns Created code object
 * @throws Error if creation fails
 *
 * @example
 * const code = await createCode('New Code');
 */
export async function createCode(name: string) {
  simpleLogger.info("🟢 [createCode] Creating code:", name);
  const { data, error } = await supabase.from("codes").insert([{ name }]).select().single();
  if (error) {
    simpleLogger.error("❌ Error creating code:", error);
    throw error;
  }
  return data;
}

/**
 * Save codes for an answer (many-to-many relationship)
 *
 * @param answerId - Answer ID
 * @param codeIds - Array of code IDs to assign
 * @param mode - 'overwrite' to replace existing, 'additional' to add to existing
 *
 * @example
 * await saveCodesForAnswer(123, [1, 2, 3], 'overwrite');
 */
export async function saveCodesForAnswer(answerId: number, codeIds: number[], mode: "overwrite" | "additional") {
  simpleLogger.info(`🟣 [saveCodesForAnswer] Saving codes for answer ${answerId}, mode=${mode}`);

  try {
    // 🔹 Fetch existing codes
    const { data: existingCodes, error: fetchError } = await supabase
      .from('answer_codes')
      .select('code_id')
      .eq('answer_id', answerId);

    if (fetchError) throw fetchError;

    const existingIds = (existingCodes || []).map(r => r.code_id);
    simpleLogger.info(`🟣 [saveCodesForAnswer] Existing: ${existingIds.join(',')}, New: ${codeIds.join(',')}`);

    // 🔹 Jeśli tryb overwrite — usuń stare połączenia
    if (mode === 'overwrite') {
      const { error: deleteError } = await supabase
        .from('answer_codes')
        .delete()
        .eq('answer_id', answerId);

      if (deleteError) throw deleteError;
      simpleLogger.info('✅ [saveCodesForAnswer] Existing codes deleted');
    }

    // 🔹 Przygotuj unikalne wpisy
    const uniqueIds = [...new Set(codeIds)];
    const records = uniqueIds.map(id => ({
      answer_id: answerId,
      code_id: id
    }));

    if (records.length === 0) {
      simpleLogger.warn('⚠️ [saveCodesForAnswer] No codes to insert.');
      return;
    }

    simpleLogger.info(`🟣 [saveCodesForAnswer] Records to insert:`, records);

    // 🔹 Insert z on_conflict (bez błędu 409)
    const { error: insertError } = await supabase
      .from('answer_codes')
      .upsert(records, { onConflict: 'answer_id,code_id' });

    if (insertError) throw insertError;

    simpleLogger.info(`✅ [saveCodesForAnswer] ${records.length} codes saved successfully for answer ${answerId}`);

    // Update selected_code column in answers table
    await updateSelectedCodeColumn(answerId);
  } catch (error: any) {
    simpleLogger.error('❌ [saveCodesForAnswer] Error:', error);
  }
}

// Helper function to update selected_code column
async function updateSelectedCodeColumn(answerId: number) {
  try {
    // Get all codes for this answer
    const { data: allAnswerCodes, error: allCodesError } = await supabase
      .from("answer_codes")
      .select(`
        codes (
          name
        )
      `)
      .eq("answer_id", answerId);

    if (allCodesError) {
      simpleLogger.error("❌ Error fetching all answer codes:", allCodesError);
      return;
    }

    const allCodeNames = allAnswerCodes?.map((ac: any) => ac.codes?.name).filter(Boolean).join(', ') || null;

    const { error: updateError } = await supabase
      .from("answers")
      .update({ selected_code: allCodeNames })
      .eq("id", answerId);

    if (updateError) {
      simpleLogger.error("❌ Error updating selected_code:", updateError);
    } else {
      simpleLogger.info("✅ [saveCodesForAnswer] selected_code updated:", allCodeNames || "null");
    }
  } catch (err) {
    simpleLogger.error("❌ Error in updateSelectedCodeColumn:", err);
  }
}

/**
 * Fetch AI suggestion for an answer
 *
 * @param answerId - Answer ID
 * @returns Array with AI suggested code (or empty array)
 *
 * @example
 * const suggestions = await fetchAISuggestion(123);
 * // ['Suggested Code']
 */
export async function fetchAISuggestion(answerId: number) {
  const { data, error } = await supabase
    .from("answers")
    .select("ai_suggested_code")
    .eq("id", answerId)
    .single();
  if (error) {
    simpleLogger.error("❌ Error fetching AI suggestion:", error);
    return [];
  }
  // Convert string to array if it exists
  return data?.ai_suggested_code ? [data.ai_suggested_code] : [];
}

// ═══════════════════════════════════════════════════════════════
// ADVANCED FEATURES (from supabaseOptimized.ts)
// ═══════════════════════════════════════════════════════════════

/**
 * Pagination helper for large datasets
 * 
 * @param table - Table name
 * @param page - Page number (0-indexed)
 * @param limit - Items per page (default: 100)
 * @param filters - Optional filters
 * @param orderBy - Optional ordering
 * @returns Paginated results with count and hasMore flag
 * 
 * @example
 * const { data, count, hasMore } = await paginatedQuery('answers', 0, 100);
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
    simpleLogger.error(`❌ [Supabase] Paginated query failed:`, error);
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
// CACHING LAYER
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
// OPTIMIZED CATEGORY QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch categories with caching
 * 
 * @param forceRefresh - Force refresh from database (default: false)
 * @returns Categories with source indicator (cache or database)
 */
export async function fetchCategoriesOptimized(forceRefresh = false) {
  const cacheKey = 'categories:all';

  // Try cache first
  if (!forceRefresh) {
    const cached = cache.get<any[]>(cacheKey);
    if (cached) {
      simpleLogger.info('✅ [Supabase] Categories from cache');
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

    simpleLogger.info(`✅ [Supabase] Fetched ${data?.length || 0} categories`);
    return { success: true, data: data || [], source: 'database' };
  } catch (error) {
    simpleLogger.error('❌ [Supabase] Error fetching categories:', error);
    return { success: false, data: [], error };
  }
}

// ═══════════════════════════════════════════════════════════════
// OPTIMIZED CODE QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch codes with pagination and filtering
 * 
 * @param page - Page number (default: 0)
 * @param limit - Items per page (default: 100)
 * @param filters - Optional filters (search, categoryId, onlyWhitelisted)
 * @returns Paginated codes with count and hasMore flag
 */
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
    simpleLogger.error('❌ [Supabase] Error fetching codes:', error);
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
// OPTIMISTIC UPDATES
// ═══════════════════════════════════════════════════════════════

/**
 * Optimistic update - update UI immediately, then sync with database
 * 
 * @param table - Table name
 * @param id - Row ID
 * @param updates - Updates to apply
 * @param localState - Current local state
 * @param setLocalState - State setter function
 * @returns Success status (rolls back on error)
 */
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

    simpleLogger.info(`✅ [Supabase] Optimistic update succeeded for ${table}:${id}`);
    return { success: true };
  } catch (error) {
    simpleLogger.error(`❌ [Supabase] Optimistic update failed:`, error);

    // Revert optimistic update on error
    setLocalState(localState);

    return { success: false, error };
  }
}

// ═══════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Batch update multiple rows
 * 
 * @param table - Table name
 * @param ids - Array of row IDs
 * @param updates - Updates to apply to all rows
 * @returns Success status and count
 */
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

    simpleLogger.info(`✅ [Supabase] Batch updated ${count} rows in ${table}`);
    return { success: true, count: count || 0 };
  } catch (error) {
    simpleLogger.error(`❌ [Supabase] Batch update failed:`, error);
    return { success: false, error, count: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// SMART SEARCH WITH CACHING
// ═══════════════════════════════════════════════════════════════

/**
 * Search with caching
 * 
 * @param query - Search query
 * @param table - Table name
 * @param columns - Columns to search in
 * @param limit - Max results (default: 100)
 * @param ttl - Cache TTL in ms (default: 60s)
 * @returns Search results
 */
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
    simpleLogger.info(`✅ [Supabase] Search from cache: "${query}"`);
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
    simpleLogger.error('❌ [Supabase] Search failed:', error);
    return [];
  }

  // Cache results
  cache.set(cacheKey, data || [], ttl);

  simpleLogger.info(`✅ [Supabase] Search found ${data?.length || 0} results for "${query}"`);
  return data as T[] || [];
}

// ═══════════════════════════════════════════════════════════════
// PREFETCH HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Prefetch data and cache it
 * 
 * @param table - Table name
 * @param cacheKey - Cache key
 * @param query - Supabase query
 * @param ttl - Cache TTL in ms (default: 10 minutes)
 * @returns Prefetched data
 */
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
    simpleLogger.info(`✅ [Supabase] Prefetched ${table} (${data?.length || 0} rows)`);

    return data;
  } catch (error) {
    simpleLogger.error(`❌ [Supabase] Prefetch failed for ${table}:`, error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// COUNT OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Fast count without fetching data
 * 
 * @param table - Table name
 * @param filters - Optional filters
 * @returns Count
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
    simpleLogger.error('❌ [Supabase] Count failed:', error);
    return 0;
  }

  return count || 0;
}

// ═══════════════════════════════════════════════════════════════
// SINGLE-ROW UPDATE (Optimized)
// ═══════════════════════════════════════════════════════════════

/**
 * Update single row with optional return
 * 
 * @param table - Table name
 * @param id - Row ID
 * @param updates - Updates to apply
 * @param options - Optional settings (returnUpdated, skipTimestamp)
 * @returns Success status and optionally updated data
 */
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
      simpleLogger.error(`❌ [Supabase] Update failed for ${table}:${id}:`, error);
      return { success: false, error };
    }

    simpleLogger.info(`✅ [Supabase] Updated ${table}:${id}`);
    return { success: true, data };
  } else {
    const { error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      simpleLogger.error(`❌ [Supabase] Update failed for ${table}:${id}:`, error);
      return { success: false, error };
    }

    simpleLogger.info(`✅ [Supabase] Updated ${table}:${id}`);
    return { success: true };
  }
}

// ═══════════════════════════════════════════════════════════════
// UPSERT HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Upsert row (insert or update)
 * 
 * @param table - Table name
 * @param data - Row data
 * @param uniqueColumn - Unique column for conflict resolution (default: 'id')
 * @returns Success status and data
 */
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
    simpleLogger.error(`❌ [Supabase] Upsert failed for ${table}:`, error);
    return { success: false, error };
  }

  simpleLogger.info(`✅ [Supabase] Upserted ${table}`);
  return { success: true, data: result };
}

// ═══════════════════════════════════════════════════════════════
// LAZY LOADING HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Lazy loader for paginated data
 */
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
// PERFORMANCE MONITORING
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
      simpleLogger.warn(`⚠️ [Performance] Slow query detected:`, metric);
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

/**
 * Wrapper with performance monitoring
 * 
 * @param table - Table name
 * @param operation - Operation name
 * @param queryFn - Query function to monitor
 * @returns Query result
 */
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
