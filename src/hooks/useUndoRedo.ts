import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { AiSuggestions } from '../types';
import { simpleLogger } from '../utils/logger';

export interface AnswerState {
  general_status?: string | null;
  selected_code?: string | null;
  quick_status?: string | null;
  coding_date?: string | null;
  ai_suggestions?: AiSuggestions | null;
  confirmed_by?: string;
}

export interface HistoryAction {
  id: string;
  type: 'status_change' | 'code_assignment' | 'bulk_update' | 'ai_categorization' | 'accept_suggestion';
  timestamp: number;
  description: string;
  answerIds: number[];
  previousState: Record<number, AnswerState>;
  newState: Record<number, AnswerState>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}) {
  const { maxHistorySize = 50 } = options;

  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  /**
   * Add action to history
   */
  const addAction = useCallback((action: HistoryAction) => {
    setHistory(prev => {
      // Remove any actions after current index (we're branching)
      const newHistory = prev.slice(0, currentIndex + 1);

      // Add new action
      newHistory.push(action);

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize);
      }

      return newHistory;
    });

    setCurrentIndex(prev => {
      const newIndex = prev + 1;
      return newIndex >= maxHistorySize ? maxHistorySize - 1 : newIndex;
    });

    simpleLogger.info(`📚 Added action to history: ${action.description} (${action.answerIds.length} answers)`);
  }, [currentIndex, maxHistorySize]);

  /**
   * Undo last action
   */
  const undo = useCallback(async () => {
    if (currentIndex < 0) {
      toast.error('Nothing to undo');
      return;
    }

    const action = history[currentIndex];

    try {
      simpleLogger.info(`⏪ Undoing: ${action.description}`);
      await action.undo();
      setCurrentIndex(prev => prev - 1);
      toast.success(`Undone: ${action.description}`);
    } catch (error) {
      simpleLogger.error('Undo error:', error);
      toast.error('Failed to undo action');
    }
  }, [history, currentIndex]);

  /**
   * Redo last undone action
   */
  const redo = useCallback(async () => {
    if (currentIndex >= history.length - 1) {
      toast.error('Nothing to redo');
      return;
    }

    const action = history[currentIndex + 1];

    try {
      simpleLogger.info(`⏩ Redoing: ${action.description}`);
      await action.redo();
      setCurrentIndex(prev => prev + 1);
      toast.success(`Redone: ${action.description}`);
    } catch (error) {
      simpleLogger.error('Redo error:', error);
      toast.error('Failed to redo action');
    }
  }, [history, currentIndex]);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    toast.success('History cleared');
    simpleLogger.info('🗑️ History cleared');
  }, []);

  /**
   * Get history summary
   */
  const getHistorySummary = useCallback(() => {
    return {
      total: history.length,
      current: currentIndex + 1,
      canUndo: currentIndex >= 0,
      canRedo: currentIndex < history.length - 1,
      recent: history.slice(-5).map(action => ({
        description: action.description,
        timestamp: new Date(action.timestamp).toLocaleTimeString(),
        type: action.type,
      })),
    };
  }, [history, currentIndex]);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    history,
    currentIndex,
    addAction,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    getHistorySummary,
  };
}
