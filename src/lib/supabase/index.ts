/**
 * Supabase utilities - Main entry point
 *
 * This module provides optimized Supabase query utilities organized by domain:
 * - cache: In-memory caching layer
 * - pagination: Paginated query helpers
 * - queries: Optimized category/code queries
 * - optimistic: Optimistic update utilities
 * - batch: Batch operation utilities
 * - search: Search with caching
 * - crud: CRUD operation utilities
 * - performance: Performance monitoring and lazy loading
 */

// Re-export client for backward compatibility
export { getSupabaseClient, supabase } from '../supabaseClient';

// Re-export codes repository functions
export { createCode, fetchCodes, saveCodesForAnswer } from '../../repositories/codes';

// Cache
export { cache } from './cache';

// Pagination
export { paginatedQuery } from './pagination';

// Queries
export { fetchAISuggestion, fetchCategoriesOptimized, fetchCodesOptimized } from './queries';

// Optimistic updates
export { optimisticUpdate } from './optimistic';

// Batch operations
export { batchUpdate } from './batch';

// Search
export { searchWithCache, prefetchData } from './search';

// CRUD
export { fastCount, updateSingleRow, upsertRow } from './crud';

// Performance
export { LazyLoader, performanceMonitor, monitoredQuery } from './performance';

// Types
export type { CacheEntry, QueryMetrics, PaginatedResult, OptimizedQueryResult } from './types';

