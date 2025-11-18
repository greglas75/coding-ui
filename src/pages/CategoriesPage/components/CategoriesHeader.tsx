/**
 * Categories Header Component
 */

import { Home, Plus, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Category } from '../../../types';

interface CategoriesHeaderProps {
  activeCategory: Category | null;
  searchText: string;
  onSearchChange: (value: string) => void;
  onCloseCategory: () => void;
  onReload: () => void;
  onAddCategory: () => void;
  loading: boolean;
}

export function CategoriesHeader({
  activeCategory,
  searchText,
  onSearchChange,
  onCloseCategory,
  onReload,
  onAddCategory,
  loading,
}: CategoriesHeaderProps) {
  return (
    <>
      {/* Category selected - show close button */}
      {activeCategory && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onCloseCategory}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Close category details"
          >
            <X size={14} />
            Close details
          </button>
          <button
            onClick={onReload}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 text-sm rounded-md flex items-center gap-1.5 transition disabled:opacity-50"
            title="Reload category data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Reload
          </button>
        </div>
      )}

      {/* Header with Add button (only when no category selected) */}
      {!activeCategory && (
        <div className="flex justify-between items-center mb-4">
          <div></div> {/* Spacer since title is in layout */}
          <div className="flex gap-2">
            <button
              onClick={onReload}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 text-sm rounded-md flex items-center gap-1.5 transition disabled:opacity-50"
              title="Reload categories"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Reload
            </button>
            <Link
              to="/codeframe/builder"
              className="px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm rounded-md flex items-center gap-1.5 transition shadow-sm"
              title="AI-powered codeframe generation"
            >
              <Sparkles size={16} />
              AI Codeframe Builder
            </Link>
            <button
              onClick={onAddCategory}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md flex items-center gap-1.5 transition"
            >
              <Plus size={16} />
              Add Category
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchText}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
    </>
  );
}

