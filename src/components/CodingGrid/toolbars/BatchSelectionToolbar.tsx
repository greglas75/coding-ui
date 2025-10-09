import { BarChart3, FileDown, Settings, Sparkles } from 'lucide-react';
import type { FC } from 'react';

interface BatchSelectionToolbarProps {
  selectedCount: number;
  onBatchAI: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onShowAutoConfirm: () => void;
  onShowAnalytics: () => void;
  onShowExportImport: () => void;
  isProcessing: boolean;
  totalCount: number;
}

export const BatchSelectionToolbar: FC<BatchSelectionToolbarProps> = ({
  selectedCount,
  onBatchAI,
  onSelectAll,
  onClearSelection,
  onShowAutoConfirm,
  onShowAnalytics,
  onShowExportImport,
  isProcessing,
  totalCount
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950 border-y border-blue-200 dark:border-blue-900">
      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
        {selectedCount} selected
      </span>

      {/* Selection tips */}
      <div className="text-xs text-blue-600 dark:text-blue-400 ml-2">
        <span>
          Tip: <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">Ctrl</kbd> to multi-select,
          <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs ml-1">Shift</kbd> for range
        </span>
      </div>

      <button
        onClick={onBatchAI}
        disabled={isProcessing}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Sparkles size={16} />
        Process with AI
      </button>

      <button
        onClick={onSelectAll}
        className="px-3 py-1.5 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md transition-colors"
      >
        Select All ({totalCount})
      </button>

      <button
        onClick={onClearSelection}
        className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
      >
        Clear Selection
      </button>

      <div className="ml-auto flex items-center gap-2 border-l border-blue-200 dark:border-blue-900 pl-3">
        <button
          onClick={onShowAutoConfirm}
          className="px-3 py-1.5 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors flex items-center gap-1.5"
          title="Configure AI auto-confirm settings"
        >
          <Settings size={16} />
          <span className="hidden lg:inline">Auto-Confirm</span>
        </button>

        <button
          onClick={onShowAnalytics}
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5"
        >
          <BarChart3 size={16} />
          <span className="hidden lg:inline">Analytics</span>
        </button>

        <button
          onClick={onShowExportImport}
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5"
        >
          <FileDown size={16} />
          <span className="hidden lg:inline">Export/Import</span>
        </button>
      </div>
    </div>
  );
};
