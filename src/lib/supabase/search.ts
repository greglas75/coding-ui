/**
 * Search utilities with caching
 */

import { supabase } from '../supabaseClient';
import { simpleLogger } from '../../utils/logger';
import { cache } from './cache';

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
    supabaseQuery = supabaseQuery.or(columns.map(col => `${col}.ilike.%${query}%`).join(','));
  }

  const { data, error } = await supabaseQuery;

  if (error) {
    simpleLogger.error('❌ [Supabase] Search failed:', error);
    return [];
  }

  // Cache results
  cache.set(cacheKey, data || [], ttl);

  simpleLogger.info(`✅ [Supabase] Search found ${data?.length || 0} results for "${query}"`);
  return (data as T[]) || [];
}

/**
 * Prefetch data and cache it
 *
 * @param table - Table name
 * @param cacheKey - Cache key
 * @param query - Supabase query
 * @param ttl - Cache TTL in ms (default: 10 minutes)
 * @returns Prefetched data
 */
export async function prefetchData<T = unknown>(
  table: string,
  cacheKey: string,
  query: Promise<{ data: T | null; error: Error | null }>,
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

