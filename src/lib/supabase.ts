/**
 * Supabase Client and Helper Functions
 *
 * Re-exports from supabaseClient and supabase/* modules for backward compatibility.
 */

// Re-export from supabaseClient
export { getSupabaseClient, supabase } from './supabaseClient';

// Re-export from supabase/* modules
export {
  createCode,
  fetchCodes,
  saveCodesForAnswer,
  cache,
  paginatedQuery,
  fetchAISuggestion,
  fetchCategoriesOptimized,
  fetchCodesOptimized,
  optimisticUpdate,
  batchUpdate,
  searchWithCache,
  prefetchData,
  fastCount,
  updateSingleRow,
  upsertRow,
  LazyLoader,
  performanceMonitor,
  monitoredQuery,
} from './supabase/index';

export type { CacheEntry, QueryMetrics, PaginatedResult, OptimizedQueryResult } from './supabase/types';
