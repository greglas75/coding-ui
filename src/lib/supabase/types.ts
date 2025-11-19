/**
 * TypeScript types for Supabase utilities
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface QueryMetrics {
  table: string;
  operation: string;
  duration: number;
  rowCount?: number;
  cached: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

export interface OptimizedQueryResult<T> {
  success: boolean;
  data: T[];
  source?: 'cache' | 'database';
  error?: Error;
}

