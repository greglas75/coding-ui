// ═══════════════════════════════════════════════════════════════
// 🔄 useInfiniteScroll - Hook for infinite scroll with lazy loading
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions<T> {
  pageSize?: number;
  initialPage?: number;
  fetchPage: (page: number, pageSize: number) => Promise<T[]>;
  enabled?: boolean;
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  currentPage: number;
  totalItems: number;
  loadMore: () => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;
}

export function useInfiniteScroll<T>({
  pageSize = 50,
  initialPage = 1,
  fetchPage,
  enabled = true,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // Load initial page
  useEffect(() => {
    if (!enabled) return;

    const loadInitial = async () => {
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        console.log(`📥 Loading initial page (page ${initialPage}, size ${pageSize})`);
        const data = await fetchPage(initialPage, pageSize);

        if (isMountedRef.current) {
          setItems(data);
          setCurrentPage(initialPage);
          setHasMore(data.length === pageSize);
          console.log(`✅ Loaded ${data.length} items (hasMore: ${data.length === pageSize})`);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to load data'));
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          isLoadingRef.current = false;
        }
      }
    };

    loadInitial();

    return () => {
      isMountedRef.current = false;
    };
  }, [enabled, initialPage, pageSize, fetchPage]);

  // Load more items
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingRef.current || !enabled) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoadingMore(true);
    setError(null);

    const nextPage = currentPage + 1;

    try {
      console.log(`📥 Loading more items (page ${nextPage}, size ${pageSize})`);
      const data = await fetchPage(nextPage, pageSize);

      if (isMountedRef.current) {
        setItems(prev => [...prev, ...data]);
        setCurrentPage(nextPage);
        setHasMore(data.length === pageSize);
        console.log(`✅ Loaded ${data.length} more items (total: ${items.length + data.length})`);
      }
    } catch (err) {
      console.error('Error loading more data:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load more data'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
        isLoadingRef.current = false;
      }
    }
  }, [hasMore, currentPage, pageSize, fetchPage, enabled, items.length]);

  // Reset to initial state
  const reset = useCallback(() => {
    setItems([]);
    setCurrentPage(initialPage);
    setHasMore(true);
    setError(null);
    setIsLoading(false);
    setIsLoadingMore(false);
  }, [initialPage]);

  // Refresh (reload from page 1)
  const refresh = useCallback(async () => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Refreshing data...');
      const data = await fetchPage(initialPage, pageSize);

      if (isMountedRef.current) {
        setItems(data);
        setCurrentPage(initialPage);
        setHasMore(data.length === pageSize);
        console.log(`✅ Refreshed with ${data.length} items`);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to refresh data'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [initialPage, pageSize, fetchPage]);

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    currentPage,
    totalItems: items.length,
    loadMore,
    reset,
    refresh,
  };
}

