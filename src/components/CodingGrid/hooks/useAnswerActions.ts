import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { handleError } from '../../../lib/errors';
import { getSupabaseClient } from '../../../lib/supabase';
import type { Answer, GeneralStatus } from '../../../types';
import { simpleLogger } from '../../../utils/logger';

const supabase = getSupabaseClient();

interface OfflineChange {
  action: 'update' | 'delete' | 'insert';
  table: string;
  data: {
    ids?: number[];
    updates?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

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

export function useAnswerActions({
  localAnswers,
  setLocalAnswers,
  isOnline,
  queueChange,
  addAction,
  triggerRowAnimation,
  categorizeAnswer,
}: {
  localAnswers: Answer[];
  setLocalAnswers: (updater: (prev: Answer[]) => Answer[]) => void;
  isOnline: boolean;
  queueChange: (change: OfflineChange) => Promise<void>;
  addAction: (action: HistoryAction) => void;
  triggerRowAnimation: (id: number, animation: string) => void;
  categorizeAnswer: (answerId: number) => void;
}) {
  const queryClient = useQueryClient();
  const [isCategorizingRow, setIsCategorizingRow] = useState<Record<number, boolean>>({});

  // Find duplicate answers (from database, not just local visible answers)
  const findDuplicateAnswers = useCallback(
    async (targetAnswer: Answer, onlyUncoded: boolean = false): Promise<number[]> => {
      try {
        let query = supabase
          .from('answers')
          .select('id')
          .eq('category_id', targetAnswer.category_id)
          .eq('answer_text', targetAnswer.answer_text)
          .neq('id', targetAnswer.id);

        // Only filter by selected_code if requested
        if (onlyUncoded) {
          query = query.is('selected_code', null);
        }

        const { data: duplicates, error } = await query;

        if (error || !duplicates) {
          handleError(error, {
            context: { component: 'useAnswerActions', action: 'findDuplicates' },
            fallbackMessage: 'Failed to find duplicate answers',
            silent: true, // Don't show toast for this background operation
          });
          return [];
        }

        return duplicates.map(d => d.id);
      } catch (error) {
        handleError(error, {
          context: { component: 'useAnswerActions', action: 'findDuplicates' },
          fallbackMessage: 'Failed to find duplicate answers',
          silent: true,
        });
        return [];
      }
    },
    []
  );

  // Handle Quick Status Changes
  const handleQuickStatus = useCallback(
    async (answer: Answer, statusKey: string) => {
      const statusMap: Record<string, string> = {
        Oth: 'Other',
        Ign: 'Ignore',
        gBL: 'Global Blacklist',
        BL: 'Blacklist',
        C: 'Confirmed',
      };

      const newStatus = statusMap[statusKey];
      const currentAnswer = localAnswers.find(a => a.id === answer.id) || answer;

      // Prevent 'C' (Confirmed) if no AI suggestion available
      if (statusKey === 'C') {
        const firstSuggestion = currentAnswer.ai_suggestions?.suggestions?.[0];
        if (!firstSuggestion || !firstSuggestion.code_name) {
          toast.error('Cannot confirm: No AI suggestion available');
          return;
        }
      }

      // Find ALL duplicates (not just uncoded) - we want to update status for all
      const duplicateIds = await findDuplicateAnswers(answer, false);
      const totalCount = duplicateIds.length + 1;
      const allIds = [answer.id, ...duplicateIds];

      simpleLogger.info(
        `🔄 Updating ${totalCount} answer(s) (including ${duplicateIds.length} duplicates)`
      );

      // Capture previous state for undo
      const previousState: Record<number, AnswerStateSnapshot> = {};
      allIds.forEach(id => {
        const ans = localAnswers.find(a => a.id === id);
        if (ans) {
          previousState[id] = {
            general_status: ans.general_status,
            quick_status: ans.quick_status,
            selected_code: ans.selected_code,
            coding_date: ans.coding_date,
          };
        }
      });

      // Optimistic update
      const optimisticUpdate: Partial<Answer> = {
        quick_status: newStatus as Answer['quick_status'],
        general_status: newStatus as GeneralStatus,
      };

      if (statusKey === 'C') {
        optimisticUpdate.quick_status = 'Confirmed';
        optimisticUpdate.general_status = 'whitelist';
        optimisticUpdate.coding_date = new Date().toISOString();

        // Auto-accept ALL AI suggestions if available
        const suggestions = currentAnswer.ai_suggestions?.suggestions;
        if (suggestions && suggestions.length > 0) {
          const allCodes = suggestions
            .filter(s => s.code_name)
            .map(s => s.code_name)
            .join(', ');
          optimisticUpdate.selected_code = allCodes;
          simpleLogger.info(
            `✅ Auto-accepting ${suggestions.length} AI suggestion(s): ${allCodes}`
          );
        }
      } else {
        // Clear coding_date for non-whitelist statuses
        optimisticUpdate.coding_date = null;
      }

      if (statusKey === 'gBL') {
        optimisticUpdate.selected_code = null;
      }

      setLocalAnswers(prev =>
        prev.map(a => (allIds.includes(a.id) ? { ...a, ...optimisticUpdate } : a))
      );

      // Animation disabled per user request
      // allIds.forEach(id => {
      //   triggerRowAnimation(id, "animate-pulse bg-green-600/20 transition duration-700");
      // });

      if (totalCount > 1) {
        toast.success(`Applied to ${totalCount} identical answers`, {
          description: `Updated "${answer.answer_text.substring(0, 50)}${answer.answer_text.length > 50 ? '...' : ''}"`,
        });
      }

      // Save to database
      try {
        const update: Partial<Answer> = {
          quick_status: newStatus as Answer['quick_status'],
          general_status: newStatus as GeneralStatus,
        };

        if (statusKey === 'C') {
          update.quick_status = 'Confirmed';
          update.general_status = 'whitelist';
          update.coding_date = new Date().toISOString();

          // Auto-accept ALL AI suggestions if available
          const suggestions = currentAnswer.ai_suggestions?.suggestions;
          if (suggestions && suggestions.length > 0) {
            const allCodes = suggestions
              .filter(s => s.code_name)
              .map(s => s.code_name)
              .join(', ');
            update.selected_code = allCodes;
          }
        } else {
          // Clear coding_date for non-whitelist statuses
          update.coding_date = null;
          // Clear selected_code for non-whitelist statuses (Other, Ignored, Blacklist, Global Blacklist)
          update.selected_code = null;
        }

        if (statusKey === 'gBL') {
          update.selected_code = null;
        }

        let saveSuccess = false;

        if (isOnline) {
          const { error } = await supabase.from('answers').update(update).in('id', allIds);

          if (error) throw error;
          saveSuccess = true;
          simpleLogger.info(`✅ Updated ${totalCount} answers with status: ${newStatus}`);
        } else {
          await queueChange({
            action: 'update',
            table: 'answers',
            data: { ids: allIds, updates: update },
          });
          saveSuccess = true;
          simpleLogger.info(`📝 Queued ${totalCount} answers for offline sync: ${newStatus}`);
        }

        if (saveSuccess) {
          // Invalidate queries to refresh UI (for duplicates on other pages/filters)
          queryClient.invalidateQueries({ queryKey: ['answers'] });

          // Add to history
          addAction({
            id: `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'status_change',
            timestamp: Date.now(),
            description: `Set ${totalCount} answer(s) to ${newStatus}`,
            answerIds: allIds,
            previousState,
            newState: allIds.reduce(
              (acc, id) => {
                acc[id] = optimisticUpdate as AnswerStateSnapshot;
                return acc;
              },
              {} as Record<number, AnswerStateSnapshot>
            ),
            undo: async () => {
              setLocalAnswers(prev =>
                prev.map(a => {
                  const revert = previousState[a.id];
                  return revert ? { ...a, ...revert } : a;
                })
              );

              for (const [id, state] of Object.entries(previousState)) {
                await supabase.from('answers').update(state).eq('id', parseInt(id));
              }

              queryClient.invalidateQueries({ queryKey: ['answers'] });
            },
            redo: async () => {
              setLocalAnswers(prev =>
                prev.map(a => (allIds.includes(a.id) ? { ...a, ...optimisticUpdate } : a))
              );

              await supabase.from('answers').update(update).in('id', allIds);

              queryClient.invalidateQueries({ queryKey: ['answers'] });
            },
          });
        }
      } catch (error) {
        handleError(error, {
          context: { component: 'useAnswerActions', action: 'handleQuickStatus' },
          fallbackMessage: 'Failed to update status',
        });
        setLocalAnswers(prev =>
          prev.map(a => (allIds.includes(a.id) ? (a.id === answer.id ? currentAnswer : a) : a))
        );
      }
    },
    [
      localAnswers,
      isOnline,
      queueChange,
      addAction,
      triggerRowAnimation,
      findDuplicateAnswers,
      setLocalAnswers,
    ]
  );

  // Handle AI Categorization
  const handleSingleAICategorize = useCallback(
    async (answerId: number) => {
      simpleLogger.info(`✨ AI categorizing single answer: ${answerId}`);
      setIsCategorizingRow(prev => ({ ...prev, [answerId]: true }));

      try {
        // Call the actual AI categorization mutation
        await categorizeAnswer(answerId);
        simpleLogger.info(`✅ AI categorization completed for answer ${answerId}`);
      } catch (error) {
        handleError(error, {
          context: { component: 'useAnswerActions', action: 'handleSingleAICategorize', metadata: { answerId } },
          fallbackMessage: 'AI categorization failed',
        });
      } finally {
        // Clear categorizing state when done
        setIsCategorizingRow(prev => {
          const newState = { ...prev };
          delete newState[answerId];
          return newState;
        });
      }
    },
    [categorizeAnswer]
  );

  return {
    isCategorizingRow,
    setIsCategorizingRow,
    handleQuickStatus,
    handleSingleAICategorize,
    findDuplicateAnswers,
  };
}
