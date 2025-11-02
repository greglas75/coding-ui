/**
 * BulkActions - Toolbar for bulk operations on codes
 * Large, accessible buttons (min 44x44px touch targets)
 */
import { FC } from 'react';
import {
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Download,
} from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  allExpanded: boolean;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onApproveSelected: () => void;
  onRejectSelected: () => void;
  onDownloadJSON?: () => void;
  onDownloadCSV?: () => void;
}

export const BulkActions: FC<BulkActionsProps> = ({
  selectedCount,
  totalCount,
  allExpanded,
  onSelectAll,
  onSelectNone,
  onExpandAll,
  onCollapseAll,
  onApproveSelected,
  onRejectSelected,
  onDownloadJSON,
  onDownloadCSV,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 space-y-3">
      {/* Selection Info */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      {/* Action Groups */}
      <div className="flex flex-wrap gap-3">
        {/* Selection Controls */}
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="
              inline-flex items-center gap-2
              px-4 py-2.5 min-h-[44px]
              bg-gray-100 hover:bg-gray-200
              dark:bg-gray-700 dark:hover:bg-gray-600
              text-gray-700 dark:text-gray-200
              rounded-lg font-medium text-sm
              transition-all duration-200
              hover:shadow-md
            "
            title="Select all codes (shortcut: A)"
          >
            <CheckSquare className="h-5 w-5" />
            Select All
          </button>

          <button
            onClick={onSelectNone}
            className="
              inline-flex items-center gap-2
              px-4 py-2.5 min-h-[44px]
              bg-gray-100 hover:bg-gray-200
              dark:bg-gray-700 dark:hover:bg-gray-600
              text-gray-700 dark:text-gray-200
              rounded-lg font-medium text-sm
              transition-all duration-200
              hover:shadow-md
            "
            title="Deselect all"
          >
            <Square className="h-5 w-5" />
            Select None
          </button>
        </div>

        {/* Expand/Collapse Controls */}
        <div className="flex gap-2">
          <button
            onClick={allExpanded ? onCollapseAll : onExpandAll}
            className="
              inline-flex items-center gap-2
              px-4 py-2.5 min-h-[44px]
              bg-gray-100 hover:bg-gray-200
              dark:bg-gray-700 dark:hover:bg-gray-600
              text-gray-700 dark:text-gray-200
              rounded-lg font-medium text-sm
              transition-all duration-200
              hover:shadow-md
            "
            title={allExpanded ? "Collapse all (shortcut: C)" : "Expand all (shortcut: E)"}
          >
            {allExpanded ? (
              <>
                <ChevronUp className="h-5 w-5" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronDown className="h-5 w-5" />
                Expand All
              </>
            )}
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={onApproveSelected}
            disabled={selectedCount === 0}
            className="
              inline-flex items-center gap-2
              px-5 py-2.5 min-h-[44px] min-w-[140px]
              bg-green-600 hover:bg-green-700
              disabled:bg-gray-300 disabled:cursor-not-allowed
              text-white font-semibold text-sm
              rounded-lg
              transition-all duration-200
              hover:shadow-lg hover:-translate-y-0.5
              disabled:hover:translate-y-0 disabled:hover:shadow-none
            "
            title="Approve selected codes (shortcut: Shift+A)"
          >
            <Check className="h-5 w-5" />
            Approve ({selectedCount})
          </button>

          <button
            onClick={onRejectSelected}
            disabled={selectedCount === 0}
            className="
              inline-flex items-center gap-2
              px-5 py-2.5 min-h-[44px] min-w-[140px]
              bg-white hover:bg-red-50
              border-2 border-red-600
              disabled:border-gray-300 disabled:cursor-not-allowed
              text-red-600 disabled:text-gray-400
              font-semibold text-sm
              rounded-lg
              transition-all duration-200
              hover:bg-red-600 hover:text-white
              hover:shadow-lg hover:-translate-y-0.5
              disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:bg-white
            "
            title="Reject selected codes (shortcut: Shift+R)"
          >
            <X className="h-5 w-5" />
            Reject ({selectedCount})
          </button>
        </div>

        {/* Download Actions */}
        {(onDownloadJSON || onDownloadCSV) && (
          <div className="flex gap-2">
            {onDownloadJSON && (
              <button
                onClick={onDownloadJSON}
                className="
                  inline-flex items-center gap-2
                  px-4 py-2.5 min-h-[44px]
                  bg-blue-100 hover:bg-blue-200
                  dark:bg-blue-900/30 dark:hover:bg-blue-900/50
                  text-blue-700 dark:text-blue-300
                  rounded-lg font-medium text-sm
                  transition-all duration-200
                  hover:shadow-md
                "
              >
                <Download className="h-5 w-5" />
                JSON
              </button>
            )}

            {onDownloadCSV && (
              <button
                onClick={onDownloadCSV}
                className="
                  inline-flex items-center gap-2
                  px-4 py-2.5 min-h-[44px]
                  bg-blue-100 hover:bg-blue-200
                  dark:bg-blue-900/30 dark:hover:bg-blue-900/50
                  text-blue-700 dark:text-blue-300
                  rounded-lg font-medium text-sm
                  transition-all duration-200
                  hover:shadow-md
                "
              >
                <Download className="h-5 w-5" />
                CSV
              </button>
            )}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        <span className="font-medium">Shortcuts:</span>{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Space</kbd>=Expand,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd>=Approve,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">A</kbd>=Select All,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">E</kbd>=Expand All,{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd>=Help
      </div>
    </div>
  );
};
