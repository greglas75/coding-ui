import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { simpleLogger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// 🔍 QUERY: Fetch Codes for Category
// ═══════════════════════════════════════════════════════════════

export function useCodes(categoryId: number | undefined) {
  return useQuery({
    queryKey: ['codes', categoryId],

    queryFn: async () => {
      if (!categoryId) {
        simpleLogger.info('⏸️  useCodes: No category ID, returning empty array');
        return [];
      }

      simpleLogger.info('📥 useCodes: Fetching codes for category', categoryId);

      // First try localStorage cache
      const cacheKey = `codes_${categoryId}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsedCodes = JSON.parse(cached);
          simpleLogger.info(`✅ useCodes: Loaded ${parsedCodes.length} codes from localStorage cache`);
          return parsedCodes;
        } catch (error) {
          simpleLogger.error('❌ useCodes: Error parsing cached codes:', error);
          localStorage.removeItem(cacheKey);
        }
      }

      // Fetch from Supabase
      const PAGE_SIZE = 1000;
      const { data, error } = await supabase
        .from('codes_categories')
        .select(`
          codes (
            id,
            name
          )
        `)
        .eq('category_id', categoryId)
        .range(0, PAGE_SIZE - 1);

      if (error) {
        simpleLogger.error('❌ useCodes: Fetch error:', error);
        throw error;
      }

      const codes = data
        ?.map(item => item.codes)
        .filter(Boolean)
        .flat() as Array<{ id: number; name: string }>;

      const sortedCodes = codes?.sort((a, b) => a.name.localeCompare(b.name)) || [];

      // Cache if we got all codes
      if (data && data.length < PAGE_SIZE) {
        localStorage.setItem(cacheKey, JSON.stringify(sortedCodes));
        simpleLogger.info(`✅ useCodes: Loaded and cached ${sortedCodes.length} codes`);
      } else {
        simpleLogger.info(`✅ useCodes: Loaded ${sortedCodes.length} codes (more may exist)`);
      }

      return sortedCodes;
    },

    enabled: !!categoryId,

    // 🚀 PERFORMANCE: Codes are static data, cache longer
    staleTime: 30 * 60 * 1000, // 30 min (was 2 min) - rarely change
    cacheTime: 60 * 60 * 1000, // 1 hour - keep in memory
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔍 QUERY: Fetch All Codes
// ═══════════════════════════════════════════════════════════════

export function useAllCodes() {
  return useQuery({
    queryKey: ['codes', 'all'],

    queryFn: async () => {
      simpleLogger.info('📥 useAllCodes: Fetching all codes');

      const { data, error } = await supabase
        .from('codes')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        simpleLogger.error('❌ useAllCodes: Fetch error:', error);
        throw error;
      }

      simpleLogger.info(`✅ useAllCodes: Loaded ${data?.length || 0} codes`);
      return data || [];
    },

    // 🚀 PERFORMANCE: All codes cache longer
    staleTime: 30 * 60 * 1000, // 30 min
    cacheTime: 60 * 60 * 1000, // 1 hour
  });
}

// ═══════════════════════════════════════════════════════════════
// ✏️ MUTATION: Create Code
// ═══════════════════════════════════════════════════════════════

interface CreateCodePayload {
  name: string;
  categoryIds?: number[];
}

export function useCreateCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, categoryIds }: CreateCodePayload) => {
      simpleLogger.info('💾 useCreateCode: Creating code', name);

      // Insert code
      const { data: code, error: codeError } = await supabase
        .from('codes')
        .insert({ name })
        .select()
        .single();

      if (codeError) {
        simpleLogger.error('❌ useCreateCode: Error:', codeError);
        throw codeError;
      }

      // Link to categories if provided
      if (categoryIds && categoryIds.length > 0 && code) {
        const relations = categoryIds.map(catId => ({
          code_id: code.id,
          category_id: catId,
        }));

        const { error: relError } = await supabase
          .from('codes_categories')
          .insert(relations);

        if (relError) {
          simpleLogger.error('❌ useCreateCode: Error linking categories:', relError);
          throw relError;
        }
      }

      simpleLogger.info('✅ useCreateCode: Created successfully');
      return code;
    },

    onSuccess: () => {
      // Invalidate all code queries
      queryClient.invalidateQueries({ queryKey: ['codes'] });

      // Clear localStorage cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('codes_')) {
          localStorage.removeItem(key);
        }
      });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// ✏️ MUTATION: Update Code
// ═══════════════════════════════════════════════════════════════

interface UpdateCodePayload {
  id: number;
  name: string;
}

export function useUpdateCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: UpdateCodePayload) => {
      simpleLogger.info('💾 useUpdateCode: Updating code', id);

      const { data, error } = await supabase
        .from('codes')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        simpleLogger.error('❌ useUpdateCode: Error:', error);
        throw error;
      }

      simpleLogger.info('✅ useUpdateCode: Updated successfully');
      return data;
    },

    onSuccess: () => {
      // Invalidate all code queries
      queryClient.invalidateQueries({ queryKey: ['codes'] });

      // Clear localStorage cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('codes_')) {
          localStorage.removeItem(key);
        }
      });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 🗑️ MUTATION: Delete Code
// ═══════════════════════════════════════════════════════════════

export function useDeleteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      simpleLogger.info('🗑️ useDeleteCode: Deleting code', id);

      const { error } = await supabase
        .from('codes')
        .delete()
        .eq('id', id);

      if (error) {
        simpleLogger.error('❌ useDeleteCode: Error:', error);
        throw error;
      }

      simpleLogger.info('✅ useDeleteCode: Deleted successfully');
      return id;
    },

    onSuccess: () => {
      // Invalidate all code queries
      queryClient.invalidateQueries({ queryKey: ['codes'] });

      // Clear localStorage cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('codes_')) {
          localStorage.removeItem(key);
        }
      });
    },
  });
}
