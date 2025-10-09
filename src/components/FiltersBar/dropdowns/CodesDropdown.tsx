import { RefreshCw, X } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import { FixedSizeList as List } from 'react-window';

interface CodeOption {
  key: string;
  label: string;
}

interface CodesDropdownProps {
  options: CodeOption[];
  selectedValues: string[];
  loading: boolean;
  hasMore: boolean;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const CodesDropdown: FC<CodesDropdownProps> = ({
  options,
  selectedValues,
  loading,
  hasMore,
  onToggle,
  onSelectAll,
  onClearAll
}) => {
  const [searchValue, setSearchValue] = useState('');

  // Filter options based on search
  const filteredOptions = searchValue
    ? options.filter(opt => opt.label.toLowerCase().includes(searchValue.toLowerCase()))
    : options;

  const useVirtualScroll = filteredOptions.length > 100;

  return (
    <div className="relative">
      {/* Clear button - top right */}
      {selectedValues.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClearAll();
          }}
          className="absolute top-2 right-2 p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded z-10"
          title="Clear selection"
        >
          <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
        </button>
      )}

      {/* Search field */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-neutral-700">
        <input
          type="text"
          placeholder="Search codes..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full text-xs px-2 py-1 border border-gray-200 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Select all */}
      <div className="px-3 py-1 border-b border-gray-200 dark:border-neutral-700">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectAll();
          }}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Select all
        </button>
      </div>

      {/* Codes list */}
      <div className="py-1">
        {loading ? (
          <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin" />
            Loading codes...
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
            {searchValue ? 'No codes found' : 'No codes available'}
          </div>
        ) : useVirtualScroll ? (
          // Virtual scrolling for large lists
          <List
            height={300}
            itemCount={filteredOptions.length}
            itemSize={40}
            width="100%"
            className="scrollbar-thin"
          >
            {({ index, style }: { index: number; style: React.CSSProperties }) => {
              const opt = filteredOptions[index];
              const isActive = selectedValues.includes(opt.key);

              return (
                <label
                  style={style}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggle(opt.key);
                    }}
                    className="h-3.5 w-3.5 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                </label>
              );
            }}
          </List>
        ) : (
          // Regular list for small datasets
          <div className="max-h-[300px] overflow-y-auto">
            {filteredOptions.map((opt) => {
              const isActive = selectedValues.includes(opt.key);

              return (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggle(opt.key);
                    }}
                    className="h-3.5 w-3.5 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                </label>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading more...' : 'Scroll to load more'}
          </div>
        )}
      </div>
    </div>
  );
};
