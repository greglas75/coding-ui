/**
 * Pagination utilities for Supabase queries
 */

import { supabase } from '../supabaseClient';
import { simpleLogger } from '../../utils/logger';
import type { PaginatedResult } from './types';

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
): Promise<PaginatedResult<T>> {
  const start = page * limit;
  const end = start + limit - 1;

  let query = supabase.from(table).select('*', { count: 'exact' }).range(start, end);

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

