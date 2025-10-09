/**
 * 🎯 React Query Hook for Accepting AI Suggestions
 *
 * Handles the process of accepting an AI suggestion and applying it to an answer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

interface AcceptSuggestionParams {
  answerId: number;
  codeId: string;
  codeName: string;
  confidence: number;
}

/**
 * Hook for accepting an AI suggestion
 *
 * This hook handles:
 * 1. Updating the answer with the selected code
 * 2. Setting the status to 'Confirmed' and 'whitelist'
 * 3. Setting the coding date
 * 4. Clearing or keeping AI suggestions (depending on strategy)
 *
 * @example
 * ```tsx
 * const { mutate: acceptSuggestion, isPending } = useAcceptSuggestion();
 *
 * <button onClick={() => acceptSuggestion({
 *   answerId: 1,
 *   codeId: "123",
 *   codeName: "Nike",
 *   confidence: 0.95
 * })}>
 *   Accept Suggestion
 * </button>
 * ```
 */
export function useAcceptSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      answerId,
      codeId: _codeId, // Used in logging, may be needed for future analytics
      codeName,
      confidence,
    }: AcceptSuggestionParams) => {
      console.log(`🎯 Accepting AI suggestion for answer ${answerId}:`, { codeName, confidence });

      // Update the answer with the selected code
      const { error: updateError } = await supabase
        .from('answers')
        .update({
          selected_code: codeName,
          quick_status: 'Confirmed',
          general_status: 'whitelist',
          coding_date: new Date().toISOString(),
          // Note: We keep ai_suggestions for audit/analytics purposes
          // If you want to clear them, uncomment the line below:
          // ai_suggestions: null,
        })
        .eq('id', answerId);

      if (updateError) {
        console.error('Error accepting suggestion:', updateError);
        throw updateError;
      }

      console.log(`✅ AI suggestion accepted for answer ${answerId}`);

      return { answerId, codeName };
    },

    onSuccess: (data) => {
      // Show success toast
      toast.success('Code applied!', {
        description: `${data.codeName} has been assigned`,
      });

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['answers'] });
      queryClient.invalidateQueries({ queryKey: ['answer', data.answerId] });

      console.log(`✅ Cache invalidated for answer ${data.answerId}`);
    },

    onError: (error) => {
      console.error('Error accepting suggestion:', error);

      // Show error toast
      toast.error('Failed to apply code', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

/**
 * Hook for accepting multiple AI suggestions in batch
 *
 * @example
 * ```tsx
 * const { mutate: acceptBatch, isPending } = useAcceptSuggestionsBatch();
 *
 * <button onClick={() => acceptBatch([
 *   { answerId: 1, codeId: "123", codeName: "Nike", confidence: 0.95 },
 *   { answerId: 2, codeId: "456", codeName: "Adidas", confidence: 0.92 }
 * ])}>
 *   Accept All
 * </button>
 * ```
 */
export function useAcceptSuggestionsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestions: AcceptSuggestionParams[]) => {
      console.log(`🎯 Batch accepting ${suggestions.length} AI suggestions`);

      const results = {
        processed: 0,
        errors: 0,
        errorDetails: [] as Array<{ answerId: number; error: string }>,
      };

      for (const suggestion of suggestions) {
        try {
          const { error } = await supabase
            .from('answers')
            .update({
              selected_code: suggestion.codeName,
              quick_status: 'Confirmed',
              general_status: 'whitelist',
              coding_date: new Date().toISOString(),
            })
            .eq('id', suggestion.answerId);

          if (error) {
            throw error;
          }

          results.processed++;
        } catch (error) {
          results.errors++;
          results.errorDetails.push({
            answerId: suggestion.answerId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          console.error(`Failed to accept suggestion for answer ${suggestion.answerId}:`, error);
        }
      }

      console.log(`✅ Batch complete: ${results.processed} processed, ${results.errors} errors`);
      return results;
    },

    onSuccess: (data) => {
      // Show success toast
      if (data.errors === 0) {
        toast.success(`✅ Successfully applied ${data.processed} codes!`);
      } else {
        toast.warning(
          `⚠️ Batch complete: ${data.processed} succeeded, ${data.errors} failed`,
          {
            description: `Success rate: ${(data.processed / (data.processed + data.errors) * 100).toFixed(1)}%`,
          }
        );
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['answers'] });

      console.log('Batch accept complete:', data);
    },

    onError: (error) => {
      console.error('Batch accept error:', error);
      toast.error('Failed to apply codes', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
