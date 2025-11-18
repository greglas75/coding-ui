import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { normalizeStatuses } from '../lib/statusNormalization';
import { supabase } from '../lib/supabase';
import type { Answer } from '../types';
import { simpleLogger } from '../utils/logger';

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
        simpleLogger.info('⏸️  useAnswers: No category ID, returning empty array');
        return { data: [], count: 0 };
      }

      simpleLogger.info('📥 useAnswers: Fetching for category:', categoryId, 'page:', page);

      const controller = new AbortController();

      signal.addEventListener('abort', () => {
        controller.abort();
        simpleLogger.info('🛑 Query cancelled for category:', categoryId);
      });

      // Optimized query: removed heavy ai_suggestions JSONB field
      // and removed { count: 'exact' } to avoid full table scan
      // Count is now fetched separately via materialized view
      let query = supabase
        .from('answers')
        .select('id, answer_text, translation, translation_en, language, country, quick_status, general_status, selected_code, ai_suggested_code, category_id, coding_date, created_at, updated_at')
        .eq('category_id', categoryId)
        .order('id', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .abortSignal(controller.signal);

      // Apply filters
      if (filters?.types && filters.types.length > 0) {
        const normalizedTypes = normalizeStatuses(filters.types);
        query = query.in('general_status', normalizedTypes);
      }

      if (filters?.status && filters.status.length > 0) {
        // Apply status filter - use 'in' for array of statuses
        // Ensure it's an array even if passed as string
        const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
        const normalizedStatuses = normalizeStatuses(statusArray);
        query = query.in('general_status', normalizedStatuses);
      }

      if (filters?.language) {
        query = query.eq('language', filters.language);
      }

      if (filters?.country) {
        query = query.eq('country', filters.country);
      }

      if (filters?.search) {
        // Use full-text search with GIN index for 85-95% faster queries
        // Falls back to trigram index for pattern matching on multilingual text
        // Performance: 2-5s → 100-300ms for text search
        query = query.textSearch('answer_text', filters.search, {
          type: 'websearch',
          config: 'english',
        });
      }

      try {
        const { data, error } = await query;

        if (error) {
          if (error.message.includes('aborted')) {
            simpleLogger.info('⏹️ Query aborted gracefully');
            return { data: [], count: 0 };
          }
          simpleLogger.error('❌ useAnswers: Fetch error:', error);
          throw error;
        }

        // Get count from materialized view or filtered count function
        let count = 0;

        if (!filters || (!filters.types?.length && !filters.status && !filters.language && !filters.country && !filters.search)) {
          // No filters: use fast materialized view
          const { data: countData } = await supabase
            .from('category_answer_counts')
            .select('total_count')
            .eq('category_id', categoryId)
            .single();

          count = countData?.total_count || 0;
        } else {
          // With filters: use filtered count function (still much faster than count: 'exact')
          // For search queries, fall back to counting returned results
          if (filters.search) {
            // For search, we need to count the filtered results
            // This is acceptable since search results are typically smaller
            const { count: searchCount } = await supabase
              .from('answers')
              .select('id', { count: 'exact', head: true })
              .eq('category_id', categoryId)
              .textSearch('answer_text', filters.search, {
                type: 'websearch',
                config: 'english',
              });
            count = searchCount || 0;
          } else {
            // Use optimized count function for status/language/country filters
            const statusFilter = filters.types?.length ? filters.types :
                                filters.status ? [filters.status].flat() : null;

            const { data: countData } = await supabase
              .rpc('get_filtered_answer_count', {
                p_category_id: categoryId,
                p_status: statusFilter,
                p_language: filters.language || null,
                p_country: filters.country || null,
              });

            count = countData || 0;
          }
        }

        simpleLogger.info(`✅ useAnswers: Loaded ${data?.length || 0} of ${count} answers`);
        return { data: data || [], count };

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          simpleLogger.info('⏹️ Fetch aborted');
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
      simpleLogger.info('💾 useUpdateAnswer: Updating answer', id, updates);

      const { data, error } = await supabase
        .from('answers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        simpleLogger.error('❌ useUpdateAnswer: Error:', error);
        throw error;
      }

      simpleLogger.info('✅ useUpdateAnswer: Updated successfully');
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
      simpleLogger.error('❌ useUpdateAnswer: Mutation failed, rolling back', err);
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
      simpleLogger.info('🗑️ useDeleteAnswer: Deleting answer', id);

      const { error } = await supabase
        .from('answers')
        .delete()
        .eq('id', id);

      if (error) {
        simpleLogger.error('❌ useDeleteAnswer: Error:', error);
        throw error;
      }

      simpleLogger.info('✅ useDeleteAnswer: Deleted successfully');
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
      simpleLogger.info('💾 useBulkUpdateAnswers: Updating', ids.length, 'answers');

      const { data, error } = await supabase
        .from('answers')
        .update(updates)
        .in('id', ids)
        .select();

      if (error) {
        simpleLogger.error('❌ useBulkUpdateAnswers: Error:', error);
        throw error;
      }

      simpleLogger.info('✅ useBulkUpdateAnswers: Updated', data?.length, 'answers');
      return data;
    },

    onSuccess: () => {
      // Invalidate all answer queries
      queryClient.invalidateQueries({ queryKey: ['answers'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔍 QUERY: Fetch AI Suggestions (On-Demand)
// ═══════════════════════════════════════════════════════════════
// AI suggestions are heavy JSONB data, so we load them separately
// only when needed (e.g., when user opens a specific answer)
// ═══════════════════════════════════════════════════════════════

export function useAnswerAiSuggestions(answerId: number | null) {
  return useQuery({
    queryKey: ['answer-ai-suggestions', answerId],

    queryFn: async () => {
      if (!answerId) return null;

      simpleLogger.info('📥 Loading AI suggestions for answer:', answerId);

      const { data, error } = await supabase
        .from('answers')
        .select('ai_suggestions')
        .eq('id', answerId)
        .single();

      if (error) {
        simpleLogger.error('❌ Error loading AI suggestions:', error);
        throw error;
      }

      simpleLogger.info('✅ AI suggestions loaded');
      return data?.ai_suggestions;
    },

    enabled: !!answerId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
