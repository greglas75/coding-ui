import { useCallback, useEffect, useState } from 'react';
import { simpleLogger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface FiltersState {
  search: string;
  status: string[];
  codes: string[];
  language: string;
  country: string;
  minLength: number;
  maxLength: number;
}

export interface UseFiltersProps {
  initialValues?: Partial<FiltersState>;
  onChange?: (filters: FiltersState) => void;
  debounceMs?: number;
}

// ═══════════════════════════════════════════════════════════════
// 🪝 HOOK: useFilters
// ═══════════════════════════════════════════════════════════════

/**
 * Custom hook for managing filter state in dashboards
 *
 * @param initialValues - Initial filter values (optional)
 * @param onChange - Callback fired when filters change (debounced for search)
 * @param debounceMs - Debounce delay for search input (default: 300ms)
 *
 * @example
 * ```tsx
 * const { filters, setFilter, resetFilters, applyFilters } = useFilters({
 *   initialValues: { search: '', types: [] },
 *   onChange: (filters) => simpleLogger.info('Filters changed:', filters),
 *   debounceMs: 500
 * });
 *
 * // Update a single filter
 * setFilter('search', 'Nike');
 * setFilter('types', ['whitelist', 'blacklist']);
 *
 * // Reset all filters
 * resetFilters();
 *
 * // Manually trigger onChange with current state
 * applyFilters();
 * ```
 */
export function useFilters({
  initialValues = {},
  onChange,
  debounceMs = 300,
}: UseFiltersProps = {}) {
  // ───────────────────────────────────────────────────────────
  // State Management
  // ───────────────────────────────────────────────────────────

  const defaultFilters: FiltersState = {
    search: '',
    status: [],
    codes: [],
    language: '',
    country: '',
    minLength: 0,
    maxLength: 0,
  };

  const [filters, setFilters] = useState<FiltersState>({
    ...defaultFilters,
    ...initialValues,
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [debouncedMinLength, setDebouncedMinLength] = useState(filters.minLength);
  const [debouncedMaxLength, setDebouncedMaxLength] = useState(filters.maxLength);

  // ───────────────────────────────────────────────────────────
  // Debounce Search Input
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [filters.search, debounceMs]);

  // ───────────────────────────────────────────────────────────
  // Debounce Number Inputs (minLength, maxLength)
  // Prevents excessive filtering while typing "1000" (4 keystokes → 1 filter operation)
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedMinLength(filters.minLength);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [filters.minLength, debounceMs]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedMaxLength(filters.maxLength);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [filters.maxLength, debounceMs]);

  // ───────────────────────────────────────────────────────────
  // Emit onChange when filters update
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (onChange) {
      // Emit with debounced values
      const updatedFilters = {
        ...filters,
        search: debouncedSearch,
        minLength: debouncedMinLength,
        maxLength: debouncedMaxLength,
      };
      onChange(updatedFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    debouncedMinLength,
    debouncedMaxLength,
    filters.status,
    filters.codes,
    filters.language,
    filters.country,
    // Removed onChange and raw minLength/maxLength from deps to prevent infinite loop
  ]);

  // ───────────────────────────────────────────────────────────
  // Helper Functions
  // ───────────────────────────────────────────────────────────

  /**
   * Update a single filter value
   * @param key - The filter key to update
   * @param value - The new value
   */
  const setFilter = useCallback(
    <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  /**
   * Update multiple filters at once
   * @param updates - Partial filter state to merge
   */
  const setFilters_bulk = useCallback((updates: Partial<FiltersState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Reset all filters to default values (or initialValues)
   */
  const resetFilters = useCallback(() => {
    setFilters({
      ...defaultFilters,
      ...initialValues,
    });
    setDebouncedSearch(initialValues?.search ?? '');
  }, [initialValues]);

  /**
   * Manually trigger onChange callback with current filter state
   * Useful for "Apply Filters" button when onChange is not auto-triggered
   */
  const applyFilters = useCallback(() => {
    if (onChange) {
      onChange({
        ...filters,
        search: debouncedSearch,
      });
    }
  }, [filters, debouncedSearch, onChange]);

  /**
   * Check if any filter is active (non-default)
   */
  const hasActiveFilters = useCallback(() => {
    return (
      filters.search !== '' ||
      filters.status.length > 0 ||
      filters.codes.length > 0 ||
      filters.language !== '' ||
      filters.country !== '' ||
      filters.minLength > 0 ||
      filters.maxLength > 0
    );
  }, [filters]);

  /**
   * Get count of active filters
   */
  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status.length > 0) count++;
    if (filters.codes.length > 0) count++;
    if (filters.language) count++;
    if (filters.country) count++;
    if (filters.minLength > 0) count++;
    if (filters.maxLength > 0) count++;
    return count;
  }, [filters]);

  // ───────────────────────────────────────────────────────────
  // Return API
  // ───────────────────────────────────────────────────────────

  return {
    /** Current filter state (with debounced values) */
    filters: {
      ...filters,
      search: debouncedSearch,
      minLength: debouncedMinLength,
      maxLength: debouncedMaxLength,
    },
    /** Raw filter state (without debounced values) */
    rawFilters: filters,
    /** Update a single filter */
    setFilter,
    /** Update multiple filters at once */
    setFilters: setFilters_bulk,
    /** Reset all filters to initial/default values */
    resetFilters,
    /** Manually trigger onChange with current state */
    applyFilters,
    /** Check if any filter is active */
    hasActiveFilters,
    /** Get count of active filters */
    activeFiltersCount: getActiveFiltersCount(),
    /** Raw search value (not debounced) for controlled inputs */
    rawSearch: filters.search,
    /** Debounced search value */
    debouncedSearch,
  };
}

// ═══════════════════════════════════════════════════════════════
// 📚 USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════

/**
 * Example 1: Basic usage with onChange callback
 *
 * ```tsx
 * function CodingView() {
 *   const { filters, setFilter, resetFilters } = useFilters({
 *     onChange: (filters) => {
 *       simpleLogger.info('Filters changed:', filters);
 *       // Fetch data with new filters
 *       fetchData(filters);
 *     }
 *   });
 *
 *   return (
 *     <div>
 *       <input
 *         value={filters.search}
 *         onChange={(e) => setFilter('search', e.target.value)}
 *       />
 *       <button onClick={resetFilters}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Example 2: Manual apply (no auto-trigger)
 *
 * ```tsx
 * function DashboardView() {
 *   const { rawFilters, setFilter, applyFilters, resetFilters } = useFilters({
 *     // No onChange prop = manual mode
 *   });
 *
 *   const handleApply = () => {
 *     fetchData(rawFilters);
 *     applyFilters(); // Optional: trigger onChange if provided later
 *   };
 *
 *   return (
 *     <FiltersBar
 *       filters={rawFilters}
 *       onFilterChange={setFilter}
 *       onApply={handleApply}
 *       onReset={resetFilters}
 *     />
 *   );
 * }
 * ```
 */

/**
 * Example 3: With initial values
 *
 * ```tsx
 * function AnalyticsView() {
 *   const { filters, setFilter } = useFilters({
 *     initialValues: {
 *       types: ['whitelist'],
 *       language: 'EN',
 *     },
 *     onChange: (filters) => loadAnalytics(filters),
 *   });
 *
 *   // filters.types will start as ['whitelist']
 *   // filters.language will start as 'EN'
 * }
 * ```
 */

/**
 * Example 4: Conditional rendering based on active filters
 *
 * ```tsx
 * function SearchView() {
 *   const {
 *     filters,
 *     setFilter,
 *     resetFilters,
 *     hasActiveFilters,
 *     activeFiltersCount
 *   } = useFilters({
 *     onChange: (filters) => search(filters)
 *   });
 *
 *   return (
 *     <div>
 *       <FiltersBar />
 *       {hasActiveFilters() && (
 *         <div className="flex items-center gap-2">
 *           <span>{activeFiltersCount} active filters</span>
 *           <button onClick={resetFilters}>Clear all</button>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
