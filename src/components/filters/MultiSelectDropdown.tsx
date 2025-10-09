import clsx from 'clsx';
import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  enableSelectAll?: boolean;
  disabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 🧩 COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  enableSelectAll = true,
  disabled = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // ✅ Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  // ✅ Keyboard navigation (Esc to close)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // ✅ Filter options based on search query
  const filteredOptions = query.trim()
    ? options.filter((opt) =>
        opt.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // ✅ Toggle single option
  function toggleOption(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  // ✅ Select all visible options
  function selectAll() {
    const allVisible = filteredOptions.filter((opt) => !selected.includes(opt));
    onChange([...selected, ...allVisible]);
  }

  // ✅ Unselect all visible options
  function unselectAll() {
    onChange(selected.filter((v) => !filteredOptions.includes(v)));
  }

  // ✅ Clear all selections
  function clearAll() {
    onChange([]);
  }

  // ✅ Display text for selected items
  function getDisplayText() {
    if (selected.length === 0) return placeholder;
    if (selected.length === options.length) return 'All selected';
    if (selected.length === 1) return selected[0];
    return `${selected.length} selected`;
  }

  return (
    <div className="w-full" ref={dropdownRef}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'relative w-full flex items-center justify-between px-3 py-2 text-sm text-left',
          'bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md',
          'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none',
          'transition-colors',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer'
        )}
      >
        <span
          className={clsx(
            'truncate flex-1',
            selected.length === 0
              ? 'text-gray-500 dark:text-gray-400'
              : 'text-gray-700 dark:text-gray-200'
          )}
        >
          {getDisplayText()}
        </span>

        <div className="flex items-center gap-1">
          {selected.length > 0 && !disabled && (
            <X
              size={14}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
            />
          )}
          <ChevronDown
            size={16}
            className={clsx(
              'text-gray-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={clsx(
            'absolute z-50 mt-1 w-full bg-white dark:bg-neutral-900',
            'border border-gray-200 dark:border-neutral-700 rounded-md shadow-lg',
            'max-h-72 overflow-hidden flex flex-col'
          )}
          style={{ minWidth: dropdownRef.current?.offsetWidth }}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-neutral-700">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={clsx(
                    'w-full pl-8 pr-3 py-1.5 text-sm',
                    'bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md',
                    'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none',
                    'text-gray-700 dark:text-gray-200'
                  )}
                />
              </div>
            </div>
          )}

          {/* Select All / Unselect All */}
          {enableSelectAll && (
            <div className="flex justify-between items-center px-3 py-2 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                title="Select all visible options"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={unselectAll}
                className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                title="Unselect all visible options"
              >
                Unselect All
              </button>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto max-h-60 p-2">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option);

                return (
                  <label
                    key={option}
                    className={clsx(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
                      'text-sm transition-colors',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300'
                    )}
                    onClick={() => toggleOption(option)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOption(option)}
                      onClick={(e) => e.stopPropagation()}
                      className={clsx(
                        'w-4 h-4 rounded border-gray-300 dark:border-neutral-600',
                        'text-blue-600 focus:ring-2 focus:ring-blue-500',
                        'cursor-pointer'
                      )}
                    />
                    <span className="flex-1 truncate">{option}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer with count */}
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selected.length} of {options.length} selected
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
