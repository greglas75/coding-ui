/**
 * Categories Table Component
 */

import { Code2, Settings, Trash2 } from 'lucide-react';
import type { CategoryWithStats } from '../types';
import { navigateToCoding, navigateToCodingWithFilter } from '../utils/categoryHelpers';

interface CategoriesTableProps {
  categories: CategoryWithStats[];
  activeCategory: CategoryWithStats | null;
  onSelectCategory: (category: CategoryWithStats) => void;
  onEditCategory: (category: CategoryWithStats) => void;
  onDeleteCategory: (categoryId: number) => void;
}

export function CategoriesTable({
  categories,
  activeCategory,
  onSelectCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoriesTableProps) {
  return (
    <div className="border border-gray-200 dark:border-neutral-700 rounded-md overflow-hidden bg-white dark:bg-neutral-900">
      {/* Table Header */}
      <div className="grid grid-cols-12 bg-gray-100 dark:bg-neutral-800 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase px-4 py-3 border-b border-gray-200 dark:border-neutral-700">
        <div className="col-span-2">Name</div>
        <div className="text-center">All Answers</div>
        <div className="text-center">Whitelisted</div>
        <div className="text-center">Categorized</div>
        <div className="text-center">Not Categorized</div>
        <div className="text-center">Global BL</div>
        <div className="text-center">Blacklisted</div>
        <div className="text-center">Gibberish</div>
        <div className="text-center col-span-2">Actions</div>
      </div>

      {/* Table Body */}
      {categories.map(category => (
        <div
          key={category.id}
          className={`grid grid-cols-12 items-center px-4 py-3 text-sm border-b border-gray-100 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors ${
            activeCategory?.id === category.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          }`}
        >
          {/* Name */}
          <div
            className="col-span-2 font-medium text-gray-800 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => onSelectCategory(category)}
          >
            {category.name}
          </div>

          {/* All Answers */}
          <div
            onClick={() => navigateToCoding(category.id)}
            className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline font-medium"
            title="Click to view ALL answers in this category (no filters)"
          >
            {category.allAnswers}
          </div>

          {/* Whitelisted */}
          <div
            onClick={() => navigateToCodingWithFilter(category.id, 'whitelisted')}
            className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
          >
            {category.whitelisted}
          </div>

          {/* Categorized */}
          <div
            onClick={() => navigateToCodingWithFilter(category.id, 'categorized')}
            className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
          >
            {category.categorized}
          </div>

          {/* Not Categorized */}
          <div
            onClick={() => navigateToCodingWithFilter(category.id, 'notCategorized')}
            className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
          >
            {category.notCategorized}
          </div>

          {/* Global BL */}
          <div
            onClick={() => navigateToCodingWithFilter(category.id, 'global_blacklist')}
            className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
          >
            {category.global_blacklist}
          </div>

          {/* Blacklisted */}
          <div
            onClick={() => navigateToCodingWithFilter(category.id, 'blacklisted')}
            className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
          >
            {category.blacklisted}
          </div>

          {/* Gibberish */}
          <div
            onClick={() => navigateToCodingWithFilter(category.id, 'gibberish')}
            className="text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
          >
            {category.gibberish}
          </div>

          {/* Actions */}
          <div className="col-span-2 flex justify-center gap-4">
            <button
              title="Edit category settings"
              onClick={() => onEditCategory(category)}
              className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 transition-colors p-1"
            >
              <Settings size={20} />
            </button>
            <button
              title="Open coding view"
              onClick={() => navigateToCoding(category.id)}
              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1"
            >
              <Code2 size={20} />
            </button>
            <button
              title="Delete category"
              onClick={() => onDeleteCategory(category.id)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors ml-2 p-1"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

