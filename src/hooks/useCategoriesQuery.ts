import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

// ═══════════════════════════════════════════════════════════════
// 🔍 QUERY: Fetch Categories
// ═══════════════════════════════════════════════════════════════

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],

    queryFn: async () => {
      console.log('📥 useCategories: Fetching all categories');

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ useCategories: Fetch error:', error);
        throw error;
      }

      console.log(`✅ useCategories: Loaded ${data?.length || 0} categories`);
      return data || [];
    },

    // Categories don't change often, keep them fresh for 5 minutes
    staleTime: 5 * 60_000,
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

      console.log('📥 useCategory: Fetching category', categoryId);

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error) {
        console.error('❌ useCategory: Fetch error:', error);
        throw error;
      }

      console.log('✅ useCategory: Loaded category', data?.name);
      return data;
    },

    enabled: !!categoryId,
    staleTime: 5 * 60_000,
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
      console.log('💾 useCreateCategory: Creating category', payload.name);

      const { data, error } = await supabase
        .from('categories')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('❌ useCreateCategory: Error:', error);
        throw error;
      }

      console.log('✅ useCreateCategory: Created successfully');
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
      console.log('💾 useUpdateCategory: Updating category', id);

      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ useUpdateCategory: Error:', error);
        throw error;
      }

      console.log('✅ useUpdateCategory: Updated successfully');
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
      console.log('🗑️ useDeleteCategory: Deleting category', id);

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ useDeleteCategory: Error:', error);
        throw error;
      }

      console.log('✅ useDeleteCategory: Deleted successfully');
      return id;
    },

    onSuccess: () => {
      // Invalidate categories list
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
