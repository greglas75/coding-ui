import type { FC } from 'react';
import { getStatusLabel, normalizeStatus } from '../../lib/statusNormalization';
import { FilterChip } from './chips/FilterChip';
import type { FiltersType } from './types';

interface ActiveFiltersDisplayProps {
  filters: FiltersType;
  onRemoveFilter: (key: keyof FiltersType, value?: string) => void;
  onClearAll?: () => void;
  languageNames?: Record<string, string>;
}

export const ActiveFiltersDisplay: FC<ActiveFiltersDisplayProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
  languageNames = {}
}) => {
  const activeFilters: Array<{
    key: keyof FiltersType;
    label: string;
    value: string;
    variant: 'status' | 'code' | 'language' | 'country' | 'length' | 'default';
    displayValue?: string;
  }> = [];

  // Search
  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: 'search',
      value: filters.search,
      variant: 'default'
    });
  }

  // Status
  if (filters.status && filters.status.length > 0) {
    filters.status.forEach(status => {
      const canonicalStatus = normalizeStatus(status);
      activeFilters.push({
        key: 'status',
        label: 'status',
        value: status,
        displayValue: getStatusLabel(canonicalStatus),
        variant: 'status'
      });
    });
  }

  // Codes
  if (filters.codes && filters.codes.length > 0) {
    filters.codes.forEach(code => {
      activeFilters.push({
        key: 'codes',
        label: 'code',
        value: code,
        variant: 'code'
      });
    });
  }

  // Language
  if (filters.language) {
    const displayValue = languageNames[filters.language]
      ? `${languageNames[filters.language]} (${filters.language})`
      : filters.language;

    activeFilters.push({
      key: 'language',
      label: 'language',
      value: filters.language,
      displayValue,
      variant: 'language'
    });
  }

  // Country
  if (filters.country) {
    activeFilters.push({
      key: 'country',
      label: 'country',
      value: filters.country,
      variant: 'country'
    });
  }

  // Length Filters
  if (filters.minLength && filters.minLength > 0) {
    activeFilters.push({
      key: 'minLength',
      label: 'min',
      value: `${filters.minLength} chars`,
      variant: 'length'
    });
  }

  if (filters.maxLength && filters.maxLength > 0) {
    activeFilters.push({
      key: 'maxLength',
      label: 'max',
      value: `${filters.maxLength} chars`,
      variant: 'length'
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeFilters.map((filter, idx) => (
        <FilterChip
          key={`${filter.key}-${filter.value}-${idx}`}
          label={filter.label}
          value={filter.displayValue || filter.value}
          variant={filter.variant}
          onRemove={() => onRemoveFilter(filter.key, filter.value)}
        />
      ))}
      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
        {activeFilters.length} active filter{activeFilters.length !== 1 ? 's' : ''}
      </span>
      {/* Clear All Filters Button */}
      {onClearAll && activeFilters.length > 0 && (
        <>
          <span className="text-gray-300 dark:text-gray-600 mx-1">•</span>
          <button
            onClick={onClearAll}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors font-medium"
            title="Clear all active filters"
          >
            Clear all filters
          </button>
        </>
      )}
    </div>
  );
};
