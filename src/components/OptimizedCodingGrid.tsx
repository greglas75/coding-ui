// ═══════════════════════════════════════════════════════════════
// ⚡ Optimized Coding Grid
// Automatically switches between normal and virtualized rendering
// Includes lazy loading and infinite scroll
// ═══════════════════════════════════════════════════════════════

import { memo, useCallback, useState } from 'react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import type { Answer } from '../types';
import { simpleLogger } from '../utils/logger';
import { CodingGrid } from './CodingGrid';
import { VirtualizedCodingGrid } from './VirtualizedCodingGrid';

interface OptimizedCodingGridProps {
  // Data props
  initialAnswers?: Answer[];
  totalAnswers?: number;

  // Pagination props
  fetchPage?: (page: number, pageSize: number) => Promise<Answer[]>;
  pageSize?: number;
  enableInfiniteScroll?: boolean;

  // Grid props
  density?: 'compact' | 'comfortable';
  setDensity?: (density: 'compact' | 'comfortable') => void;
  currentCategoryId?: number;
  onCodingStart?: (categoryId: number | undefined) => void;
  onFiltersChange?: (filters: any) => void;

  // Optimization props
  virtualizationThreshold?: number;
  forceVirtualization?: boolean;
  useLazyLoading?: boolean;
}

export const OptimizedCodingGrid = memo<OptimizedCodingGridProps>(({
  initialAnswers = [],
  totalAnswers,
  fetchPage,
  pageSize = 50,
  enableInfiniteScroll = false,
  density = 'comfortable',
  setDensity = () => {},
  currentCategoryId,
  onCodingStart,
  onFiltersChange,
  virtualizationThreshold = 100,
  forceVirtualization = false,
  useLazyLoading = false,
}) => {
  const [selectedAnswerId, setSelectedAnswerId] = useState<number>();

  // Lazy loading hook
  const {
    items: lazyAnswers,
    isLoading: isLazyLoading,
    isLoadingMore: _isLoadingMore,
    hasMore,
    loadMore,
  } = useInfiniteScroll<Answer>({
    pageSize,
    fetchPage: fetchPage || (async () => []),
    enabled: useLazyLoading && !!fetchPage,
  });

  // Determine which answers to use
  const answers = useLazyLoading ? lazyAnswers : initialAnswers;
  const shouldVirtualize = forceVirtualization || answers.length > virtualizationThreshold;

  simpleLogger.info(`📊 CodingGrid: ${answers.length} answers, virtualized: ${shouldVirtualize}, lazy: ${useLazyLoading}`);

  const handleSelectAnswer = useCallback((answer: Answer) => {
    setSelectedAnswerId(answer.id);
    onCodingStart?.(currentCategoryId);
  }, [onCodingStart, currentCategoryId]);

  const handleLoadMore = useCallback(async () => {
    if (!enableInfiniteScroll || !useLazyLoading) return;
    await loadMore();
  }, [enableInfiniteScroll, useLazyLoading, loadMore]);

  // Use virtualized version for large datasets or lazy loading
  if (shouldVirtualize || useLazyLoading) {
    return (
      <VirtualizedCodingGrid
        answers={answers}
        rowHeight={density === 'compact' ? 60 : 80}
        hasMore={hasMore}
        isLoading={isLazyLoading}
        onLoadMore={handleLoadMore}
        onSelectAnswer={handleSelectAnswer}
        selectedAnswerId={selectedAnswerId}
        density={density}
      />
    );
  }

  // Use standard grid for small datasets
  return (
    <CodingGrid
      answers={answers}
      totalAnswers={totalAnswers}
      density={density}
      setDensity={setDensity}
      currentCategoryId={currentCategoryId}
      onCodingStart={onCodingStart}
      onFiltersChange={onFiltersChange}
    />
  );
});

OptimizedCodingGrid.displayName = 'OptimizedCodingGrid';

