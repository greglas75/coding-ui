import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ModalFooterProps {
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
  onClose: () => void;
}

export function ModalFooter({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  currentIndex,
  totalCount,
  onClose,
}: ModalFooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
            hasPrevious
              ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
          title="Previous answer (Left arrow key)"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Previous</span>
        </button>

        {currentIndex !== undefined && totalCount !== undefined && (
          <div className="text-sm text-gray-600 dark:text-gray-400 px-3">
            {currentIndex + 1} / {totalCount}
          </div>
        )}

        <button
          onClick={onNext}
          disabled={!hasNext}
          className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
            hasNext
              ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
          title="Next answer (Right arrow key)"
        >
          <span className="text-sm font-medium">Next</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-base font-medium"
      >
        Close
      </button>
    </div>
  );
}

