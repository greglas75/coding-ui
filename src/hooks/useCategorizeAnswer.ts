/**
 * 🤖 React Query Hook for AI Categorization
 *
 * Provides mutations for categorizing answers with OpenAI
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  autoConfirmHighConfidence,
  categorizeBatchAnswers,
  categorizeCategoryAnswers,
  categorizeSingleAnswer
} from '../api/categorize';
import type { AiCodeSuggestion } from '../types';
import { simpleLogger } from '../utils/logger';

/**
 * Hook for categorizing a single answer
 *
 * @example
 * ```tsx
 * const { mutate: categorize, isPending } = useCategorizeAnswer();
 *
 * <button
 *   onClick={() => categorize(answerId)}
 *   disabled={isPending}
 * >
 *   {isPending ? 'Categorizing...' : 'Get AI Suggestion'}
 * </button>
 * ```
 */
export function useCategorizeAnswer() {
  const queryClient = useQueryClient();

  return useMutation<AiCodeSuggestion[], Error, number>({
    mutationFn: (answerId: number) => categorizeSingleAnswer(answerId, true), // Always force regenerate

    onMutate: (answerId) => {
      simpleLogger.info(`Starting AI categorization for answer ${answerId}`);
      toast.loading('🤖 Getting AI suggestions...', {
        id: `categorize-${answerId}`,
      });
    },

    onSuccess: (data, answerId) => {
      // Dismiss loading toast
      toast.dismiss(`categorize-${answerId}`);

      // Show success with number of suggestions
      toast.success(
        `✅ Got ${data.length} AI suggestion${data.length !== 1 ? 's' : ''}!`,
        {
          description: data[0]
            ? `Top: ${data[0].code_name} (${(data[0].confidence * 100).toFixed(0)}% confident)`
            : undefined,
        }
      );

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['answers'] });
      queryClient.invalidateQueries({ queryKey: ['answer', answerId] });

      simpleLogger.info(`✅ AI suggestions generated for answer ${answerId}:`, data);
    },

    onError: (error, answerId) => {
      // Dismiss loading toast
      toast.dismiss(`categorize-${answerId}`);

      // Show error
      toast.error('❌ Failed to generate AI suggestions', {
        description: error.message,
      });

      simpleLogger.error('Categorization error:', error);
    },
  });
}

/**
 * Hook for batch categorizing multiple answers
 *
 * @example
 * ```tsx
 * const { mutate: batchCategorize, isPending } = useBatchCategorize();
 *
 * <button onClick={() => batchCategorize([1, 2, 3])}>
 *   Categorize Selected Answers
 * </button>
 * ```
 */
export function useBatchCategorize() {
  const queryClient = useQueryClient();

  return useMutation<
    { processed: number; errors: number; errorDetails: Array<{ answerId: number; error: string }> },
    Error,
    number[]
  >({
    mutationFn: categorizeBatchAnswers,

    onMutate: (answerIds) => {
      simpleLogger.info(`Starting batch categorization for ${answerIds.length} answers`);
      toast.loading(`🤖 Categorizing ${answerIds.length} answers...`, {
        id: 'batch-categorize',
      });
    },

    onSuccess: (data, _answerIds) => { // answerIds available for future per-answer invalidation
      toast.dismiss('batch-categorize');

      const successRate = data.processed / (data.processed + data.errors);

      if (data.errors === 0) {
        toast.success(`✅ Successfully categorized all ${data.processed} answers!`);
      } else {
        toast.warning(
          `⚠️ Batch complete: ${data.processed} succeeded, ${data.errors} failed`,
          {
            description: `Success rate: ${(successRate * 100).toFixed(1)}%`,
          }
        );
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['answers'] });

      simpleLogger.info('Batch categorization complete:', data);
    },

    onError: (error, _answerIds) => { // answerIds available for future error tracking
      toast.dismiss('batch-categorize');
      toast.error('❌ Batch categorization failed', {
        description: error.message,
      });
      simpleLogger.error('Batch categorization error:', error);
    },
  });
}

/**
 * Hook for categorizing all uncoded answers in a category
 *
 * @example
 * ```tsx
 * const { mutate: categorizeCategory, isPending } = useCategorizeCategory();
 *
 * <button onClick={() => categorizeCategory({ categoryId: 1, limit: 100 })}>
 *   Auto-Categorize 100 Answers
 * </button>
 * ```
 */
export function useCategorizeCategory() {
  const queryClient = useQueryClient();

  return useMutation<
    { processed: number; errors: number; errorDetails: Array<{ answerId: number; error: string }> },
    Error,
    { categoryId: number; limit?: number }
  >({
    mutationFn: ({ categoryId, limit }) => categorizeCategoryAnswers(categoryId, limit),

    onMutate: ({ categoryId, limit = 100 }) => {
      simpleLogger.info(`Starting category categorization for category ${categoryId}, limit ${limit}`);
      toast.loading(`🤖 Categorizing up to ${limit} answers...`, {
        id: 'category-categorize',
      });
    },

    onSuccess: (data, { categoryId }) => {
      toast.dismiss('category-categorize');

      if (data.processed === 0 && data.errors === 0) {
        toast.info('ℹ️ No uncoded answers found to categorize');
      } else if (data.errors === 0) {
        toast.success(`✅ Successfully categorized ${data.processed} answers!`);
      } else {
        toast.warning(
          `⚠️ Categorized ${data.processed} answers, ${data.errors} failed`,
          {
            description: `Success rate: ${(data.processed / (data.processed + data.errors) * 100).toFixed(1)}%`,
          }
        );
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['answers'] });
      queryClient.invalidateQueries({ queryKey: ['answers', categoryId] });

      simpleLogger.info('Category categorization complete:', data);
    },

    onError: (error, { categoryId: _categoryId }) => { // categoryId available for per-category error handling
      toast.dismiss('category-categorize');
      toast.error('❌ Category categorization failed', {
        description: error.message,
      });
      simpleLogger.error('Category categorization error:', error);
    },
  });
}

/**
 * Hook for auto-confirming high-confidence AI suggestions
 *
 * @example
 * ```tsx
 * const { mutate: autoConfirm, isPending } = useAutoConfirm();
 *
 * <button onClick={() => autoConfirm({ categoryId: 1, threshold: 0.95 })}>
 *   Auto-Confirm (>95% confidence)
 * </button>
 * ```
 */
export function useAutoConfirm() {
  const queryClient = useQueryClient();

  return useMutation<
    { confirmed: number; total: number },
    Error,
    { categoryId?: number | null; threshold?: number }
  >({
    mutationFn: ({ categoryId = null, threshold = 0.95 }) =>
      autoConfirmHighConfidence(categoryId, threshold),

    onMutate: ({ threshold = 0.95 }) => {
      simpleLogger.info(`Starting auto-confirm with threshold ${threshold}`);
      toast.loading('🚀 Auto-confirming high-confidence suggestions...', {
        id: 'auto-confirm',
      });
    },

    onSuccess: (data, { threshold = 0.95 }) => {
      toast.dismiss('auto-confirm');

      if (data.confirmed === 0) {
        toast.info(
          `ℹ️ No suggestions found above ${(threshold * 100).toFixed(0)}% confidence`
        );
      } else {
        toast.success(
          `✅ Auto-confirmed ${data.confirmed} out of ${data.total} suggestions!`,
          {
            description: `Confidence threshold: ${(threshold * 100).toFixed(0)}%`,
          }
        );
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['answers'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });

      simpleLogger.info('Auto-confirm complete:', data);
    },

    onError: (error, { threshold: _threshold }) => { // threshold available for error logging
      toast.dismiss('auto-confirm');
      toast.error('❌ Auto-confirm failed', {
        description: error.message,
      });
      simpleLogger.error('Auto-confirm error:', error);
    },
  });
}

/**
 * Combined hook that provides all AI categorization mutations
 *
 * @example
 * ```tsx
 * const ai = useAiCategorization();
 *
 * <button onClick={() => ai.categorizeSingle(1)}>Categorize</button>
 * <button onClick={() => ai.batchCategorize([1,2,3])}>Batch</button>
 * <button onClick={() => ai.categorizeCategory(1, 100)}>Auto-Process</button>
 * <button onClick={() => ai.autoConfirm(1, 0.95)}>Auto-Confirm</button>
 * ```
 */
export function useAiCategorization() {
  const categorizeAnswerMutation = useCategorizeAnswer();
  const batchCategorizeMutation = useBatchCategorize();
  const categorizeCategoryMutation = useCategorizeCategory();
  const autoConfirmMutation = useAutoConfirm();

  return {
    // Single answer
    categorizeSingle: categorizeAnswerMutation.mutate,
    categorizeSingleAsync: categorizeAnswerMutation.mutateAsync,
    isCategorizing: categorizeAnswerMutation.isPending,
    categorizeError: categorizeAnswerMutation.error,

    // Batch
    batchCategorize: batchCategorizeMutation.mutate,
    batchCategorizeAsync: batchCategorizeMutation.mutateAsync,
    isBatchCategorizing: batchCategorizeMutation.isPending,
    batchError: batchCategorizeMutation.error,

    // Category
    categorizeCategory: (categoryId: number, limit?: number) =>
      categorizeCategoryMutation.mutate({ categoryId, limit }),
    categorizeCategoryAsync: categorizeCategoryMutation.mutateAsync,
    isCategoryProcessing: categorizeCategoryMutation.isPending,
    categoryError: categorizeCategoryMutation.error,

    // Auto-confirm
    autoConfirm: (categoryId?: number | null, threshold?: number) =>
      autoConfirmMutation.mutate({ categoryId, threshold }),
    autoConfirmAsync: autoConfirmMutation.mutateAsync,
    isAutoConfirming: autoConfirmMutation.isPending,
    autoConfirmError: autoConfirmMutation.error,

    // Overall status
    isAnyPending:
      categorizeAnswerMutation.isPending ||
      batchCategorizeMutation.isPending ||
      categorizeCategoryMutation.isPending ||
      autoConfirmMutation.isPending,
  };
}
