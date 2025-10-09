import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Answer } from '../types';

// ═══════════════════════════════════════════════════════════════
// 🔍 QUERY: Fetch Answers
// ═══════════════════════════════════════════════════════════════

interface UseAnswersOptions {
  categoryId?: number;
  page?: number;
  pageSize?: number;
  filters?: {
    types?: string[];
    status?: string;
    codes?: string[];
    language?: string;
    country?: string;
    search?: string;
  };
}

export function useAnswers(options: UseAnswersOptions) {
  const { categoryId, page = 0, pageSize = 100, filters } = options;

  return useQuery({
    // Unique key based on all filter params
    queryKey: ['answers', categoryId, page, pageSize, filters],

    queryFn: async ({ signal }) => {
      if (!categoryId) {
        console.log('⏸️  useAnswers: No category ID, returning empty array');
        return { data: [], count: 0 };
      }

      console.log('📥 useAnswers: Fetching for category:', categoryId, 'page:', page);

      const controller = new AbortController();

      signal.addEventListener('abort', () => {
        controller.abort();
        console.log('🛑 Query cancelled for category:', categoryId);
      });

      let query = supabase
        .from('answers')
        .select('id, answer_text, translation, translation_en, language, country, quick_status, general_status, selected_code, ai_suggested_code, ai_suggestions, category_id, coding_date, created_at, updated_at', { count: 'exact' })
        .eq('category_id', categoryId)
        .order('id', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .abortSignal(controller.signal);

      // Apply filters
      if (filters?.types && filters.types.length > 0) {
        query = query.in('general_status', filters.types);
      }

      if (filters?.status && filters.status.length > 0) {
        // Apply status filter - use 'in' for array of statuses
        // Ensure it's an array even if passed as string
        const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
        query = query.in('general_status', statusArray);
      }

      if (filters?.language) {
        query = query.eq('language', filters.language);
      }

      if (filters?.country) {
        query = query.eq('country', filters.country);
      }

      if (filters?.search) {
        query = query.ilike('answer_text', `%${filters.search}%`);
      }

      try {
        const { data, error, count } = await query;

        if (error) {
          if (error.message.includes('aborted')) {
            console.log('⏹️ Query aborted gracefully');
            return { data: [], count: 0 };
          }
          console.error('❌ useAnswers: Fetch error:', error);
          throw error;
        }

        console.log(`✅ useAnswers: Loaded ${data?.length || 0} of ${count || 0} answers`);
        return { data: data || [], count: count || 0 };

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('⏹️ Fetch aborted');
          return { data: [], count: 0 };
        }
        throw error;
      }
    },

    // Only fetch if we have a category ID
    enabled: !!categoryId,

    // Keep data fresh for 1 minute
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════════
// ✏️ MUTATION: Update Answer
// ═══════════════════════════════════════════════════════════════

interface UpdateAnswerPayload {
  id: number;
  updates: Partial<Answer>;
}

export function useUpdateAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: UpdateAnswerPayload) => {
      console.log('💾 useUpdateAnswer: Updating answer', id, updates);

      const { data, error } = await supabase
        .from('answers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ useUpdateAnswer: Error:', error);
        throw error;
      }

      console.log('✅ useUpdateAnswer: Updated successfully');
      return data;
    },

    // Optimistic update
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['answers'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: ['answers'] });

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ['answers'] }, (old: any) => {
        if (!old) return old;

        return {
          ...old,
          data: old.data?.map((answer: Answer) =>
            answer.id === id ? { ...answer, ...updates } : answer
          ),
        };
      });

      return { previousData };
    },

    // If the mutation fails, rollback
    onError: (err, _variables, context) => {
      console.error('❌ useUpdateAnswer: Mutation failed, rolling back', err);
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['answers'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 🗑️ MUTATION: Delete Answer
// ═══════════════════════════════════════════════════════════════

export function useDeleteAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      console.log('🗑️ useDeleteAnswer: Deleting answer', id);

      const { error } = await supabase
        .from('answers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ useDeleteAnswer: Error:', error);
        throw error;
      }

      console.log('✅ useDeleteAnswer: Deleted successfully');
      return id;
    },

    onSuccess: () => {
      // Invalidate and refetch answers
      queryClient.invalidateQueries({ queryKey: ['answers'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 📊 MUTATION: Bulk Update Answers
// ═══════════════════════════════════════════════════════════════

interface BulkUpdatePayload {
  ids: number[];
  updates: Partial<Answer>;
}

export function useBulkUpdateAnswers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: BulkUpdatePayload) => {
      console.log('💾 useBulkUpdateAnswers: Updating', ids.length, 'answers');

      const { data, error } = await supabase
        .from('answers')
        .update(updates)
        .in('id', ids)
        .select();

      if (error) {
        console.error('❌ useBulkUpdateAnswers: Error:', error);
        throw error;
      }

      console.log('✅ useBulkUpdateAnswers: Updated', data?.length, 'answers');
      return data;
    },

    onSuccess: () => {
      // Invalidate all answer queries
      queryClient.invalidateQueries({ queryKey: ['answers'] });
    },
  });
}
