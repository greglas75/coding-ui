import { Plus, RefreshCw, Search, Upload } from 'lucide-react';
import type { Category } from '../types';
import { MultiSelectDropdown } from './filters/MultiSelectDropdown';

interface CodeListToolbarProps {
  searchText: string;
  setSearchText: (value: string) => void;
  onlyWhitelisted: boolean;
  setOnlyWhitelisted: (value: boolean) => void;
  categoryFilter: number[];
  setCategoryFilter: (value: number[]) => void;
  categories: Category[];
  onAddCode: () => void;
  onBulkUpload?: () => void;
  onReload?: () => void;
  isLoading?: boolean;
}

export function CodeListToolbar({
  searchText,
  setSearchText,
  onlyWhitelisted,
  setOnlyWhitelisted,
  categoryFilter,
  setCategoryFilter,
  categories,
  onAddCode,
  onBulkUpload,
  onReload,
  isLoading = false
}: CodeListToolbarProps) {
  return (
    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
        {/* Left side: Search with icon and reload */}
        <div className="flex items-center gap-2 flex-1 min-w-[250px] max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search codes..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-md bg-white text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
            />
          </div>
          {onReload && (
            <button
              onClick={onReload}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
              title="Reload codes"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        {/* Right side: Filters and actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category filter - MultiSelect */}
          <div className="min-w-[200px]">
            <MultiSelectDropdown
              label="Categories"
              options={categories.map(c => c.name)}
              selected={categoryFilter.map(id => {
                const cat = categories.find(c => c.id === id);
                return cat ? cat.name : '';
              }).filter(Boolean)}
              onChange={(selectedNames) => {
                const selectedIds = selectedNames
                  .map(name => categories.find(c => c.name === name)?.id)
                  .filter((id): id is number => id !== undefined);
                setCategoryFilter(selectedIds);
              }}
              searchable
              placeholder="All categories"
            />
          </div>

          {/* Only whitelisted checkbox */}
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              id="onlyWhitelisted"
              checked={onlyWhitelisted}
              onChange={(e) => setOnlyWhitelisted(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
            />
            <span>Only whitelisted</span>
          </label>

          {/* Add Code button */}
          <button
            onClick={onAddCode}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-zinc-800 flex items-center gap-2 transition-colors"
            title="Add new code"
          >
            <Plus size={16} />
            <span>Add Code</span>
          </button>

          {/* Upload List button */}
          {onBulkUpload && (
            <button
              onClick={onBulkUpload}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-zinc-800 flex items-center gap-2 transition-colors"
              title="Bulk upload codes from list"
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Upload List</span>
              <span className="sm:hidden">Upload</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
