/**
 * Code List Table State Hook
 * Shared state logic for desktop and mobile views
 */

import { useState } from 'react';
import type { CodeWithCategories } from '../../types';

export interface CodeListState {
  editingName: number | null;
  editingCategories: number | null;
  tempName: string;
  tempCategories: number[];
  savingName: boolean;
  successAnimation: Set<number>;
  sortField: keyof CodeWithCategories | null;
  sortOrder: 'asc' | 'desc';
}

export function useCodeListState() {
  const [editingName, setEditingName] = useState<number | null>(null);
  const [editingCategories, setEditingCategories] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempCategories, setTempCategories] = useState<number[]>([]);
  const [savingName, setSavingName] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<keyof CodeWithCategories | null>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  return {
    editingName,
    setEditingName,
    editingCategories,
    setEditingCategories,
    tempName,
    setTempName,
    tempCategories,
    setTempCategories,
    savingName,
    setSavingName,
    successAnimation,
    setSuccessAnimation,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
  };
}
