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
 * 2. Setting the status to 'Categorized'
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

      // First, get the current answer to check existing codes
      const { data: currentAnswer, error: fetchError } = await supabase
        .from('answers')
        .select('selected_code')
        .eq('id', answerId)
        .single();

      if (fetchError) {
        console.error('Error fetching current answer:', fetchError);
        throw fetchError;
      }

      // Add code to existing codes (if any)
      const existingCodes = currentAnswer?.selected_code;
      let newSelectedCode = codeName;

      if (existingCodes) {
        // Check if code is not already in the list
        const codesList = existingCodes.split(',').map((c: string) => c.trim());
        if (!codesList.includes(codeName)) {
          newSelectedCode = `${existingCodes}, ${codeName}`;
        } else {
          // Code already exists, don't add again
          newSelectedCode = existingCodes;
        }
      }

      // Update the answer with the selected code
      const { error: updateError } = await supabase
        .from('answers')
        .update({
          selected_code: newSelectedCode,
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

      // Auto-copy code to identical answers
      console.log(`🔍 Checking for duplicates to copy code...`);
      const copiedCount = await copyCodeToIdenticalAnswers(answerId, newSelectedCode);
      console.log(`✅ Auto-copy complete, copied to ${copiedCount} duplicates`);

      return { answerId, codeName, copiedCount };
    },

    onSuccess: (data) => {
      // Show success toast with duplicate count
      if (data.copiedCount > 0) {
        toast.success(`Code applied to ${data.copiedCount + 1} answer(s)!`, {
          description: `${data.codeName} has been assigned`,
        });
      } else {
        toast.success('Code applied!', {
          description: `${data.codeName} has been assigned`,
        });
      }

      // Invalidate queries to refresh UI
      console.log(`♻️ Invalidating queries for ${data.copiedCount + 1} answer(s)...`);
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
          // First, get the current answer to check existing codes
          const { data: currentAnswer, error: fetchError } = await supabase
            .from('answers')
            .select('selected_code')
            .eq('id', suggestion.answerId)
            .single();

          if (fetchError) throw fetchError;

          // Add code to existing codes (if any)
          const existingCodes = currentAnswer?.selected_code;
          let newSelectedCode = suggestion.codeName;

          if (existingCodes) {
            const codesList = existingCodes.split(',').map((c: string) => c.trim());
            if (!codesList.includes(suggestion.codeName)) {
              newSelectedCode = `${existingCodes}, ${suggestion.codeName}`;
            } else {
              newSelectedCode = existingCodes;
            }
          }

          const { error } = await supabase
            .from('answers')
            .update({
              selected_code: newSelectedCode,
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

/**
 * Copy code to all identical answers in the same category
 * Returns number of duplicates copied
 */
async function copyCodeToIdenticalAnswers(sourceId: number, selectedCode: string): Promise<number> {
  try {
    console.log(`🔎 copyCodeToIdenticalAnswers called for answer ${sourceId} with code "${selectedCode}"`);

    // Get source answer
    const { data: sourceAnswer, error: fetchError } = await supabase
      .from('answers')
      .select('answer_text, category_id')
      .eq('id', sourceId)
      .single();

    if (fetchError || !sourceAnswer) {
      console.error('Failed to fetch source answer:', fetchError);
      return 0;
    }

    console.log(`📝 Source answer: text="${sourceAnswer.answer_text}", category=${sourceAnswer.category_id}`);

    // Find identical answers (same text, same category, not already coded)
    const { data: duplicates, error: dupError } = await supabase
      .from('answers')
      .select('id')
      .eq('category_id', sourceAnswer.category_id)
      .eq('answer_text', sourceAnswer.answer_text)
      .neq('id', sourceId)
      .is('selected_code', null);

    if (dupError) {
      console.error('Error finding duplicates:', dupError);
      return 0;
    }

    if (!duplicates || duplicates.length === 0) {
      console.log(`ℹ️ No identical uncoded answers found`);
      return 0;
    }

    console.log(`📋 Found ${duplicates.length} identical uncoded answers, copying code...`);

    // Update all duplicates with the same code
    const { error: updateError } = await supabase
      .from('answers')
      .update({
        selected_code: selectedCode,
        quick_status: 'Confirmed',
        general_status: 'whitelist',
        coding_date: new Date().toISOString(),
      })
      .in('id', duplicates.map(d => d.id));

    if (updateError) {
      console.error('Failed to copy code to duplicates:', updateError);
      return 0;
    }

    console.log(`✅ Copied code to ${duplicates.length} identical answers`);
    return duplicates.length;
  } catch (error) {
    console.error('Error copying code to duplicates:', error);
    return 0;
  }
}
