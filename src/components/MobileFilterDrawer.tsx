/**
 * 📱 Mobile Filter Drawer Component
 *
 * Bottom sheet drawer for filters on mobile devices.
 * Better UX than cramming filters into small screen.
 *
 * Benefits:
 * - Touch-friendly filter controls
 * - Doesn't clutter mobile UI
 * - Easy to apply/clear filters
 * - Swipe down to close
 * - Native app-like experience
 */

import { Filter, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface MobileFilterDrawerProps {
  children: ReactNode;
  activeFiltersCount: number;
  onClear: () => void;
  onApply?: () => void;
}

/**
 * Mobile filter drawer (bottom sheet)
 *
 * Usage:
 * ```tsx
 * <MobileFilterDrawer
 *   activeFiltersCount={filters.length}
 *   onClear={resetFilters}
 * >
 *   <FilterControls />
 * </MobileFilterDrawer>
 * ```
 */
export function MobileFilterDrawer({
  children,
  activeFiltersCount,
  onClear,
  onApply,
}: MobileFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    onApply?.();
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Filter Button (Mobile Only) */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
        aria-label="Open filters"
      >
        <Filter size={24} aria-hidden="true" />
        {activeFiltersCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center text-white"
            aria-label={`${activeFiltersCount} active filters`}
          >
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Drawer (Bottom Sheet) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Drawer Content */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Filter options"
          >
            {/* Handle (swipe indicator) */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({activeFiltersCount} active)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={onClear}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label="Close filters"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filter Content (scrollable) */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {children}
            </div>

            {/* Apply Button (sticky footer) */}
            <div className="sticky bottom-0 p-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-700">
              <button
                onClick={handleApply}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium text-base hover:bg-blue-700 transition-colors active:scale-98"
              >
                Apply Filters
                {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
