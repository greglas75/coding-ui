import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════
// 🔍 QUERY: Fetch Codes for Category
// ═══════════════════════════════════════════════════════════════

export function useCodes(categoryId: number | undefined) {
  return useQuery({
    queryKey: ['codes', categoryId],

    queryFn: async () => {
      if (!categoryId) {
        console.log('⏸️  useCodes: No category ID, returning empty array');
        return [];
      }

      console.log('📥 useCodes: Fetching codes for category', categoryId);

      // First try localStorage cache
      const cacheKey = `codes_${categoryId}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsedCodes = JSON.parse(cached);
          console.log(`✅ useCodes: Loaded ${parsedCodes.length} codes from localStorage cache`);
          return parsedCodes;
        } catch (error) {
          console.error('❌ useCodes: Error parsing cached codes:', error);
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
        console.error('❌ useCodes: Fetch error:', error);
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
        console.log(`✅ useCodes: Loaded and cached ${sortedCodes.length} codes`);
      } else {
        console.log(`✅ useCodes: Loaded ${sortedCodes.length} codes (more may exist)`);
      }

      return sortedCodes;
    },

    enabled: !!categoryId,

    // Codes don't change often, keep them fresh for 2 minutes
    staleTime: 2 * 60_000,
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔍 QUERY: Fetch All Codes
// ═══════════════════════════════════════════════════════════════

export function useAllCodes() {
  return useQuery({
    queryKey: ['codes', 'all'],

    queryFn: async () => {
      console.log('📥 useAllCodes: Fetching all codes');

      const { data, error } = await supabase
        .from('codes')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ useAllCodes: Fetch error:', error);
        throw error;
      }

      console.log(`✅ useAllCodes: Loaded ${data?.length || 0} codes`);
      return data || [];
    },

    staleTime: 2 * 60_000,
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
      console.log('💾 useCreateCode: Creating code', name);

      // Insert code
      const { data: code, error: codeError } = await supabase
        .from('codes')
        .insert({ name })
        .select()
        .single();

      if (codeError) {
        console.error('❌ useCreateCode: Error:', codeError);
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
          console.error('❌ useCreateCode: Error linking categories:', relError);
          throw relError;
        }
      }

      console.log('✅ useCreateCode: Created successfully');
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
      console.log('💾 useUpdateCode: Updating code', id);

      const { data, error } = await supabase
        .from('codes')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ useUpdateCode: Error:', error);
        throw error;
      }

      console.log('✅ useUpdateCode: Updated successfully');
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
      console.log('🗑️ useDeleteCode: Deleting code', id);

      const { error } = await supabase
        .from('codes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ useDeleteCode: Error:', error);
        throw error;
      }

      console.log('✅ useDeleteCode: Deleted successfully');
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
