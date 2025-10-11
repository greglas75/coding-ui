// ═══════════════════════════════════════════════════════════════
// 🚀 Virtualized Coding Grid - Optimized for large datasets
// Uses react-window for virtualization and infinite scroll
// ═══════════════════════════════════════════════════════════════

import { memo, useState, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import type { Answer } from '../types';

interface VirtualizedCodingGridProps {
  answers: Answer[];
  rowHeight?: number;
  hasMore?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => Promise<void>;
  onSelectAnswer?: (answer: Answer) => void;
  selectedAnswerId?: number;
  density?: 'compact' | 'comfortable';
}

// ───────────────────────────────────────────────────────────────
// Answer Row Component (Memoized)
// ───────────────────────────────────────────────────────────────

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    answers: Answer[];
    selectedAnswerId?: number;
    onSelectAnswer?: (answer: Answer) => void;
    isItemLoaded: (index: number) => boolean;
  };
}

const AnswerRow = memo<RowProps>(({ index, style, data }) => {
  const { answers, selectedAnswerId, onSelectAnswer, isItemLoaded } = data;

  // Check if this item is loaded
  if (!isItemLoaded(index)) {
    return (
      <div style={style} className="flex items-center justify-center py-4">
        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const answer = answers[index];
  if (!answer) return null;

  const isSelected = selectedAnswerId === answer.id;

  return (
    <div
      style={style}
      onClick={() => onSelectAnswer?.(answer)}
      className={`border-b border-zinc-100 dark:border-zinc-800 cursor-pointer transition-colors px-4 py-3 ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* ID */}
        <div className="text-xs text-zinc-500 dark:text-zinc-400 w-12 flex-shrink-0">
          #{answer.id}
        </div>

        {/* Answer Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2">
            {answer.answer_text}
          </p>
          {answer.translation_en && answer.translation_en !== answer.answer_text && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic">
              {answer.translation_en}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="w-32 flex-shrink-0">
          {answer.selected_code ? (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded dark:bg-green-900/20 dark:text-green-300">
              {answer.selected_code}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded dark:bg-gray-800 dark:text-gray-400">
              {answer.general_status}
            </span>
          )}
        </div>

        {/* Language */}
        {answer.language && (
          <div className="w-12 flex-shrink-0 text-xs text-zinc-500 dark:text-zinc-400 uppercase">
            {answer.language}
          </div>
        )}
      </div>
    </div>
  );
});

AnswerRow.displayName = 'AnswerRow';

// ───────────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────────

export const VirtualizedCodingGrid = memo<VirtualizedCodingGridProps>(({
  answers,
  rowHeight = 80,
  hasMore = false,
  isLoading = false,
  onLoadMore,
  onSelectAnswer,
  selectedAnswerId,
  density = 'comfortable',
}) => {
  const [loadingMore, setLoadingMore] = useState(false);

  // Adjust row height based on density
  const actualRowHeight = density === 'compact' ? 60 : rowHeight;

  // Check if item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return !hasMore || index < answers.length;
  }, [hasMore, answers.length]);

  // Load more items
  const loadMoreItems = useCallback(async (startIndex: number, stopIndex: number) => {
    if (loadingMore || !hasMore || !onLoadMore) return;

    console.log(`📥 Loading more items: ${startIndex} - ${stopIndex}`);
    setLoadingMore(true);

    try {
      await onLoadMore();
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, onLoadMore]);

  // Item count (add loading row if has more)
  const itemCount = hasMore ? answers.length + 1 : answers.length;

  // Trigger load more when scrolling near bottom
  const handleItemsRendered = useCallback(({ visibleStopIndex }: { visibleStopIndex: number }) => {
    if (!hasMore || loadingMore || !onLoadMore) return;

    // If scrolled to within 10 items of the end, load more
    if (visibleStopIndex >= answers.length - 10) {
      loadMoreItems(visibleStopIndex, visibleStopIndex + 50);
    }
  }, [hasMore, loadingMore, onLoadMore, answers.length, loadMoreItems]);

  // Memoize item data
  const itemData = useMemo(() => ({
    answers,
    selectedAnswerId,
    onSelectAnswer,
    isItemLoaded,
  }), [answers, selectedAnswerId, onSelectAnswer, isItemLoaded]);

  return (
    <div className="relative h-full bg-white dark:bg-zinc-900">
      {/* Loading overlay */}
      {isLoading && answers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading answers...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && answers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">No answers found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Try adjusting your filters
            </p>
          </div>
        </div>
      )}

      {/* Virtualized List */}
      {answers.length > 0 && (
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={itemCount}
              itemSize={actualRowHeight}
              width={width}
              itemData={itemData}
              onItemsRendered={handleItemsRendered}
              overscanCount={10}
            >
              {AnswerRow}
            </List>
          )}
        </AutoSizer>
      )}

      {/* Loading more indicator at bottom */}
      {loadingMore && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            <span className="text-sm">Loading more...</span>
          </div>
        </div>
      )}

      {/* Stats footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-t border-zinc-200 dark:border-zinc-700 px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">
        Showing {answers.length} answers
        {hasMore && ' (scroll for more)'}
      </div>
    </div>
  );
});

VirtualizedCodingGrid.displayName = 'VirtualizedCodingGrid';

