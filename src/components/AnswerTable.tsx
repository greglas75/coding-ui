import { Menu } from '@headlessui/react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { Home, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAnswers, useBulkUpdateAnswers } from '../hooks/useAnswersQuery';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { getSupabaseClient } from '../lib/supabase';
import type { Answer } from '../types';
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
    const categoryId = params.get("categoryId");
    if (categoryId) {
      const id = parseInt(categoryId);
      if (!isNaN(id)) {
        setCurrentCategoryId(id);
        console.log('🔍 AnswerTable: Found categoryId in URL:', id);
      }
    }
  }, []);

  // Function to set current category when coding starts
  const handleCodingStart = (categoryId: number | undefined) => {
    console.log('🔍 AnswerTable: Setting current category ID:', categoryId);
    setCurrentCategoryId(categoryId);
  };

  // Function to update filters from CodingGrid
  const handleFiltersChange = useCallback((filters: any) => {
    console.log('🔍 AnswerTable: Filters changed:', filters);
    setCurrentFilters(filters);
  }, []);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => currentFilters, [currentFilters]);

  // Use React Query hook for data fetching
  const {
    data: queryResult,
    isLoading: loading,
    error
  } = useAnswers({
    categoryId: currentCategoryId,
    page,
    pageSize,
    filters: memoizedFilters
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
      console.log('🔍 Category ID distribution:', categoryStats);
      console.log(`📊 Showing page ${page + 1}, ${answers.length} of ${totalCount} total answers`);
    }
  }, [answers, page, totalCount]);

  // Effect for realtime subscription (only once)
  useEffect(() => {
    if (!currentCategoryId) return;

    console.log('🔄 Setting up realtime subscription for answers');

    // Realtime: subscribe to changes in "answers" table
    const channel = supabase
      .channel('public:answers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers' },
        (payload: RealtimePostgresChangesPayload<Answer>) => {
          console.log('🔄 Realtime update received:', payload.eventType);

          // Invalidate React Query cache to refetch fresh data
          queryClient.invalidateQueries({
            queryKey: ['answers', currentCategoryId]
          });
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up realtime subscription');
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
          coding_date: new Date().toISOString()
        }
      });

      setSelected(new Set());
      alert(`Updated ${selected.size} items to ${status}`);
    } catch (error) {
      console.error('Error updating answers:', error);
      alert((error as Error).message);
    }
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    selectedCount: selected.size,
    onBulkUpdate: bulkUpdateStatus
  });

  if (loading) return (
    <MainLayout
      breadcrumbs={[
        { label: 'Home', href: '/', icon: <Home size={14} /> },
        { label: 'Coding' }
      ]}
    >
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-500 dark:text-gray-400">Loading answers...</p>
      </div>
    </MainLayout>
  );

  if (err) return (
    <MainLayout
      breadcrumbs={[
        { label: 'Home', href: '/', icon: <Home size={14} /> },
        { label: 'Coding' }
      ]}
    >
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400">
        Error: {err}
      </div>
    </MainLayout>
  );

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Home', href: '/', icon: <Home size={14} /> },
        { label: 'Coding' }
      ]}
      maxWidth="wide"
    >
      {/* View Settings */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div></div>

        {/* View Options Dropdown */}
        <Menu as="div" className="relative">
          <Menu.Button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
            title="View options"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">View Options</span>
          </Menu.Button>

          <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-md shadow-lg text-sm z-50 py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-neutral-700">
              Display Density
            </div>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                    active ? 'bg-gray-100 dark:bg-neutral-800' : ''
                  } ${
                    density === 'comfortable' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => setDensity('comfortable')}
                  title="More spacing between rows"
                >
                  {density === 'comfortable' && '✓ '}Comfortable
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${
                    active ? 'bg-gray-100 dark:bg-neutral-800' : ''
                  } ${
                    density === 'compact' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => setDensity('compact')}
                  title="Less spacing, more data visible"
                >
                  {density === 'compact' && '✓ '}Compact
                </button>
              )}
            </Menu.Item>
          </Menu.Items>
        </Menu>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border shadow-sm overflow-hidden">
        <BulkActions
          selectedCount={selected.size}
          onBulkUpdate={bulkUpdateStatus}
        />

        <div className="p-4">
          <CodingGrid
            answers={answers}
            density={density}
            currentCategoryId={currentCategoryId}
            onCodingStart={handleCodingStart}
            onFiltersChange={handleFiltersChange}
          />
        </div>

        {/* Pagination Controls */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} answers
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
