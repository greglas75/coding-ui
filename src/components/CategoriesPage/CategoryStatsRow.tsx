import { Code2, Settings, Trash2 } from 'lucide-react';
import type { FC } from 'react';

interface CategoryWithStats {
  id: number;
  name: string;
  codes_count: number;
  whitelisted: number;
  blacklisted: number;
  gibberish: number;
  categorized: number;
  notCategorized: number;
  allAnswers: number;
}

interface CategoryStatsRowProps {
  category: CategoryWithStats;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onOpenCoding: () => void;
  onDelete: () => void;
  onFilterClick: (filterType: string) => void;
  onCodesClick: () => void;
  onAllAnswersClick: () => void;
}

export const CategoryStatsRow: FC<CategoryStatsRowProps> = ({
  category,
  isActive,
  onSelect,
  onEdit,
  onOpenCoding,
  onDelete,
  onFilterClick,
  onCodesClick,
  onAllAnswersClick
}) => {
  return (
    <div
      className={`grid grid-cols-12 items-center px-4 py-3 text-sm border-b border-gray-100 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors ${
        isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      {/* Name */}
      <div
        className="col-span-2 font-medium text-gray-800 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
        onClick={onSelect}
      >
        {category.name}
      </div>

      {/* Codes */}
      <div
        onClick={onCodesClick}
        className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
        title="Click to view all answers with codes (no status filter)"
      >
        {category.codes_count}
      </div>

      {/* All Answers */}
      <div
        onClick={onAllAnswersClick}
        className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline font-medium"
        title="Click to view ALL answers in this category (no filters)"
      >
        {category.allAnswers}
      </div>

      {/* Whitelisted */}
      <div
        onClick={() => onFilterClick('whitelisted')}
        className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
      >
        {category.whitelisted}
      </div>

      {/* Blacklisted */}
      <div
        onClick={() => onFilterClick('blacklisted')}
        className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
      >
        {category.blacklisted}
      </div>

      {/* Gibberish */}
      <div
        onClick={() => onFilterClick('gibberish')}
        className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
      >
        {category.gibberish}
      </div>

      {/* Categorized */}
      <div
        onClick={() => onFilterClick('categorized')}
        className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
      >
        {category.categorized}
      </div>

      {/* Not Categorized */}
      <div
        onClick={() => onFilterClick('notCategorized')}
        className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
      >
        {category.notCategorized}
      </div>

      {/* Actions */}
      <div className="col-span-2 flex justify-center gap-4">
        <button
          title="Edit category settings"
          onClick={onEdit}
          className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 transition-colors p-1"
        >
          <Settings size={20} />
        </button>
        <button
          title="Open coding view"
          onClick={onOpenCoding}
          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1"
        >
          <Code2 size={20} />
        </button>
        {category.codes_count > 0 ? (
          <button
            disabled
            className="text-gray-400 cursor-not-allowed ml-2 p-1"
            title="Cannot delete category with associated codes"
          >
            <Trash2 size={20} />
          </button>
        ) : (
          <button
            title="Delete category"
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors ml-2 p-1"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
    </div>
  );
};
