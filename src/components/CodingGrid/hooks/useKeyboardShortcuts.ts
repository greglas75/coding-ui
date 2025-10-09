import { useCallback, useEffect } from 'react';
import type { Answer } from '../../../types';

export function useKeyboardShortcuts({
  focusedRowId,
  localAnswers,
  setFocusedRowId,
  handleQuickStatus,
  handleAcceptSuggestion,
  handleSingleAICategorize,
  openCodeModal,
  undo,
  redo,
}: {
  focusedRowId: number | null;
  localAnswers: Answer[];
  setFocusedRowId: (id: number | null) => void;
  handleQuickStatus: (answer: Answer, key: string) => void;
  handleAcceptSuggestion: (answerId: number, suggestion: any) => void;
  handleSingleAICategorize: (answerId: number) => void;
  openCodeModal: (answer: Answer) => void;
  undo: () => void;
  redo: () => void;
}) {
  const handleKeyboardShortcut = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (!focusedRowId) return;

      const focusedAnswer = localAnswers.find(a => a.id === focusedRowId);
      if (!focusedAnswer) return;

      const key = event.key.toLowerCase();

      // Undo/Redo
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Prevent default for shortcuts
      const ourShortcuts = ['b', 'c', 'o', 'i', 'g', 'a', 's'];
      if (ourShortcuts.includes(key)) {
        event.preventDefault();
      }

      switch (key) {
        case 'b':
          handleQuickStatus(focusedAnswer, 'BL');
          break;
        case 'c':
          const hasAI = focusedAnswer.ai_suggestions?.suggestions && focusedAnswer.ai_suggestions.suggestions.length > 0;
          if (hasAI) {
            const topSuggestion = focusedAnswer.ai_suggestions!.suggestions![0];
            handleAcceptSuggestion(focusedAnswer.id, topSuggestion);
          } else {
            handleQuickStatus(focusedAnswer, 'C');
          }
          break;
        case 'o':
          handleQuickStatus(focusedAnswer, 'Oth');
          break;
        case 'i':
          handleQuickStatus(focusedAnswer, 'Ign');
          break;
        case 'g':
          handleQuickStatus(focusedAnswer, 'gBL');
          break;
        case 'a':
          handleSingleAICategorize(focusedAnswer.id);
          break;
        case 's':
          openCodeModal(focusedAnswer);
          break;
        case 'arrowdown':
          event.preventDefault();
          const currentIndex = localAnswers.findIndex(a => a.id === focusedRowId);
          if (currentIndex < localAnswers.length - 1) {
            setFocusedRowId(localAnswers[currentIndex + 1].id);
          }
          break;
        case 'arrowup':
          event.preventDefault();
          const prevIndex = localAnswers.findIndex(a => a.id === focusedRowId);
          if (prevIndex > 0) {
            setFocusedRowId(localAnswers[prevIndex - 1].id);
          }
          break;
        case 'escape':
          setFocusedRowId(null);
          break;
      }
    },
    [focusedRowId, localAnswers, handleQuickStatus, handleAcceptSuggestion, handleSingleAICategorize, openCodeModal, undo, redo, setFocusedRowId]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [handleKeyboardShortcut]);
}
