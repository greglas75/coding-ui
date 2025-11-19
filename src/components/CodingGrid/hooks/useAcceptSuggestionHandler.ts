import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { getSupabaseClient, createCode } from '../../../lib/supabase';
import { simpleLogger } from '../../../utils/logger';
import type { Answer, AiCodeSuggestion, GeneralStatus } from '../../../types';

const supabase = getSupabaseClient();

interface AnswerStateSnapshot {
  general_status: GeneralStatus;
  quick_status: string | null;
  selected_code: string | null;
  coding_date: string | null;
}

interface HistoryAction {
  id: string;
  type: 'status_change' | 'accept_suggestion' | 'code_change';
  timestamp: number;
  description: string;
  answerIds: number[];
  previousState: Record<number, AnswerStateSnapshot>;
  newState: Record<number, AnswerStateSnapshot>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface UseAcceptSuggestionHandlerProps {
  localAnswers: Answer[];
  setLocalAnswers: React.Dispatch<React.SetStateAction<Answer[]>>;
  answerActions: {
    findDuplicateAnswers: (answer: Answer, includeCoded?: boolean) => Promise<number[]>;
  };
  acceptSuggestion: (params: {
    answerId: number;
    codeId: string;
    codeName: string;
    confidence: number;
  }) => void;
  addAction: (action: HistoryAction) => void;
}

export function useAcceptSuggestionHandler({
  localAnswers,
  setLocalAnswers,
  answerActions,
  acceptSuggestion,
  addAction,
}: UseAcceptSuggestionHandlerProps) {
  const queryClient = useQueryClient();

  const handleAcceptSuggestion = useCallback(
    async (answerId: number, suggestion: AiCodeSuggestion) => {
      // Find current answer to save previous state for undo
      const currentAnswer = localAnswers.find((a) => a.id === answerId);
      if (!currentAnswer) return;

      const previousState: AnswerStateSnapshot = {
        selected_code: currentAnswer.selected_code,
        quick_status: currentAnswer.quick_status,
        general_status: currentAnswer.general_status,
        coding_date: currentAnswer.coding_date,
      };

      // ✅ Check if code needs to be created (discovered from web search)
      if (suggestion.isNew) {
        try {
          toast.loading(`Creating new code: ${suggestion.code_name}...`, { id: 'create-code' });
          await createCode(suggestion.code_name);
          toast.success(`✅ Created new code: ${suggestion.code_name}`, { id: 'create-code' });
          // Invalidate codes query to refresh the list
          queryClient.invalidateQueries({ queryKey: ['codes'] });
        } catch (error) {
          toast.error(
            `❌ Failed to create code: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { id: 'create-code' }
          );
          simpleLogger.error('Error creating code:', error);
          return; // Don't proceed with applying the code if creation failed
        }
      }

      // Calculate new selected code
      const existingCodes = currentAnswer.selected_code;
      let newSelectedCode = suggestion.code_name;

      if (existingCodes) {
        const codesList = existingCodes.split(',').map((c: string) => c.trim());
        if (!codesList.includes(suggestion.code_name)) {
          newSelectedCode = `${existingCodes}, ${suggestion.code_name}`;
        } else {
          newSelectedCode = existingCodes;
        }
      }

      const newState: AnswerStateSnapshot = {
        selected_code: newSelectedCode,
        quick_status: 'Confirmed' as const,
        general_status: 'whitelist' as const,
        coding_date: new Date().toISOString(),
      };

      // 🔍 Find all duplicate answers to update in local state
      const duplicateIds = await answerActions.findDuplicateAnswers(currentAnswer, true);
      const allIds = [answerId, ...duplicateIds];

      simpleLogger.info(
        `🎯 Accepting suggestion for answer ${answerId} + ${duplicateIds.length} duplicates (total: ${allIds.length})`
      );

      acceptSuggestion({
        answerId,
        codeId: suggestion.code_id,
        codeName: suggestion.code_name,
        confidence: suggestion.confidence,
      });

      // ✅ Update ALL identical answers in local state (optimistic update)
      setLocalAnswers((prev) =>
        prev.map((a) => (allIds.includes(a.id) ? { ...a, ...newState } : a))
      );

      // ✅ Build previous state for ALL affected answers (for undo history)
      const previousStateMap: Record<number, AnswerStateSnapshot> = {};
      allIds.forEach((id) => {
        const ans = localAnswers.find((a) => a.id === id);
        if (ans) {
          previousStateMap[id] = {
            selected_code: ans.selected_code,
            quick_status: ans.quick_status,
            general_status: ans.general_status,
            coding_date: ans.coding_date,
          };
        }
      });

      // Add to undo history
      const totalCount = allIds.length;
      addAction({
        id: crypto.randomUUID(),
        type: 'accept_suggestion',
        timestamp: Date.now(),
        description:
          totalCount > 1
            ? `Accepted AI suggestion: ${suggestion.code_name} (${totalCount} answers)`
            : `Accepted AI suggestion: ${suggestion.code_name}`,
        answerIds: allIds,
        previousState: previousStateMap,
        newState: allIds.reduce(
          (acc, id) => {
            acc[id] = newState;
            return acc;
          },
          {} as Record<number, AnswerStateSnapshot>
        ),
        undo: async () => {
          // Revert ALL duplicates - need to update each individually due to different previous states
          for (const [id, state] of Object.entries(previousStateMap)) {
            await supabase.from('answers').update(state).eq('id', parseInt(id));
          }

          setLocalAnswers((prev) =>
            prev.map((a) => {
              const revert = previousStateMap[a.id];
              return revert ? { ...a, ...revert } : a;
            })
          );
          queryClient.invalidateQueries({ queryKey: ['answers'] });
        },
        redo: async () => {
          // Re-apply to ALL duplicates
          const { error: redoError } = await supabase
            .from('answers')
            .update(newState)
            .in('id', allIds);

          if (!redoError) {
            setLocalAnswers((prev) =>
              prev.map((a) => (allIds.includes(a.id) ? { ...a, ...newState } : a))
            );
            queryClient.invalidateQueries({ queryKey: ['answers'] });
          }
        },
      });
    },
    [localAnswers, answerActions, acceptSuggestion, setLocalAnswers, addAction, queryClient]
  );

  return handleAcceptSuggestion;
}

