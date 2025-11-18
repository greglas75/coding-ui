/**
 * Types for SelectCodeModal
 */

import type { Answer } from '../../types';

export interface SelectCodeModalProps {
  open: boolean;
  onClose: () => void;
  selectedAnswerIds: number[];
  allAnswers: Answer[];
  currentAnswerIndex: number;
  preselectedCodes?: string[];
  onSaved: () => void;
  onNavigate: (newIndex: number) => void;
  mode: 'overwrite' | 'additional';
  categoryId?: number;
  selectedAnswer?: string;
  translation?: string;
  aiSuggestions?: {
    suggestions: Array<{
      code_id: string;
      code_name: string;
      confidence: number;
      reasoning: string;
    }>;
    timestamp?: string;
    model?: string;
  };
  onGenerateAISuggestions?: (answerId: number) => void;
}

