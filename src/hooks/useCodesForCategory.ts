/**
 * Hook for fetching codes filtered by category
 * Includes automatic caching to avoid refetching
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { simpleLogger } from '../utils/logger';

interface Code {
  id: number;
  name: string;
}

export function useCodesForCategory(categoryId?: number) {
  return useQuery({
    queryKey: ['codes', 'by-category', categoryId ?? 'all'],
    queryFn: async (): Promise<Code[]> => {
      if (categoryId) {
        // Filter by category using codes_categories table
        simpleLogger.info('🔍 Fetching codes for category:', categoryId);

        const { data, error } = await supabase
          .from('codes_categories')
          .select(
            `
            codes (
              id,
              name
            )
          `
          )
          .eq('category_id', categoryId);

        if (error) {
          simpleLogger.error('❌ Error fetching codes for category:', error);
          throw error;
        }

        const codes = data
          .map(item => item.codes)
          .filter(Boolean)
          .flat() as Code[];

        simpleLogger.info(`✅ Fetched ${codes.length} codes for category ${categoryId}`);

        return codes.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // Show all codes if no category filter
        simpleLogger.info('🔍 Fetching all codes (no category filter)');

        const { data, error } = await supabase
          .from('codes')
          .select('id, name')
          .order('name');

        if (error) {
          simpleLogger.error('❌ Error fetching all codes:', error);
          throw error;
        }

        simpleLogger.info(`✅ Fetched ${data.length} codes (all)`);

        return data;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - codes don't change often
    cacheTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    enabled: true, // Always enabled, categoryId can be undefined
  });
}

