import { Filter, Redo, RefreshCw, RotateCcw, Undo } from 'lucide-react';
import type { FC } from 'react';

interface ActionButtonsProps {
  onApply: () => void;
  onReset: () => void;
  onReload?: () => void;
  isApplying?: boolean;
  isReloading?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const ActionButtons: FC<ActionButtonsProps> = ({
  onApply,
  onReset,
  onReload,
  isApplying = false,
  isReloading = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) => {
  return (
    <div className="flex items-center gap-1">
      {/* Undo/Redo Buttons */}
      {onUndo && onRedo && (
        <div className="flex items-center gap-1 border-r border-gray-200 dark:border-neutral-700 pr-2 mr-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo size={16} />
            <span className="hidden sm:inline">Redo</span>
          </button>
        </div>
      )}

      {onReload && (
        <button
          onClick={onReload}
          disabled={isReloading}
          className="px-3 py-1.5 border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Reload category data"
        >
          <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
          Reload
        </button>
      )}

      <button
        onClick={onApply}
        disabled={isApplying}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Filter size={14} />
        {isApplying ? 'Applying...' : 'Apply Filters'}
      </button>

      <button
        onClick={onReset}
        className="bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
      >
        <RotateCcw size={14} />
        Reset
      </button>
    </div>
  );
};
