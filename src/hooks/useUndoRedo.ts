import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface AnswerState {
  general_status?: string;
  selected_code?: string | null;
  quick_status?: string | null;
  coding_date?: string;
  ai_suggestions?: any;
  confirmed_by?: string;
}

export interface HistoryAction {
  id: string;
  type: 'status_change' | 'code_assignment' | 'bulk_update' | 'ai_categorization';
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

    console.log(`📚 Added action to history: ${action.description} (${action.answerIds.length} answers)`);
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
      console.log(`⏪ Undoing: ${action.description}`);
      await action.undo();
      setCurrentIndex(prev => prev - 1);
      toast.success(`Undone: ${action.description}`);
    } catch (error) {
      console.error('Undo error:', error);
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
      console.log(`⏩ Redoing: ${action.description}`);
      await action.redo();
      setCurrentIndex(prev => prev + 1);
      toast.success(`Redone: ${action.description}`);
    } catch (error) {
      console.error('Redo error:', error);
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
    console.log('🗑️ History cleared');
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
