import type { FC } from 'react';

interface ResultsCounterProps {
  showing: number;
  total: number;
  filtered: number;
  sortField: string | null;
  sortOrder: 'asc' | 'desc';
  onShowShortcuts: () => void;
}

export const ResultsCounter: FC<ResultsCounterProps> = ({
  showing,
  total,
  filtered,
  sortField,
  sortOrder,
  onShowShortcuts
}) => {
  return (
    <div className="flex items-center justify-between w-full px-4 py-2">
      {/* Left side: Counter and sort info */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {showing} of {total} answers
          {showing !== filtered && (
            <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
              ({filtered} filtered)
            </span>
          )}
        </span>
        {sortField && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Sorted by: <span className="font-medium text-gray-700 dark:text-gray-300">{sortField}</span> <span className="text-blue-600 dark:text-blue-400">{sortOrder === 'asc' ? '▲' : '▼'}</span>
          </div>
        )}
      </div>

      {/* Right side: Shortcuts button */}
      <button
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        onClick={onShowShortcuts}
        title="Show keyboard shortcuts"
      >
        <span>?</span>
        <span>Shortcuts</span>
      </button>
    </div>
  );
};
