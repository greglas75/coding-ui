// ═══════════════════════════════════════════════════════════════
// 📊 useLazyData - Hook for lazy loading data with pagination
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { simpleLogger } from '../utils/logger';

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface UseLazyDataOptions<T> {
  fetchFn: (params: PaginationParams) => Promise<PaginatedResponse<T>>;
  pageSize?: number;
  enabled?: boolean;
  cacheKey?: string;
}

interface UseLazyDataReturn<T> {
  data: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
  currentPage: number;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
  reset: () => void;
}

export function useLazyData<T>({
  fetchFn,
  pageSize = 50,
  enabled = true,
  cacheKey,
}: UseLazyDataOptions<T>): UseLazyDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cache management
  useEffect(() => {
    if (cacheKey) {
      try {
        const cached = sessionStorage.getItem(`lazy-data-${cacheKey}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setData(parsed.data);
          setTotal(parsed.total);
          setCurrentPage(parsed.page);
          setHasMore(parsed.hasMore);
          simpleLogger.info(`📦 Loaded from cache: ${cacheKey}`);
        }
      } catch (err) {
        simpleLogger.warn('Failed to load from cache:', err);
      }
    }
  }, [cacheKey]);

  // Save to cache
  const saveToCache = useCallback((dataToCache: T[], pageNum: number, totalCount: number, hasMoreData: boolean) => {
    if (cacheKey) {
      try {
        sessionStorage.setItem(`lazy-data-${cacheKey}`, JSON.stringify({
          data: dataToCache,
          page: pageNum,
          total: totalCount,
          hasMore: hasMoreData,
          timestamp: Date.now(),
        }));
      } catch (err) {
        simpleLogger.warn('Failed to save to cache:', err);
      }
    }
  }, [cacheKey]);

  // Load initial data
  const loadInitial = useCallback(async () => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchFn({
        page: 1,
        pageSize,
        offset: 0,
        limit: pageSize,
      });

      if (isMountedRef.current) {
        setData(response.data);
        setTotal(response.total);
        setCurrentPage(1);
        setHasMore(response.hasMore);
        saveToCache(response.data, 1, response.total, response.hasMore);

        simpleLogger.info(`✅ Loaded initial ${response.data.length}/${response.total} items`);
      }
    } catch (err) {
      if (isMountedRef.current && err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        simpleLogger.error('Error loading initial data:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFn, pageSize, saveToCache]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isLoading) return;

    setIsLoadingMore(true);
    setError(null);

    const nextPage = currentPage + 1;
    const offset = currentPage * pageSize;

    try {
      const response = await fetchFn({
        page: nextPage,
        pageSize,
        offset,
        limit: pageSize,
      });

      if (isMountedRef.current) {
        const newData = [...data, ...response.data];
        setData(newData);
        setTotal(response.total);
        setCurrentPage(nextPage);
        setHasMore(response.hasMore);
        saveToCache(newData, nextPage, response.total, response.hasMore);

        simpleLogger.info(`✅ Loaded page ${nextPage}: ${response.data.length} items (total: ${newData.length}/${response.total})`);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load more'));
        simpleLogger.error('Error loading more data:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [hasMore, isLoadingMore, isLoading, currentPage, pageSize, fetchFn, data, saveToCache]);

  // Reset to initial state
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setData([]);
    setIsLoading(false);
    setIsLoadingMore(false);
    setError(null);
    setHasMore(true);
    setTotal(0);
    setCurrentPage(1);

    if (cacheKey) {
      sessionStorage.removeItem(`lazy-data-${cacheKey}`);
    }
  }, [cacheKey]);

  // Reload from beginning
  const reload = useCallback(async () => {
    reset();
    await loadInitial();
  }, [reset, loadInitial]);

  // Load initial data on mount
  useEffect(() => {
    if (enabled && data.length === 0) {
      loadInitial();
    }

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [enabled, loadInitial, data.length]);

  return {
    data,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    total,
    currentPage,
    loadMore,
    reload,
    reset,
  };
}

