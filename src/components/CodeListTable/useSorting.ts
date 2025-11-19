/**
 * Sorting Hook
 * Shared sorting logic for code list
 */

import type { CodeWithCategories } from '../../types';

interface UseSortingProps {
  codes: CodeWithCategories[];
  sortField: keyof CodeWithCategories | null;
  sortOrder: 'asc' | 'desc';
  setSortField: (field: keyof CodeWithCategories | null) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
}

export function useSorting(props: UseSortingProps) {
  const { codes, sortField, sortOrder, setSortField, setSortOrder } = props;

  function handleSort(field: keyof CodeWithCategories) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }

  const sortedCodes = [...codes].sort((a, b) => {
    if (!sortField) return 0;

    const aVal = a[sortField];
    const bVal = b[sortField];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      return sortOrder === 'asc'
        ? aVal === bVal
          ? 0
          : aVal
            ? -1
            : 1
        : aVal === bVal
          ? 0
          : aVal
            ? 1
            : -1;
    }

    return 0;
  });

  return {
    handleSort,
    sortedCodes,
  };
}
