/**
 * Code Actions Hook
 * Shared action handlers for code editing operations
 */

import type { CodeWithCategories } from '../../types';

interface UseCodeActionsProps {
  onUpdateName: (id: number, name: string) => void;
  onUpdateCategories: (id: number, categoryIds: number[]) => void;
  setEditingName: (id: number | null) => void;
  setEditingCategories: (id: number | null) => void;
  setTempName: (name: string) => void;
  setTempCategories: (value: number[] | ((prev: number[]) => number[])) => void;
  setSavingName: (saving: boolean) => void;
  setSuccessAnimation: (fn: (prev: Set<number>) => Set<number>) => void;
  tempName: string;
  tempCategories: number[];
}

export function useCodeActions(props: UseCodeActionsProps) {
  const {
    onUpdateName,
    onUpdateCategories,
    setEditingName,
    setEditingCategories,
    setTempName,
    setTempCategories,
    setSavingName,
    setSuccessAnimation,
    tempName,
    tempCategories,
  } = props;

  function startEditingName(code: CodeWithCategories) {
    setEditingName(code.id);
    setTempName(code.name);
  }

  async function saveName(codeId: number) {
    if (!tempName.trim()) return;
    if (tempName.trim().length > 100) return;

    setSavingName(true);
    try {
      await onUpdateName(codeId, tempName.trim());
      setEditingName(null);
      setTempName('');

      setSuccessAnimation(prev => new Set(prev).add(codeId));
      setTimeout(() => {
        setSuccessAnimation(prev => {
          const next = new Set(prev);
          next.delete(codeId);
          return next;
        });
      }, 1000);
    } finally {
      setSavingName(false);
    }
  }

  function cancelEditingName() {
    setEditingName(null);
    setTempName('');
  }

  function startEditingCategories(code: CodeWithCategories) {
    setEditingCategories(code.id);
    setTempCategories(code.category_ids || []);
  }

  function toggleCategory(categoryId: number) {
    setTempCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  function saveCategories(codeId: number) {
    onUpdateCategories(codeId, tempCategories);
    setEditingCategories(null);
    setTempCategories([]);

    setSuccessAnimation(prev => new Set(prev).add(codeId));
    setTimeout(() => {
      setSuccessAnimation(prev => {
        const next = new Set(prev);
        next.delete(codeId);
        return next;
      });
    }, 1000);
  }

  function cancelEditingCategories() {
    setEditingCategories(null);
    setTempCategories([]);
  }

  return {
    startEditingName,
    saveName,
    cancelEditingName,
    startEditingCategories,
    toggleCategory,
    saveCategories,
    cancelEditingCategories,
  };
}
