/**
 * TanStack Query hook for fetching codes with usage counts
 * Replaces N+1 query pattern with single RPC call
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { simpleLogger } from '../utils/logger';
import type { CodeWithCategories } from '../types';

export interface CodeFilters {
  searchText?: string;
  onlyWhitelisted?: boolean;
  categoryIds?: number[];
  limit?: number;
  offset?: number;
}

export interface CodeWithUsageCount extends CodeWithCategories {
  usage_count: number;
}

export function useCodes(filters: CodeFilters = {}) {
  const { searchText, onlyWhitelisted = false, categoryIds = [], limit, offset = 0 } = filters;

  return useQuery({
    queryKey: ['codes', { searchText, onlyWhitelisted, categoryIds, limit, offset }],
    queryFn: async (): Promise<CodeWithUsageCount[]> => {
      simpleLogger.info('📊 Fetching codes with usage counts via RPC...', filters);

      const { data, error } = await supabase.rpc('get_codes_with_usage_counts', {
        p_search_text: searchText || null,
        p_only_whitelisted: onlyWhitelisted,
        p_category_ids: categoryIds.length > 0 ? categoryIds : null,
        p_limit: limit || null,
        p_offset: offset,
      });

      if (error) {
        simpleLogger.error('❌ Error fetching codes:', error);
        throw error;
      }

      simpleLogger.info(`✅ Fetched ${data?.length || 0} codes with usage counts`);

      return (data || []) as CodeWithUsageCount[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - codes don't change often
    cacheTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch on window focus
    keepPreviousData: true, // Keep showing old data while fetching new
  });
}

