import { RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { FiltersType } from './types';

// Dropdowns
import { CodesDropdown } from './dropdowns/CodesDropdown';
import { DropdownBase } from './dropdowns/DropdownBase';
import { SimpleDropdown } from './dropdowns/SimpleDropdown';
import { StatusDropdown } from './dropdowns/StatusDropdown';

// Components
import { ActionButtons } from './ActionButtons';
import { ActiveFiltersDisplay } from './ActiveFiltersDisplay';

// Hooks
import { useClickOutside } from './hooks/useClickOutside';

// Utils
import { countryNames, languageNames, mergeStatusOptions } from './utils/filterHelpers';

interface FiltersBarProps {
  filters: FiltersType;
  updateFilter: <K extends keyof FiltersType>(key: K, value: FiltersType[K]) => void;
  typesList: Array<{ key: string; label: string; count?: number }>;
  codesList: string[];
  statusesList: string[];
  languagesList: string[];
  countriesList: string[];
  onApply: () => void;
  onReset: () => void;
  onReload?: () => void;
  isApplying?: boolean;
  isReloading?: boolean;
  loadingCodes?: boolean;
  onReloadCodes?: () => void;
  onLoadMoreCodes?: () => void;
  hasMoreCodes?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export function FiltersBar({
  filters,
  updateFilter,
  typesList,
  codesList,
  statusesList,
  languagesList,
  countriesList,
  onApply,
  onReset,
  onReload,
  isApplying = false,
  isReloading = false,
  loadingCodes = false,
  onReloadCodes,
  hasMoreCodes = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  searchTerm = '',
  onSearchChange,
}: FiltersBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const codesRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);

  useClickOutside(statusRef, () => setOpenDropdown(null), openDropdown === 'status');
  useClickOutside(codesRef, () => setOpenDropdown(null), openDropdown === 'codes');
  useClickOutside(languageRef, () => setOpenDropdown(null), openDropdown === 'language');
  useClickOutside(countryRef, () => setOpenDropdown(null), openDropdown === 'country');

  const toggleDropdown = useCallback((name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  }, []);

  const statusOptions = mergeStatusOptions(statusesList, typesList);
  const codesOptions = codesList.map((code) => ({ key: code, label: code }));
  const languageOptions = languagesList.map((lang) => ({
    key: lang,
    label: languageNames[lang] ? `${languageNames[lang]} (${lang})` : lang,
  }));
  const countryOptions = countriesList.map((country) => ({
    key: country,
    label: countryNames[country] ? `${countryNames[country]} (${country})` : country,
  }));

  const handleStatusToggle = useCallback(
    (value: string) => {
      const newStatus = filters.status.includes(value)
        ? filters.status.filter((s) => s !== value)
        : [...filters.status, value];
      updateFilter('status', newStatus);
    },
    [filters.status, updateFilter]
  );

  const handleStatusSelectAll = useCallback(() => {
    updateFilter('status', statusOptions.map((o) => o.key));
  }, [statusOptions, updateFilter]);

  const handleStatusClearAll = useCallback(() => {
    updateFilter('status', []);
  }, [updateFilter]);

  const handleStatusApply = useCallback((values: string[]) => {
    updateFilter('status', values);
    setOpenDropdown(null);
  }, [updateFilter]);

  const handleStatusClose = useCallback(() => {
    setOpenDropdown(null);
  }, []);

  const handleCodeToggle = useCallback(
    (value: string) => {
      const newCodes = filters.codes.includes(value)
        ? filters.codes.filter((c) => c !== value)
        : [...filters.codes, value];
      updateFilter('codes', newCodes);
    },
    [filters.codes, updateFilter]
  );

  const handleCodesSelectAll = useCallback(() => {
    updateFilter('codes', codesList);
  }, [codesList, updateFilter]);

  const handleCodesClearAll = useCallback(() => {
    updateFilter('codes', []);
  }, [updateFilter]);

  const handleLanguageSelect = useCallback(
    (value: string) => {
      updateFilter('language', filters.language === value ? '' : value);
    },
    [filters.language, updateFilter]
  );

  const handleCountrySelect = useCallback(
    (value: string) => {
      updateFilter('country', filters.country === value ? '' : value);
    },
    [filters.country, updateFilter]
  );

  const handleRemoveFilter = useCallback(
    (key: keyof FiltersType, value?: string) => {
      if (value !== undefined) {
        if (key === 'status') {
          updateFilter('status', filters.status.filter((s) => s !== value));
        } else if (key === 'codes') {
          updateFilter('codes', filters.codes.filter((c) => c !== value));
        }
      } else {
        if (key === 'minLength' || key === 'maxLength') {
          updateFilter(key, 0);
        } else {
          updateFilter(key, '');
        }
      }
    },
    [filters, updateFilter]
  );

  const statusDisplayText =
    filters.status.length === 0 ? 'All Status' : `${filters.status.length} selected`;
  const codesDisplayText =
    filters.codes.length === 0 ? 'All Codes' : `${filters.codes.length} selected`;
  const languageDisplayText = filters.language
    ? languageNames[filters.language]
      ? `${languageNames[filters.language]} (${filters.language})`
      : filters.language
    : 'All Languages';
  const countryDisplayText = filters.country
    ? countryNames[filters.country]
      ? `${countryNames[filters.country]} (${filters.country})`
      : filters.country
    : 'All Countries';

  return (
    <div className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 px-4 py-3">

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div ref={statusRef}>
          <DropdownBase
            label="Status"
            displayText={statusDisplayText}
            isOpen={openDropdown === 'status'}
            onToggle={() => toggleDropdown('status')}
            width="w-80"
          >
            <StatusDropdown
              options={statusOptions}
              selectedValues={filters.status}
              onToggle={handleStatusToggle}
              onSelectAll={handleStatusSelectAll}
              onClearAll={handleStatusClearAll}
              onApply={handleStatusApply}
              onClose={handleStatusClose}
            />
          </DropdownBase>
        </div>

        <div ref={codesRef}>
          <DropdownBase
            label="Codes"
            displayText={codesDisplayText}
            isOpen={openDropdown === 'codes'}
            onToggle={() => toggleDropdown('codes')}
            loading={loadingCodes}
            width="w-80"
            headerAction={
              onReloadCodes && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReloadCodes();
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                  title="Reload codes"
                >
                  <RefreshCw size={12} className={loadingCodes ? 'animate-spin' : ''} />
                  Reload
                </button>
              )
            }
          >
            <CodesDropdown
              options={codesOptions}
              selectedValues={filters.codes}
              loading={loadingCodes}
              hasMore={hasMoreCodes}
              onToggle={handleCodeToggle}
              onSelectAll={handleCodesSelectAll}
              onClearAll={handleCodesClearAll}
            />
          </DropdownBase>
        </div>

        <div ref={languageRef}>
          <DropdownBase
            label="Language"
            displayText={languageDisplayText}
            isOpen={openDropdown === 'language'}
            onToggle={() => toggleDropdown('language')}
            width="w-64"
          >
            <SimpleDropdown
              options={languageOptions}
              selectedValue={filters.language}
              onSelect={handleLanguageSelect}
              searchPlaceholder="Search languages..."
            />
          </DropdownBase>
        </div>

        <div ref={countryRef}>
          <DropdownBase
            label="Country"
            displayText={countryDisplayText}
            isOpen={openDropdown === 'country'}
            onToggle={() => toggleDropdown('country')}
            width="w-64"
          >
            <SimpleDropdown
              options={countryOptions}
              selectedValue={filters.country}
              onSelect={handleCountrySelect}
              searchPlaceholder="Search countries..."
            />
          </DropdownBase>
        </div>

        <div className="flex flex-col" style={{ width: '70px' }}>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 whitespace-nowrap">
            Min
          </label>
          <input
            type="number"
            min="0"
            value={filters.minLength || ''}
            onChange={(e) => updateFilter('minLength', parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full h-9 px-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-col" style={{ width: '70px' }}>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 whitespace-nowrap">
            Max
          </label>
          <input
            type="number"
            min="0"
            value={filters.maxLength || ''}
            onChange={(e) => updateFilter('maxLength', parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full h-9 px-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Vertical divider */}
        <div className="h-9 w-px bg-gray-300 dark:bg-neutral-600 self-end mb-0"></div>

        {/* Action buttons inline */}
        <div className="flex items-end gap-1 pb-0">
          <ActionButtons
            onApply={onApply}
            onReload={onReload}
            isApplying={isApplying}
            isReloading={isReloading}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>

        {/* Search input on the right */}
        <div className="flex-1 flex justify-end items-end">
          <div className="relative" style={{ width: '300px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search in answers & translations..."
              className="w-full h-9 pl-9 pr-8 text-sm border border-gray-200 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange?.('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-200 dark:border-neutral-800">
        <ActiveFiltersDisplay
          filters={filters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={onReset}
          languageNames={languageNames}
        />
      </div>
    </div>
  );
}
