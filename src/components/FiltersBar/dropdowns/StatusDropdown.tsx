import { Check } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';

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
  onApply?: (values: string[]) => void;
  onClose?: () => void;
}

export const StatusDropdown: FC<StatusDropdownProps> = ({
  options,
  selectedValues,
  onToggle: _onToggle,
  onSelectAll: _onSelectAll,
  onClearAll: _onClearAll,
  onApply,
  onClose
}) => {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedValues);

  useEffect(() => {
    setTempSelected(selectedValues);
  }, [selectedValues]);

  const handleToggle = (value: string) => {
    setTempSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSelectAll = () => {
    setTempSelected(options.map(o => o.key));
  };

  const handleClearAll = () => {
    setTempSelected([]);
  };

  const handleApply = () => {
    if (onApply) onApply(tempSelected);
    if (onClose) onClose();
  };

  const handleCancel = () => {
    setTempSelected(selectedValues);
    if (onClose) onClose();
  };

  const hasChanges = JSON.stringify(tempSelected.sort()) !== JSON.stringify(selectedValues.sort());

  return (
    <div className="relative flex flex-col max-h-[400px]">
      {/* Header with actions */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSelectAll();
          }}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Select all
        </button>
        {tempSelected.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearAll();
            }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:underline"
            title="Clear selection"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Status list - scrollable if needed */}
      <div className="flex-1 overflow-y-auto py-1">
        {options.map((opt) => {
          const isActive = tempSelected.includes(opt.key);

          return (
            <div
              key={opt.key}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(opt.key);
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => {}}
                readOnly
                className="h-3.5 w-3.5 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-2 focus:ring-blue-500 pointer-events-none"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
            </div>
          );
        })}
      </div>

      {/* Footer with Apply/Cancel buttons */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-neutral-700 flex items-center justify-between gap-2 bg-gray-50 dark:bg-neutral-800">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCancel();
          }}
          className="flex-1 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleApply();
          }}
          disabled={!hasChanges}
          className="flex-1 px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
        >
          <Check size={12} />
          Apply {tempSelected.length > 0 && `(${tempSelected.length})`}
        </button>
      </div>
    </div>
  );
};
