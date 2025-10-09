import clsx from 'clsx';
import type { FC } from 'react';
import { useState } from 'react';

interface SimpleOption {
  key: string;
  label: string;
}

interface SimpleDropdownProps {
  options: SimpleOption[];
  selectedValue: string;
  multiSelect?: boolean;
  selectedValues?: string[];
  onSelect: (value: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  searchPlaceholder?: string;
}

export const SimpleDropdown: FC<SimpleDropdownProps> = ({
  options,
  selectedValue,
  multiSelect = false,
  selectedValues = [],
  onSelect,
  onSelectAll,
  onClearAll,
  searchPlaceholder = 'Search...'
}) => {
  const [searchValue, setSearchValue] = useState('');

  // Filter options based on search
  const filteredOptions = searchValue
    ? options.filter(opt => opt.label.toLowerCase().includes(searchValue.toLowerCase()))
    : options;

  return (
    <div className="p-2">
      {/* Search */}
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="w-full text-sm mb-2 px-2 py-1.5 border border-gray-200 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Select All / Unselect All - for multi-select */}
      {multiSelect && onSelectAll && onClearAll && (
        <div className="flex justify-between mb-2 text-xs border-b border-gray-200 dark:border-neutral-700 pb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectAll();
            }}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Select all
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearAll();
            }}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
          >
            Unselect all
          </button>
        </div>
      )}

      {/* Options List */}
      <div className="max-h-60 overflow-auto space-y-0.5 text-sm">
        {filteredOptions.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
            {searchValue ? 'No options found' : 'No options available'}
          </div>
        ) : (
          filteredOptions.map((opt) => {
            const isActive = multiSelect
              ? selectedValues.includes(opt.key)
              : selectedValue === opt.key;

            return (
              <div
                key={opt.key}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(opt.key);
                }}
                className={clsx(
                  "flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                  isActive
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                    : "hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
                )}
              >
                <span className="flex-1">{opt.label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
