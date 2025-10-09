interface BulkActionsProps {
  selectedCount: number;
  onBulkUpdate: (status: 'whitelist' | 'blacklist' | 'categorized') => void;
}

export function BulkActions({ selectedCount, onBulkUpdate }: BulkActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {selectedCount} selected
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onBulkUpdate('whitelist')}
          className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 dark:text-green-300 dark:bg-green-900/20 dark:border-green-700 dark:hover:bg-green-900/30"
        >
          Whitelist
        </button>
        <button
          onClick={() => onBulkUpdate('blacklist')}
          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:text-red-300 dark:bg-red-900/20 dark:border-red-700 dark:hover:bg-red-900/30"
        >
          Blacklist
        </button>
        <button
          onClick={() => onBulkUpdate('categorized')}
          className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:text-blue-300 dark:bg-blue-900/20 dark:border-blue-700 dark:hover:bg-blue-900/30"
        >
          Categorized
        </button>
      </div>
    </div>
  );
}
