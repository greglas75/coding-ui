/**
 * Hook for category filtering and search
 */

import { useState, useMemo } from 'react';
import type { CategoryWithStats } from '../types';

export function useCategoryFilters(categories: CategoryWithStats[]) {
  const [searchText, setSearchText] = useState('');

  const filteredCategories = useMemo(
    () =>
      categories.filter(category =>
        category.name.toLowerCase().includes(searchText.toLowerCase())
      ),
    [categories, searchText]
  );

  return {
    searchText,
    setSearchText,
    filteredCategories,
  };
}

