import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { getSupabaseClient, createCode } from '../../../lib/supabase';
import { simpleLogger } from '../../../utils/logger';
import { saveFilterPreset, deleteFilterPreset } from '../utils/filterPresets';
import type { FilterGroup, FilterPreset } from '../../../lib/filterEngine';
import type { Answer } from '../../../types';

const supabase = getSupabaseClient();

interface UseCodingGridHandlersProps {
  localAnswers: Answer[];
  setLocalAnswers: React.Dispatch<React.SetStateAction<Answer[]>>;
  setHasLocalModifications: (value: boolean) => void;
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
  setSelectedAction: (action: string) => void;
  batchSelectedIds: number[];
  batchSelection: { clearSelection: () => void };
  currentCategoryId: number | null;
  filterGroup: FilterGroup;
  filterPresets: FilterPreset[];
  setFilterPresets: (presets: FilterPreset[]) => void;
  setFilterGroup: (group: FilterGroup) => void;
  answerActions: {
    findDuplicateAnswers: (answer: Answer, includeCoded?: boolean) => Promise<number[]>;
  };
  addAction: (action: any) => void;
  modals: {
    setShowBatchModal: (show: boolean) => void;
    setModalOpen: (open: boolean) => void;
    setSelectedAnswer: (answer: Answer | null) => void;
    selectedAnswer: Answer | null;
  };
  batchProcessor: {
    startBatch: (ids: number[], categoryId: number) => Promise<void>;
  };
  batchSelectionCount: number;
}

export function useCodingGridHandlers({
  localAnswers,
  setLocalAnswers,
  setHasLocalModifications,
  selectedIds,
  setSelectedIds,
  setSelectedAction,
  batchSelectedIds,
  batchSelection,
  currentCategoryId,
  filterGroup,
  filterPresets,
  setFilterPresets,
  setFilterGroup,
  answerActions,
  addAction,
  modals,
  batchProcessor,
  batchSelectionCount,
}: UseCodingGridHandlersProps) {
  const queryClient = useQueryClient();

  const handleSavePreset = useCallback(
    (name: string) => {
      const newPresets = saveFilterPreset(filterPresets, name, filterGroup);
      setFilterPresets(newPresets);
    },
    [filterPresets, filterGroup, setFilterPresets]
  );

  const handleLoadPreset = useCallback(
    (preset: FilterPreset) => {
      setFilterGroup(preset.filterGroup);
      toast.success(`Loaded preset: ${preset.name}`);
    },
    [setFilterGroup]
  );

  const handleDeletePreset = useCallback(
    (presetId: string) => {
      const newPresets = deleteFilterPreset(filterPresets, presetId);
      setFilterPresets(newPresets);
    },
    [filterPresets, setFilterPresets]
  );

  const handleBatchAI = useCallback(async () => {
    if (batchSelectionCount === 0) {
      toast.error('No answers selected');
      return;
    }

    if (!currentCategoryId) {
      toast.error('No category selected');
      return;
    }

    const confirmed = confirm(
      `Process ${batchSelectionCount} answers with AI? This may take several minutes.`
    );

    if (!confirmed) return;

    try {
      modals.setShowBatchModal(true);
      await batchProcessor.startBatch(batchSelectedIds, currentCategoryId);
    } catch (error) {
      simpleLogger.error('Batch AI processing error:', error);
      toast.error('Failed to start batch processing');
      modals.setShowBatchModal(false);
    }
  }, [
    batchSelectionCount,
    currentCategoryId,
    batchSelectedIds,
    batchProcessor,
    modals,
  ]);

  const handleCodeSaved = useCallback(async () => {
    const fallbackSelectedIds = selectedIds.length > 0 ? selectedIds : [];
    const preferredSelectedIds =
      batchSelectedIds.length > 0 ? batchSelectedIds : fallbackSelectedIds;
    const affectedIds =
      preferredSelectedIds.length > 0
        ? preferredSelectedIds
        : modals.selectedAnswer
        ? [
            modals.selectedAnswer.id,
            ...(await answerActions.findDuplicateAnswers(modals.selectedAnswer)),
          ]
        : [];

    if (affectedIds.length > 0) {
      if (batchSelectedIds.length > 0) {
        batchSelection.clearSelection();
      }

      if (selectedIds.length > 0) {
        setSelectedIds([]);
        setSelectedAction('');
      }
    }

    queryClient.invalidateQueries({ queryKey: ['answers', currentCategoryId] });

    try {
      const updatedAnswerIds = affectedIds.length > 0 ? affectedIds : [];
      if (updatedAnswerIds.length === 0) return;

      const { data: updatedAnswers, error } = await supabase
        .from('answers')
        .select(`*, answer_codes (codes (id, name))`)
        .in('id', updatedAnswerIds);

      if (error) {
        simpleLogger.error('Error refreshing answers:', error);
        return;
      }

      const transformedAnswers = updatedAnswers.map((answer) => ({
        ...answer,
        selected_code:
          answer.answer_codes?.map((ac: any) => ac.codes?.name).filter(Boolean).join(', ') || null,
      }));

      setLocalAnswers((prev) =>
        prev.map((answer) => {
          const updatedAnswer = transformedAnswers.find((ua) => ua.id === answer.id);
          return updatedAnswer || answer;
        })
      );

      setHasLocalModifications(true);
    } catch (err) {
      simpleLogger.error('Error refreshing answers:', err);
    }

    modals.setModalOpen(false);
    modals.setSelectedAnswer(null);
  }, [
    selectedIds,
    batchSelectedIds,
    modals,
    answerActions,
    batchSelection,
    setSelectedIds,
    setSelectedAction,
    queryClient,
    currentCategoryId,
    setLocalAnswers,
    setHasLocalModifications,
  ]);

  const handleQuickRollback = useCallback(
    async (answer: Answer) => {
      try {
        // Find ALL duplicate answers to reset them too (not just uncoded)
        const duplicateIds = await answerActions.findDuplicateAnswers(answer, false);
        const allIds = [answer.id, ...duplicateIds];

        simpleLogger.info(
          `🔄 Rolling back ${allIds.length} answer(s) (including ${duplicateIds.length} duplicates)`
        );

        // Update in database
        const { error } = await supabase
          .from('answers')
          .update({
            general_status: 'uncategorized',
            quick_status: null,
            selected_code: null,
            coding_date: null,
            updated_at: new Date().toISOString(),
          })
          .in('id', allIds);

        if (error) throw error;

        // Update local state for all affected answers
        setLocalAnswers((prev) =>
          prev.map((a) =>
            allIds.includes(a.id)
              ? {
                  ...a,
                  general_status: 'uncategorized',
                  quick_status: null,
                  selected_code: null,
                  coding_date: null,
                  updated_at: new Date().toISOString(),
                }
              : a
          )
        );
        setHasLocalModifications(true);

        // Add undo action
        addAction({
          id: crypto.randomUUID(),
          type: 'status_change',
          timestamp: Date.now(),
          description: `Rolled back ${allIds.length} answer(s): ${answer.answer_text?.substring(0, 30)}...`,
          answerIds: allIds,
          previousState: {
            [answer.id]: {
              general_status: answer.general_status || undefined,
              quick_status: answer.quick_status || undefined,
              selected_code: answer.selected_code,
            },
          },
          newState: {
            [answer.id]: {
              general_status: 'uncategorized',
              quick_status: undefined,
              selected_code: null,
            },
          },
          undo: async () => {
            const { error: undoError } = await supabase
              .from('answers')
              .update({
                general_status: answer.general_status,
                quick_status: answer.quick_status,
                selected_code: answer.selected_code,
              })
              .eq('id', answer.id);

            if (!undoError) {
              setLocalAnswers((prev) =>
                prev.map((a) =>
                  a.id === answer.id
                    ? {
                        ...a,
                        general_status: answer.general_status,
                        quick_status: answer.quick_status,
                        selected_code: answer.selected_code,
                      }
                    : a
                )
              );
            }
          },
          redo: async () => {
            await handleQuickRollback(answer);
          },
        });

        if (duplicateIds.length > 0) {
          toast.success(`Rolled back ${allIds.length} answer(s) to uncategorized`);
        } else {
          toast.success('Rolled back to uncategorized');
        }

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['answers', currentCategoryId] });
      } catch (error) {
        simpleLogger.error('❌ Error rolling back:', error);
        toast.error('Failed to rollback');
      }
    },
    [
      answerActions,
      setLocalAnswers,
      setHasLocalModifications,
      addAction,
      queryClient,
      currentCategoryId,
    ]
  );

  return {
    handleSavePreset,
    handleLoadPreset,
    handleDeletePreset,
    handleBatchAI,
    handleCodeSaved,
    handleQuickRollback,
  };
}

