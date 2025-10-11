import { CheckSquare, Sparkles, Square } from 'lucide-react';
import type { FC } from 'react';
import type { Answer } from '../../../types';

interface TableHeaderProps {
  cellPad: string;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSort: (field: keyof Answer) => void;
  sortField: keyof Answer | null;
  sortOrder: 'asc' | 'desc';
  onBulkAICategorize: () => void;
  isBulkCategorizing: boolean;
  visibleCount: number;
}

export const TableHeader: FC<TableHeaderProps> = ({
  cellPad,
  isAllSelected,
  onSelectAll,
  onClearAll,
  onSort,
  sortField,
  sortOrder,
  onBulkAICategorize,
  isBulkCategorizing,
  visibleCount
}) => {
  const getSortIcon = (field: keyof Answer) => {
    if (sortField === field) {
      return <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
    }
    return null;
  };

  return (
    <thead className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b">
      <tr className="border-b border-zinc-200 dark:border-zinc-700">
        <th className={`text-center ${cellPad} w-[40px] text-xs font-medium uppercase tracking-wide text-zinc-500`}>
          <div className="flex items-center justify-center">
            {isAllSelected ? (
              <div onClick={onClearAll} title="Clear selection">
                <CheckSquare size={18} className="text-blue-600 dark:text-blue-400 cursor-pointer" />
              </div>
            ) : (
              <div onClick={onSelectAll} title="Select all">
                <Square size={18} className="text-gray-400 dark:text-gray-500 cursor-pointer" />
              </div>
            )}
          </div>
        </th>


        <th
          onClick={() => onSort('created_at')}
          className={`text-left ${cellPad} w-[120px] text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
          title="Sort by date"
        >
          Date {getSortIcon('created_at')}
        </th>

        <th
          onClick={() => onSort('language')}
          className={`text-center ${cellPad} w-[64px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden sm:table-cell cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
          title="Sort by language"
        >
          Lang {getSortIcon('language')}
        </th>

        <th
          onClick={() => onSort('answer_text')}
          className={`text-left ${cellPad} w-auto text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
          title="Sort by answer text"
        >
          Answer {getSortIcon('answer_text')}
        </th>

        <th
          onClick={() => onSort('translation_en')}
          className={`text-left ${cellPad} w-[260px] xl:w-[320px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden md:table-cell cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
          title="Sort by translation"
        >
          Translation {getSortIcon('translation_en')}
        </th>

        <th className={`text-left ${cellPad} w-[220px] xl:w-[260px] text-xs font-medium uppercase tracking-wide text-zinc-500`}>
          Quick Status
        </th>

        <th
          onClick={() => onSort('general_status')}
          className={`text-left ${cellPad} w-[150px] text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
          title="Sort by status"
        >
          Status {getSortIcon('general_status')}
        </th>

        {/* AI Button Column */}
        <th className={`text-center ${cellPad} w-[60px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden md:table-cell`}>
          AI
        </th>

        <th className={`text-left ${cellPad} w-[240px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden md:table-cell`}>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span>AI Suggestions</span>
              <button
                onClick={onBulkAICategorize}
                disabled={isBulkCategorizing || visibleCount === 0}
                className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={`AI categorize all ${visibleCount} visible answers`}
              >
                {isBulkCategorizing ? (
                  <span className="h-4 w-4 animate-spin">⏳</span>
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </th>

        <th
          onClick={() => onSort('selected_code')}
          className={`text-left ${cellPad} w-[220px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden md:table-cell cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
          title="Sort by code"
        >
          Code {getSortIcon('selected_code')}
        </th>

        <th
          onClick={() => onSort('country')}
          className={`text-left ${cellPad} w-[140px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden lg:table-cell cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
          title="Sort by country"
        >
          Country {getSortIcon('country')}
        </th>
      </tr>
    </thead>
  );
};
