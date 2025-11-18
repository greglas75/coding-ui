import { useCallback, useEffect, useState } from 'react';
import type { Answer } from '../../../types';
import type { RowAnimations } from '../types';

export function useCodingGridState(answers: Answer[]) {
  const [localAnswers, setLocalAnswers] = useState<Answer[]>(answers);
  const [hasLocalModifications, setHasLocalModifications] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);
  const [rowAnimations, setRowAnimations] = useState<RowAnimations>({});
  const [focusedRowId, setFocusedRowId] = useState<number | null>(null);

  // 🔄 Sync localAnswers with answers prop when it changes
  useEffect(() => {
    setLocalAnswers(answers);
  }, [answers]);

  // State-related functions
  const triggerRowAnimation = useCallback((id: number, animationClass: string) => {
    setRowAnimations(prev => ({ ...prev, [id]: animationClass }));
    setTimeout(() => {
      setRowAnimations(prev => ({ ...prev, [id]: '' }));
    }, 800);
  }, []);

  const handleCheckboxChange = useCallback((answerId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, answerId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== answerId));
    }
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(localAnswers.map(answer => answer.id));
    } else {
      setSelectedIds([]);
    }
  }, [localAnswers]);

  return {
    // State
    localAnswers,
    setLocalAnswers,
    hasLocalModifications,
    setHasLocalModifications,
    selectedIds,
    setSelectedIds,
    selectedAction,
    setSelectedAction,
    isApplying,
    setIsApplying,
    rowAnimations,
    focusedRowId,
    setFocusedRowId,

    // Functions
    triggerRowAnimation,
    handleCheckboxChange,
    handleSelectAll,
  };
}
