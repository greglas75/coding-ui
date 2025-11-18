/**
 * CodingGrid Context
 *
 * Provides centralized state and actions for CodingGrid and its child components.
 * Eliminates prop drilling by making state available throughout the component tree.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { Answer } from '../../../types';
import type { UseBatchSelectionReturn } from '../../../hooks/useBatchSelection';
import type { UseModalManagementReturn } from '../hooks/useModalManagement';
import type { UseAnswerActionsReturn } from '../hooks/useAnswerActions';
import type { RowAnimations } from '../types';
import type { BatchAIProcessor } from '../../../lib/batchAIProcessor';

export interface CodingGridContextValue {
  // State
  localAnswers: Answer[];
  focusedRowId: number | null;
  setFocusedRowId: (id: number | null) => void;
  rowAnimations: RowAnimations;

  // Batch selection
  batchSelection: UseBatchSelectionReturn;

  // Actions
  answerActions: UseAnswerActionsReturn;

  // Modals
  modals: UseModalManagementReturn;

  // Batch processing
  batchProcessor: BatchAIProcessor;

  // Handlers
  handleAcceptSuggestion: (answerId: number, suggestion: any) => Promise<void>;
  handleQuickRollback: () => void;
  handleBatchAI: () => void;
  handleToggleSelection: (id: string, event: React.MouseEvent) => void;
}

const CodingGridContext = createContext<CodingGridContextValue | null>(null);

export interface CodingGridProviderProps {
  value: CodingGridContextValue;
  children: ReactNode;
}

export function CodingGridProvider({ value, children }: CodingGridProviderProps) {
  return (
    <CodingGridContext.Provider value={value}>
      {children}
    </CodingGridContext.Provider>
  );
}

export function useCodingGridContext(): CodingGridContextValue {
  const context = useContext(CodingGridContext);
  if (!context) {
    throw new Error('useCodingGridContext must be used within a CodingGridProvider');
  }
  return context;
}
