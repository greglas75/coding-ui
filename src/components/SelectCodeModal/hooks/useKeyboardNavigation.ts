/**
 * Keyboard Navigation Hook for SelectCodeModal
 */

import { useEffect } from 'react';
import { toast } from 'sonner';
import type { Answer } from '../../../types';
import { simpleLogger } from '../../../utils/logger';

interface UseKeyboardNavigationProps {
  open: boolean;
  onClose: () => void;
  currentAnswerIndex: number;
  allAnswers: Answer[];
  onNavigate: (newIndex: number) => void;
  handleQuickStatus: (answer: Answer, status: string) => void;
  selectedAnswerIds: number[];
  onGenerateAISuggestions?: (answerId: number) => void;
}

export function useKeyboardNavigation({
  open,
  onClose,
  currentAnswerIndex,
  allAnswers,
  onNavigate,
  handleQuickStatus,
  selectedAnswerIds,
  onGenerateAISuggestions,
}: UseKeyboardNavigationProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC always closes modal, even when typing in input
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Don't trigger other shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement) return;

      // Arrow key navigation
      if (e.key === 'ArrowLeft' && currentAnswerIndex > 0) {
        e.preventDefault();
        onNavigate(currentAnswerIndex - 1);
      }
      if (e.key === 'ArrowRight' && currentAnswerIndex < allAnswers.length - 1) {
        e.preventDefault();
        onNavigate(currentAnswerIndex + 1);
      }

      // Quick Status shortcuts
      const currentAnswer = allAnswers[currentAnswerIndex];

      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        handleQuickStatus(currentAnswer, 'Oth');
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleQuickStatus(currentAnswer, 'Ign');
      }
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleQuickStatus(currentAnswer, 'gBL');
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleQuickStatus(currentAnswer, 'BL');
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleQuickStatus(currentAnswer, 'C');
      }

      // AI Categorization shortcut
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (selectedAnswerIds.length > 0 && onGenerateAISuggestions) {
          const answerId = selectedAnswerIds[0];
          simpleLogger.info('🤖 Generating AI suggestions for answer:', answerId);
          toast.info('🤖 Generating AI suggestions...');
          onGenerateAISuggestions(answerId);
        } else {
          toast.error('Unable to generate AI suggestions');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    open,
    onClose,
    currentAnswerIndex,
    allAnswers,
    onNavigate,
    handleQuickStatus,
    selectedAnswerIds,
    onGenerateAISuggestions,
  ]);
}

