import { QueryClient } from '@tanstack/react-query';

// Create global QueryClient with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 1 minute before considering it stale
      staleTime: 60_000, // 1 min

      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60_000, // 5 min (previously cacheTime)

      // Don't refetch on window focus (reduces unnecessary requests)
      refetchOnWindowFocus: false,

      // Refetch when internet connection is restored
      refetchOnReconnect: true,

      // Retry failed requests 1 time
      retry: 1,

      // Wait 1 second before retrying
      retryDelay: 1000,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,

      // Wait 1 second before retrying
      retryDelay: 1000,
    },
  },
});

// Log cache initialization in development
if (import.meta.env.DEV) {
  console.info('✅ React Query cache initialized with optimized defaults');
}
