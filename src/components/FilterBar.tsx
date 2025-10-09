interface FilterBarProps {
  searchText: string;
  setSearchText: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  onClear: () => void;
  onSearch: () => void;
  density: 'comfortable' | 'compact';
  onDensityChange: (density: 'comfortable' | 'compact') => void;
  rowCount: number;
}

export function FilterBar({
  searchText,
  setSearchText,
  statusFilter,
  setStatusFilter,
  onClear,
  onSearch,
  density,
  onDensityChange,
  rowCount
}: FilterBarProps) {
  const hasFilters = searchText.trim() || statusFilter;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search input */}
        <div className="md:col-span-6">
          <input
            type="text"
            placeholder="Search answers..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
          />
        </div>

        {/* Status filter */}
        <div className="md:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">All statuses</option>
            <option value="uncategorized">Uncategorized</option>
            <option value="whitelist">Whitelist</option>
            <option value="blacklist">Blacklist</option>
            <option value="categorized">Categorized</option>
            <option value="global_blacklist">Global Blacklist</option>
            <option value="Other">Other</option>
            <option value="Ignore">Ignore</option>
          </select>
        </div>

            {/* Controls */}
            <div className="md:col-span-2 flex items-center gap-2 justify-end">
              {/* Row count */}
              <span className="text-sm text-zinc-600 dark:text-zinc-400 hidden md:inline">
                Rows: {rowCount}
              </span>

              {/* Density toggle */}
              <select
                value={density}
                onChange={(e) => onDensityChange(e.target.value as 'comfortable' | 'compact')}
                className="px-2 py-1 text-xs border border-zinc-300 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 min-w-0"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>

              {/* Clear button */}
              <button
                onClick={onClear}
                disabled={!hasFilters}
                className="px-3 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 border border-zinc-300 rounded-md hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-600 dark:hover:bg-zinc-700 whitespace-nowrap cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
    </div>
  );
}
