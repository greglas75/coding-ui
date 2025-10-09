import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import type { FC, ReactNode } from 'react';

interface DropdownBaseProps {
  label: string;
  displayText: string;
  isOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
  headerAction?: ReactNode;
  width?: string;
}

export const DropdownBase: FC<DropdownBaseProps> = ({
  label,
  displayText,
  isOpen,
  onToggle,
  disabled = false,
  loading = false,
  children,
  headerAction,
  width = 'w-full'
}) => {
  return (
    <div className="relative filter-dropdown">
      {/* Label with optional action */}
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {headerAction}
      </div>

      {/* Dropdown Button */}
      <button
        onClick={onToggle}
        disabled={disabled || loading}
        className={clsx(
          "w-full flex items-center justify-between h-9 px-2 border rounded-md text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            : "border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300"
        )}
      >
        <span className="truncate flex items-center gap-2">
          {loading && <span className="animate-spin">⏳</span>}
          {displayText}
        </span>
        <ChevronDown
          size={14}
          className={clsx(
            "ml-2 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className={clsx(
          "absolute z-50 mt-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-md shadow-lg",
          width
        )}>
          {children}
        </div>
      )}
    </div>
  );
};
