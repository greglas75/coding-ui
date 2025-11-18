/**
 * Performance monitoring and lazy loading utilities
 */

import { simpleLogger } from '../../utils/logger';
import { paginatedQuery } from './pagination';
import type { QueryMetrics } from './types';

/**
 * Lazy loader for paginated data
 */
export class LazyLoader<T> {
  private table: string;
  private pageSize: number;
  private currentPage: number = 0;
  private totalCount: number = 0;
  private hasMore: boolean = true;
  private filters: Record<string, any>;
  private orderBy?: { column: string; ascending?: boolean };

  constructor(
    table: string,
    pageSize: number = 100,
    filters: Record<string, any> = {},
    orderBy?: { column: string; ascending?: boolean }
  ) {
    this.table = table;
    this.pageSize = pageSize;
    this.filters = filters;
    this.orderBy = orderBy;
  }

  async loadNext(): Promise<{ data: T[]; hasMore: boolean; total: number }> {
    if (!this.hasMore && this.currentPage > 0) {
      return { data: [], hasMore: false, total: this.totalCount };
    }

    const result = await paginatedQuery<T>(
      this.table,
      this.currentPage,
      this.pageSize,
      this.filters,
      this.orderBy
    );

    this.totalCount = result.count;
    this.hasMore = result.hasMore;
    this.currentPage++;

    return {
      data: result.data,
      hasMore: this.hasMore,
      total: this.totalCount,
    };
  }

  reset() {
    this.currentPage = 0;
    this.hasMore = true;
    this.totalCount = 0;
  }

  updateFilters(newFilters: Record<string, any>) {
    this.filters = newFilters;
    this.reset();
  }
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];

  log(metric: QueryMetrics) {
    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Log slow queries
    if (metric.duration > 1000 && !metric.cached) {
      simpleLogger.warn(`⚠️ [Performance] Slow query detected:`, metric);
    }
  }

  getAverageTime(table: string, operation: string): number {
    const filtered = this.metrics.filter(m => m.table === table && m.operation === operation);

    if (filtered.length === 0) return 0;

    const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
    return sum / filtered.length;
  }

  getCacheHitRate(): number {
    if (this.metrics.length === 0) return 0;
    const cached = this.metrics.filter(m => m.cached).length;
    return (cached / this.metrics.length) * 100;
  }

  getStats() {
    return {
      totalQueries: this.metrics.length,
      cacheHitRate: this.getCacheHitRate().toFixed(1) + '%',
      avgDuration:
        (this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length).toFixed(0) +
        'ms',
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Wrapper with performance monitoring
 *
 * @param table - Table name
 * @param operation - Operation name
 * @param queryFn - Query function to monitor
 * @returns Query result
 */
export async function monitoredQuery(
  table: string,
  operation: string,
  queryFn: () => Promise<any>
): Promise<any> {
  const startTime = performance.now();
  const result = await queryFn();
  const duration = performance.now() - startTime;

  performanceMonitor.log({
    table,
    operation,
    duration,
    rowCount: Array.isArray(result.data) ? result.data.length : 1,
    cached: false,
  });

  return result;
}

