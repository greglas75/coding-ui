/**
 * Optimized query functions for categories and codes
 */

import { supabase } from '../supabaseClient';
import { simpleLogger } from '../../utils/logger';
import { cache } from './cache';
import type { OptimizedQueryResult } from './types';

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
export async function fetchAISuggestion(answerId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('answers')
    .select('ai_suggested_code')
    .eq('id', answerId)
    .single();
  if (error) {
    simpleLogger.error('❌ Error fetching AI suggestion:', error);
    return [];
  }
  // Convert string to array if it exists
  return data?.ai_suggested_code ? [data.ai_suggested_code] : [];
}

/**
 * Fetch categories with caching
 *
 * @param forceRefresh - Force refresh from database (default: false)
 * @returns Categories with source indicator (cache or database)
 */
export async function fetchCategoriesOptimized(
  forceRefresh = false
): Promise<OptimizedQueryResult<any>> {
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
      category_ids: relationsMap.get(code.id) || [],
    }));

    // Filter by category
    const filtered =
      filters.categoryId.length > 0
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

