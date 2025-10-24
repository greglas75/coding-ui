import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';
import { simpleLogger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// 🔍 QUERY: Fetch Categories
// ═══════════════════════════════════════════════════════════════

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],

    queryFn: async () => {
      simpleLogger.info('📥 useCategories: Fetching all categories');

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        simpleLogger.error('❌ useCategories: Fetch error:', error);
        throw error;
      }

      simpleLogger.info(`✅ useCategories: Loaded ${data?.length || 0} categories`);
      return data || [];
    },

    // 🚀 PERFORMANCE: Categories are semi-static, cache longer
    staleTime: 15 * 60 * 1000, // 15 min (was 5 min)
    cacheTime: 30 * 60 * 1000, // 30 min
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔍 QUERY: Fetch Single Category
// ═══════════════════════════════════════════════════════════════

export function useCategory(categoryId: number | undefined) {
  return useQuery({
    queryKey: ['categories', categoryId],

    queryFn: async () => {
      if (!categoryId) return null;

      simpleLogger.info('📥 useCategory: Fetching category', categoryId);

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) {
        simpleLogger.error('❌ useCategory: Fetch error:', error);
        throw error;
      }

      simpleLogger.info('✅ useCategory: Loaded category', data?.name);
      return data;
    },

    enabled: !!categoryId,
    // 🚀 PERFORMANCE: Cache longer
    staleTime: 15 * 60 * 1000, // 15 min (was 5 min)
    cacheTime: 30 * 60 * 1000, // 30 min
  });
}

// ═══════════════════════════════════════════════════════════════
// ✏️ MUTATION: Create Category
// ═══════════════════════════════════════════════════════════════

interface CreateCategoryPayload {
  name: string;
  description?: string;
  template?: string;
  model?: string;
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCategoryPayload) => {
      simpleLogger.info('💾 useCreateCategory: Creating category', payload.name);

      const { data, error } = await supabase
        .from('categories')
        .insert(payload)
        .select()
        .single();

      if (error) {
        simpleLogger.error('❌ useCreateCategory: Error:', error);
        throw error;
      }

      simpleLogger.info('✅ useCreateCategory: Created successfully');
      return data;
    },

    onSuccess: () => {
      // Invalidate categories list
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// ✏️ MUTATION: Update Category
// ═══════════════════════════════════════════════════════════════

interface UpdateCategoryPayload {
  id: number;
  updates: Partial<Category>;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: UpdateCategoryPayload) => {
      simpleLogger.info('💾 useUpdateCategory: Updating category', id);

      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        simpleLogger.error('❌ useUpdateCategory: Error:', error);
        throw error;
      }

      simpleLogger.info('✅ useUpdateCategory: Updated successfully');
      return data;
    },

    onSuccess: (data) => {
      // Invalidate both list and specific category
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', data.id] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 🗑️ MUTATION: Delete Category
// ═══════════════════════════════════════════════════════════════

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      simpleLogger.info('🗑️ useDeleteCategory: Deleting category', id);

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        simpleLogger.error('❌ useDeleteCategory: Error:', error);
        throw error;
      }

      simpleLogger.info('✅ useDeleteCategory: Deleted successfully');
      return id;
    },

    onSuccess: () => {
      // Invalidate categories list
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
