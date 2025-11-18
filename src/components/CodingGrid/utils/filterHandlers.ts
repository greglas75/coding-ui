import type { FilterGroup } from '../../../lib/filterEngine';
import type { FiltersState } from '../../../hooks/useFilters';

interface FilterHandlersProps {
  setFilter: <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => void;
  onFiltersChange?: (filters: any) => void;
}

/**
 * Handle filter changes and update URL
 */
export function createFilterChangeHandler({ setFilter, onFiltersChange }: FilterHandlersProps) {
  return <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
    setFilter(key, value);

    // Update URL without causing scroll jump
    if (key === 'status') {
      const url = new URL(window.location.href);
      if (Array.isArray(value) && value.length > 0) {
        // Store normalized canonical values in URL (comma-separated for multiple)
        url.searchParams.set('filter', value.join(','));
      } else {
        url.searchParams.delete('filter');
      }
      // Save scroll position before updating URL
      const scrollPosition = window.scrollY;
      window.history.replaceState({}, '', url);
      // Restore scroll position immediately
      window.scrollTo(0, scrollPosition);
    }
  };
}

/**
 * Apply filters to local answers
 */
export function createApplyFiltersHandler(
  filteredAnswers: any[],
  setLocalAnswers: (answers: any[]) => void,
  filters: any,
  onFiltersChange?: (filters: any) => void
) {
  return () => {
    setLocalAnswers(filteredAnswers);
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  };
}

/**
 * Reset all filters
 */
export function createResetFiltersHandler(
  resetFilters: () => void,
  onFiltersChange?: (filters: any) => void
) {
  return () => {
    resetFilters();
    if (onFiltersChange) {
      onFiltersChange({
        search: '',
        status: [],
        codes: [],
        language: '',
        country: '',
        minLength: 0,
        maxLength: 0,
      });
    }
  };
}

