import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAnswers, useBulkUpdateAnswers } from '../hooks/useAnswersQuery';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { getSupabaseClient } from '../lib/supabase';
import type { Answer } from '../types';
import { simpleLogger } from '../utils/logger';
import { BulkActions } from './BulkActions';
import { CodingGrid } from './CodingGrid';
import { MainLayout } from './layout/MainLayout';

const supabase = getSupabaseClient();

export function AnswerTable() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [currentCategoryId, setCurrentCategoryId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<any>(null);
  const pageSize = 100;

  // Get categoryId from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('categoryId');
    if (categoryId) {
      const id = parseInt(categoryId);
      if (!isNaN(id)) {
        setCurrentCategoryId(id);
        simpleLogger.info('🔍 AnswerTable: Found categoryId in URL:', id);
      }
    }
  }, []);

  // Function to set current category when coding starts
  const handleCodingStart = (categoryId: number | undefined) => {
    simpleLogger.info('🔍 AnswerTable: Setting current category ID:', categoryId);
    setCurrentCategoryId(categoryId);
  };

  // Function to update filters from CodingGrid
  const handleFiltersChange = useCallback((filters: any) => {
    simpleLogger.info('🔍 AnswerTable: Filters changed:', filters);
    setCurrentFilters(filters);
  }, []);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => currentFilters, [currentFilters]);

  // Use React Query hook for data fetching
  const {
    data: queryResult,
    isLoading: loading,
    error,
  } = useAnswers({
    categoryId: currentCategoryId,
    page,
    pageSize,
    filters: memoizedFilters,
  });

  const answers = queryResult?.data || [];
  const totalCount = queryResult?.count || 0;
  const err = error ? (error as Error).message : null;

  // Log data when it loads
  useEffect(() => {
    if (answers.length > 0) {
      const categoryStats = answers.reduce((acc: any, answer: any) => {
        const catId = answer.category_id || 'null';
        acc[catId] = (acc[catId] || 0) + 1;
        return acc;
      }, {});
      simpleLogger.info('🔍 Category ID distribution:', categoryStats);
      simpleLogger.info(
        `📊 Showing page ${page + 1}, ${answers.length} of ${totalCount} total answers`
      );
    }
  }, [answers, page, totalCount]);

  // Effect for realtime subscription (only once)
  useEffect(() => {
    if (!currentCategoryId) return;

    simpleLogger.info('🔄 Setting up realtime subscription for answers');

    // Realtime: subscribe to changes in "answers" table
    const channel = supabase
      .channel('public:answers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers' },
        (payload: RealtimePostgresChangesPayload<Answer>) => {
          simpleLogger.info('🔄 Realtime update received:', payload.eventType);

          // Invalidate React Query cache to refetch fresh data
          queryClient.invalidateQueries({
            queryKey: ['answers', currentCategoryId],
          });
        }
      )
      .subscribe();

    return () => {
      simpleLogger.info('🔄 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [currentCategoryId, queryClient]);

  // Use React Query mutation for bulk updates
  const bulkUpdateMutation = useBulkUpdateAnswers();

  async function bulkUpdateStatus(status: 'whitelist' | 'blacklist' | 'categorized') {
    if (selected.size === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        ids: Array.from(selected),
        updates: {
          general_status: status,
          coding_date: status === 'whitelist' ? new Date().toISOString() : null,
        },
      });

      setSelected(new Set());
      alert(`Updated ${selected.size} items to ${status}`);
    } catch (error) {
      simpleLogger.error('Error updating answers:', error);
      alert((error as Error).message);
    }
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    selectedCount: selected.size,
    onBulkUpdate: bulkUpdateStatus,
  });

  if (loading)
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-500 dark:text-gray-400">Loading answers...</p>
        </div>
      </MainLayout>
    );

  if (err)
    return (
      <MainLayout>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400">
          Error: {err}
        </div>
      </MainLayout>
    );

  return (
    <MainLayout maxWidth="wide">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border shadow-sm overflow-hidden">
        <BulkActions selectedCount={selected.size} onBulkUpdate={bulkUpdateStatus} />

        <div className="p-4">
          <CodingGrid
            answers={answers}
            totalAnswers={totalCount}
            density={density}
            setDensity={setDensity}
            currentCategoryId={currentCategoryId}
            onCodingStart={handleCodingStart}
            onFiltersChange={handleFiltersChange}
          />
        </div>

        {/* Pagination Controls */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of{' '}
              {totalCount} answers
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                Page {page + 1} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * pageSize >= totalCount}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
