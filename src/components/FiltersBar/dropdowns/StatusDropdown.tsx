import { X } from 'lucide-react';
import type { FC } from 'react';

interface StatusOption {
  key: string;
  label: string;
}

interface StatusDropdownProps {
  options: StatusOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const StatusDropdown: FC<StatusDropdownProps> = ({
  options,
  selectedValues,
  onToggle,
  onSelectAll,
  onClearAll
}) => {
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

      {/* Select all */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-neutral-700">
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

      {/* Status list - NO SCROLL, NO SEARCH, with checkboxes */}
      <div className="py-1">
        {options.map((opt) => {
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
    </div>
  );
};
