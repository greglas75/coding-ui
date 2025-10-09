import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { BarChart3, Check, CheckSquare, ChevronRight, FileDown, Home, Loader2, RotateCw, Settings, Sparkles, Square, Wifi, WifiOff, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAcceptSuggestion } from '../hooks/useAcceptSuggestion';
import { useBatchSelection } from '../hooks/useBatchSelection';
import { useBatchCategorize, useCategorizeAnswer } from '../hooks/useCategorizeAnswer';
import { useDebounce } from '../hooks/useDebounce';
import { useFilters } from '../hooks/useFilters';
import { useOfflineSync } from '../hooks/useOfflineSync';
import type { HistoryAction } from '../hooks/useUndoRedo';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { AutoConfirmEngine } from '../lib/autoConfirmEngine';
import { BatchAIProcessor, type BatchProgress } from '../lib/batchAIProcessor';
import { FilterEngine, type FilterGroup, type FilterPreset } from '../lib/filterEngine';
import { RealtimeService, type CodeUpdateEvent, type UserPresence } from '../lib/realtimeService';
import { getSupabaseClient } from '../lib/supabase';
import type { Answer } from '../types';
import { AdvancedFiltersPanel } from './AdvancedFiltersPanel';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { AutoConfirmSettings } from './AutoConfirmSettings';
import { BatchProgressModal } from './BatchProgressModal';
import { ExportImportModal } from './ExportImportModal';
import { FiltersBar } from './FiltersBar';
import { LiveCodeUpdate } from './LiveCodeUpdate';
import { OnlineUsers } from './OnlineUsers';
import { RollbackConfirmationModal } from './RollbackConfirmationModal';
import { SelectCodeModal } from './SelectCodeModal';

const supabase = getSupabaseClient();

/**
 * Find all answers with identical answer_text in the same category
 * @param targetAnswer The answer to find duplicates for
 * @param allAnswers All answers in the current view
 * @returns Array of answer IDs with identical text
 */
function findDuplicateAnswers(
  targetAnswer: Answer,
  allAnswers: Answer[]
): number[] {
  // Only find duplicates in same category with EXACT same text
  const duplicates = allAnswers.filter(answer =>
    answer.category_id === targetAnswer.category_id &&
    answer.answer_text === targetAnswer.answer_text && // Exact match in original language
    answer.id !== targetAnswer.id // Don't include the target itself
  );

  return duplicates.map(a => a.id);
}

/**
 * Get count of duplicate answers (including the target)
 * FUTURE: This utility function is prepared for duplicate detection feature
 */
function _getDuplicateCount(
  targetAnswer: Answer,
  allAnswers: Answer[]
): number {
  return allAnswers.filter(answer =>
    answer.category_id === targetAnswer.category_id &&
    answer.answer_text === targetAnswer.answer_text
  ).length;
}

// Helper component for shortcut rows
function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-neutral-800">
      <kbd className="px-2 py-1 bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">
        {shortcut}
      </kbd>
      <span className="text-gray-600 dark:text-gray-400 flex-1 ml-4 text-sm">
        {description}
      </span>
    </div>
  );
}

interface CodingGridProps {
  answers: Answer[];
  density: 'comfortable' | 'compact';
  currentCategoryId?: number;
  onCodingStart?: (categoryId: number | undefined) => void;
  onFiltersChange?: (filters: any) => void;
}

export const CodingGrid = memo(function CodingGrid({ answers, density, currentCategoryId, onCodingStart, onFiltersChange }: CodingGridProps) {
  const queryClient = useQueryClient();

  // Debug: Render counter (only in development)
  const renderCount = useRef(0);
  renderCount.current++;
  if (process.env.NODE_ENV === 'development' && renderCount.current % 10 === 0) {
    console.log(`🎬 CodingGrid RENDER #${renderCount.current}`);
  }

  // AI Categorization hooks
  const { mutate: categorizeAnswer, isPending: isCategorizing } = useCategorizeAnswer();
  const { mutateAsync: batchCategorizeAsync } = useBatchCategorize();
  const { mutate: acceptSuggestion, isPending: isAcceptingSuggestion } = useAcceptSuggestion();

  // Undo/Redo system
  const { addAction, undo, redo, canUndo, canRedo } = useUndoRedo({ maxHistorySize: 100 });

  // Offline sync system
  const {
    isOnline,
    syncStatus,
    pendingCount,
    queueChange,
    syncPendingChanges,
    syncProgress,
    getStats: getCacheStats
  } = useOfflineSync();

  // Batch selection and processing
  const batchSelection = useBatchSelection();
  const [batchProcessor] = useState(() => BatchAIProcessor.create({
    rateLimitMs: 500, // 2 requests per second
    maxRetries: 3,
    onProgress: (progress) => {
      setBatchProgress(progress);
    },
    onComplete: (progress) => {
      toast.success(`Batch processing completed: ${progress.succeeded} succeeded, ${progress.failed} failed`);
      setShowBatchModal(false);
    },
    onError: (error) => {
      toast.error(`Batch processing error: ${error.message}`);
      setShowBatchModal(false);
    }
  }));
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAutoConfirmSettings, setShowAutoConfirmSettings] = useState(false);

  // Auto-confirm engine
  const [autoConfirmEngine] = useState(() => new AutoConfirmEngine());

  // Realtime collaboration
  const [realtimeService] = useState(() => new RealtimeService());
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [liveUpdate, setLiveUpdate] = useState<CodeUpdateEvent | null>(null);

  // Advanced filters state
  const [filterGroup, setFilterGroup] = useState<FilterGroup>({
    logic: 'AND',
    filters: []
  });
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [advancedSearchTerm, setAdvancedSearchTerm] = useState('');
  // FUTURE: Advanced filtering engine - prepared for complex filter combinations
  const [_filterEngine] = useState(() => new FilterEngine());

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [rollbackAnswer, setRollbackAnswer] = useState<Answer | null>(null);
  const [preselectedCodes, setPreselectedCodes] = useState<string[]>([]);
  const [assignMode, setAssignMode] = useState<"overwrite" | "additional">("overwrite");
  const [localAnswers, setLocalAnswers] = useState<Answer[]>(answers);
  const [hasLocalModifications, setHasLocalModifications] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);
  const [isBulkCategorizing, setIsBulkCategorizing] = useState(false);
  const [rowAnimations, setRowAnimations] = useState<Record<number, string>>({});
  const [isCategorizingRow, setIsCategorizingRow] = useState<Record<number, boolean>>({});
  const [bulkAICategorizing, setBulkAICategorizing] = useState(false);
  const [categorizedCount, setCategorizedCount] = useState(0);
  const [categoryName, setCategoryName] = useState<string>('');

  // Row focus and keyboard shortcuts
  const [focusedRowId, setFocusedRowId] = useState<number | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    types: [] as string[],
    statuses: [] as string[],
    languages: [] as string[],
    countries: [] as string[],
    brands: [] as string[]
  });
  const [isFiltering, setIsFiltering] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [cachedCodes, setCachedCodes] = useState<Array<{ id: number; name: string }>>([]);
  const [codesPage, setCodesPage] = useState(0);
  const [hasMoreCodes, setHasMoreCodes] = useState(true);

  // Sorting state
  const [sortField, setSortField] = useState<keyof Answer | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch lock to prevent duplicate requests
  const isFetchingCodes = useRef(false);

  // Track if this is the initial mount (to apply URL filter once)
  const isInitialMount = useRef(true);

  // Use the new useFilters hook for filter state management
  const {
    rawFilters: filters,
    setFilter,
    resetFilters: resetFiltersHook
  } = useFilters({
    initialValues: {
      search: '',
      status: [],
      codes: [],
      language: '',
      country: '',
      minLength: 0,
      maxLength: 0
    },
    debounceMs: 300,
    onChange: onFiltersChange // Use the built-in onChange callback instead of separate useEffect
  });

  // Custom filter change handler that updates URL when filter changes
  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilter(key as any, value);

    // Always update URL to keep it in sync with state (two-way sync)
    const url = new URL(window.location.href);

    if (key === 'status') {
      if (Array.isArray(value) && value.length > 0) {
        // For multi-select, use the first selected status for URL
        url.searchParams.set('filter', value[0]);
      } else if (typeof value === 'string' && value) {
        // For single select (backward compatibility)
        url.searchParams.set('filter', value);
      } else {
        // Clear filter
        url.searchParams.delete('filter');
      }

      // Update URL without page reload
      window.history.replaceState({}, '', url);
      console.log('✅ Filter changed and URL updated:', { key, value });
    }
  }, [setFilter]);

  // Memoize the updateFilter function to prevent FiltersBar re-renders
  const memoizedUpdateFilter = useCallback((key: string, value: any) => {
    handleFilterChange(key, value);
  }, [handleFilterChange]);

  // Fetch category name when currentCategoryId changes
  useEffect(() => {
    if (currentCategoryId) {
      const fetchCategoryName = async () => {
        const { data, error } = await supabase
          .from('categories')
          .select('name')
          .eq('id', currentCategoryId)
          .single();

        if (!error && data) {
          setCategoryName(data.name);
          // Set document title
          document.title = `${data.name} - Coding`;
        }
      };
      fetchCategoryName();
    } else {
      setCategoryName('');
      document.title = 'Coding & AI Categorization Dashboard';
    }
  }, [currentCategoryId]);


  // Apply URL filter parameter on initial mount only
  useEffect(() => {
    if (!isInitialMount.current) {
      console.log('⏭️  Skipping URL filter application (already applied)');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter');

    if (filterParam) {
      console.log('🔍 Applying initial filter from URL (ONCE):', filterParam);

      // Apply filter automatically - all filters now go to 'status'
      setFilter('status', [filterParam]); // Set as array for multi-select
    }

    // Mark that initial mount is complete
    isInitialMount.current = false;
    console.log('✅ Initial mount complete, URL filter applied');
  }, []); // Empty deps = run once on mount only

  // Fetch filter options for current category (optimized via RPC)
  useEffect(() => {
    if (currentCategoryId) {
      const fetchFilterOptions = async () => {
        try {
          console.log('Fetching filter options for category via RPC:', currentCategoryId);

          const { data, error } = await supabase
            .rpc('get_filter_options', { p_category_id: currentCategoryId });

          if (error) {
            console.error('Error fetching filter options (RPC):', error);
            return;
          }

          if (data && data.length > 0) {
            const row = data[0] as any;
            console.log('🔍 RPC get_filter_options result:', row);

            // Use hardcoded statuses since RPC returns null
            const hardcodedStatuses = ['uncategorized', 'whitelist', 'blacklist', 'categorized', 'global_blacklist', 'ignored', 'other'];

            const filterOptions = {
              types: (row.types || []).filter(Boolean),
              statuses: row.statuses ? (row.statuses || []).filter(Boolean) : hardcodedStatuses,
              languages: (row.languages || []).filter(Boolean),
              countries: (row.countries || []).filter(Boolean),
              brands: []
            };
            console.log('🔍 Processed filter options:', filterOptions);
            setFilterOptions(filterOptions);
          } else {
            console.log('🔍 No data returned from get_filter_options RPC');
            // Use hardcoded options as fallback
            const hardcodedStatuses = ['uncategorized', 'whitelist', 'blacklist', 'categorized', 'global_blacklist', 'ignored', 'other'];
            setFilterOptions({
              types: [],
              statuses: hardcodedStatuses,
              languages: [],
              countries: [],
              brands: []
            });
          }
        } catch (error) {
          console.error('Error fetching filter options (RPC):', error);
        }
      };
      fetchFilterOptions();
    }
  }, [currentCategoryId]);

  // Fetch and cache codes for current category (with pagination for large datasets)
  useEffect(() => {
    if (!currentCategoryId) {
      setCachedCodes([]);
      setCodesPage(0);
      setHasMoreCodes(true);
      return;
    }

    // Prevent duplicate fetch with lock
    if (isFetchingCodes.current) {
      console.log('⏭️  CodingGrid: Already fetching codes, skipping duplicate request');
      return;
    }

    const cacheKey = `codes_${currentCategoryId}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const parsedCodes = JSON.parse(cached);
        setCachedCodes(parsedCodes);
        console.log(`✅ CodingGrid: Loaded ${parsedCodes.length} codes from cache for category ${currentCategoryId}`);
        setHasMoreCodes(false); // Already have all from cache
        return;
      } catch (error) {
        console.error('❌ CodingGrid: Error parsing cached codes:', error);
        localStorage.removeItem(cacheKey);
      }
    }

    // No cache - fetch from Supabase with pagination
    const loadCodes = async () => {
      isFetchingCodes.current = true;
      setLoadingCodes(true);
      const PAGE_SIZE = 1000;

      try {
        const { data, error } = await supabase
          .from('codes_categories')
          .select(`
            codes (
              id,
              name
            )
          `)
          .eq('category_id', currentCategoryId)
          .range(0, PAGE_SIZE - 1);

        if (!error && data) {
          const codes = data
            .map(item => item.codes)
            .filter(Boolean)
            .flat() as Array<{ id: number; name: string }>;

          const sortedCodes = codes.sort((a, b) => a.name.localeCompare(b.name));

          setCachedCodes(sortedCodes);
          setHasMoreCodes(data.length === PAGE_SIZE);

          // Cache only if we got all codes (less than PAGE_SIZE means end)
          if (data.length < PAGE_SIZE) {
            localStorage.setItem(cacheKey, JSON.stringify(sortedCodes));
            console.log(`✅ CodingGrid: Loaded and cached ${sortedCodes.length} codes for category ${currentCategoryId}`);
          } else {
            console.log(`✅ CodingGrid: Loaded ${sortedCodes.length} codes (page 1), more available`);
          }
        }
      } catch (error) {
        console.error('❌ CodingGrid: Error loading codes:', error);
      } finally {
        setLoadingCodes(false);
        isFetchingCodes.current = false; // Release lock
      }
    };

    loadCodes();
  }, [currentCategoryId]);

  // Reload codes (force refresh, clear cache, reset pagination)
  const handleReloadCodes = async () => {
    if (!currentCategoryId) return;

    // Prevent reload if already fetching
    if (isFetchingCodes.current) {
      console.log('⏭️  CodingGrid: Already fetching codes, skipping reload');
      return;
    }

    // Clear cache
    const cacheKey = `codes_${currentCategoryId}`;
    localStorage.removeItem(cacheKey);

    // Reset state
    setCachedCodes([]);
    setCodesPage(0);
    setHasMoreCodes(true);

    // Fetch fresh data
    isFetchingCodes.current = true;
    setLoadingCodes(true);
    const PAGE_SIZE = 1000;

    try {
      const { data, error } = await supabase
        .from('codes_categories')
        .select(`
          codes (
            id,
            name
          )
        `)
        .eq('category_id', currentCategoryId)
        .range(0, PAGE_SIZE - 1);

      if (!error && data) {
        const codes = data
          .map(item => item.codes)
          .filter(Boolean)
          .flat() as Array<{ id: number; name: string }>;

        const sortedCodes = codes.sort((a, b) => a.name.localeCompare(b.name));

        setCachedCodes(sortedCodes);
        setHasMoreCodes(data.length === PAGE_SIZE);

        // Cache if complete dataset
        if (data.length < PAGE_SIZE) {
          localStorage.setItem(cacheKey, JSON.stringify(sortedCodes));
        }

        console.log(`✅ CodingGrid: Reloaded ${sortedCodes.length} codes for category ${currentCategoryId} (fresh from DB)`);
      }
    } catch (error) {
      console.error('❌ CodingGrid: Error reloading codes:', error);
    } finally {
      setLoadingCodes(false);
      isFetchingCodes.current = false; // Release lock
    }
  };

  // Load more codes (lazy loading for large datasets)
  const loadMoreCodes = async () => {
    if (!currentCategoryId || loadingCodes || !hasMoreCodes) return;

    setLoadingCodes(true);
    const PAGE_SIZE = 1000;
    const nextPage = codesPage + 1;

    try {
      const { data, error } = await supabase
        .from('codes_categories')
        .select(`
          codes (
            id,
            name
          )
        `)
        .eq('category_id', currentCategoryId)
        .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1);

      if (!error && data) {
        const codes = data
          .map(item => item.codes)
          .filter(Boolean)
          .flat() as Array<{ id: number; name: string }>;

        const sortedCodes = codes.sort((a, b) => a.name.localeCompare(b.name));

        setCachedCodes(prev => {
          const combined = [...prev, ...sortedCodes];
          return combined.sort((a, b) => a.name.localeCompare(b.name));
        });

        setCodesPage(nextPage);
        setHasMoreCodes(data.length === PAGE_SIZE);

        console.log(`✅ Loaded page ${nextPage + 1} with ${sortedCodes.length} more codes`);
      }
    } catch (error) {
      console.error('Error loading more codes:', error);
    } finally {
      setLoadingCodes(false);
    }
  };

  // Debounced search for performance
  const debouncedSearch = useDebounce(filters.search, 250);

  // Memoized filtered answers for performance with large datasets
  const filteredAnswers = useMemo(() => {
    return answers.filter(answer => {
      // Status filter (use general_status, not quick_status) - now includes all type options
      if (filters.status.length > 0) {
        const answerStatus = answer.general_status || '';
        const isMatched = filters.status.some(filterStatus =>
          filterStatus.toLowerCase() === answerStatus.toLowerCase()
        );
        if (!isMatched) {
          return false;
        }
      }
      // Language filter
      if (filters.language && answer.language !== filters.language) {
        return false;
      }
      // Country filter
      if (filters.country && answer.country !== filters.country) {
        return false;
      }
      // Code search filter
      if (filters.codes.length > 0 && answer.selected_code) {
        const hasCode = filters.codes.some(code =>
          answer.selected_code?.toLowerCase().includes(code.toLowerCase())
        );
        if (!hasCode) return false;
      }
      // Answer search filter (debounced)
      if (debouncedSearch && answer.answer_text && !answer.answer_text.toLowerCase().includes(debouncedSearch.toLowerCase())) {
        return false;
      }
      // Length filters
      if (filters.minLength > 0 && answer.answer_text && answer.answer_text.length < filters.minLength) {
        return false;
      }
      if (filters.maxLength > 0 && answer.answer_text && answer.answer_text.length > filters.maxLength) {
        return false;
      }
      return true;
    });
  }, [answers, filters.status, filters.language, filters.country, filters.codes, filters.minLength, filters.maxLength, debouncedSearch]);

  // Handle sorting
  const handleSort = (field: keyof Answer) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 🚀 FIX: Memoize sorting and advanced filtering to prevent infinite loop
  // This was causing "Maximum update depth exceeded" because the array
  // was recreated on every render, triggering the useEffect below infinitely
  const sortedAndFilteredAnswers = useMemo(() => {
    console.log('🔄 Recalculating sorted and filtered answers...');

    let results = [...filteredAnswers];

    // Apply advanced filters
    if (filterGroup.filters.length > 0) {
      results = results.filter(answer => {
        const filterResults = filterGroup.filters.map(filter => {
          // Map filter field to answer property
          let fieldValue: any;
          switch (filter.field) {
            case 'text':
              fieldValue = answer.answer_text;
              break;
            case 'code':
              fieldValue = answer.selected_code;
              break;
            case 'status':
              fieldValue = answer.general_status;
              break;
            case 'date':
              fieldValue = answer.coding_date || answer.created_at;
              break;
            case 'category':
              fieldValue = answer.category_id;
              break;
            case 'assignedBy':
              fieldValue = answer.confirmed_by;
              break;
            default:
              fieldValue = null;
          }

          switch (filter.operator) {
            case 'contains':
              return String(fieldValue || '').toLowerCase().includes(String(filter.value).toLowerCase());
            case 'equals':
              return fieldValue === filter.value;
            case 'startsWith':
              return String(fieldValue || '').toLowerCase().startsWith(String(filter.value).toLowerCase());
            case 'endsWith':
              return String(fieldValue || '').toLowerCase().endsWith(String(filter.value).toLowerCase());
            default:
              return true;
          }
        });

        return filterGroup.logic === 'AND'
          ? filterResults.every(r => r)
          : filterResults.some(r => r);
      });
    }

    // Apply advanced search term
    if (advancedSearchTerm) {
      results = results.filter(answer =>
        answer.answer_text?.toLowerCase().includes(advancedSearchTerm.toLowerCase()) ||
        answer.selected_code?.toLowerCase().includes(advancedSearchTerm.toLowerCase())
      );
    }

    // Sort results
    return results.sort((a, b) => {
      if (!sortField) return 0;

      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [filteredAnswers, sortField, sortOrder, filterGroup, advancedSearchTerm]); // ✅ Stable dependencies + advanced filters

  // 🚀 FIX: Now safe because sortedAndFilteredAnswers is memoized
  // Only update local answers when we don't have optimistic updates pending
  useEffect(() => {
    if (!hasLocalModifications) {
      console.log('📊 Syncing local answers with sorted/filtered data');
      setLocalAnswers(sortedAndFilteredAnswers);
    }
  }, [sortedAndFilteredAnswers, hasLocalModifications]);

  // Apply filters function (manual trigger)
  function applyFilters() {
    setIsFiltering(true);
    setLocalAnswers(filteredAnswers);

    // Notify parent component about filter changes
    if (onFiltersChange) {
      onFiltersChange(filters);
    }

    setTimeout(() => setIsFiltering(false), 300);
  }

  function resetFilters() {
    resetFiltersHook();
    // Notify parent about filter reset
    if (onFiltersChange) {
      onFiltersChange({
        search: '',
        status: [],
        codes: [],
        language: '',
        country: '',
        minLength: 0,
        maxLength: 0
      });
    }
  }

  function reloadCategoryData() {
    if (!currentCategoryId) return;

    console.log('🔄 Reloading category data for:', currentCategoryId);

    // Invalidate React Query cache to force fresh fetch
    setIsFiltering(true);
    queryClient.invalidateQueries({
      queryKey: ['answers', currentCategoryId]
    });

    // Also trigger parent refetch if available
    if (onCodingStart) {
      onCodingStart(currentCategoryId);
    }

    setTimeout(() => setIsFiltering(false), 1000);
  }

  // Status mapping for Quick Status buttons
  const statusMap = {
    Oth: { label: "other", color: "bg-purple-500" },
    Ign: { label: "ignored", color: "bg-orange-500" },
    gBL: { label: "global_blacklist", color: "bg-red-600" },
    BL: { label: "blacklist", color: "bg-rose-700" },
    C: { label: "whitelist", color: "bg-green-600" },
  };

  // Action mapping for bulk operations
  const actionMap = {
    "Add to the Global Blacklist": "global_blacklist",
    "Add to the Blacklist": "blacklist",
    "Add to the Ignored": "ignored",
    "Add to the Other": "other",
    "Add to the Whitelist": "whitelist",
    "Confirm Categorized items": "categorized",
    "Roll back Confirmations": "uncategorized",
  };

  const availableActions = [
    "Add to the Global Blacklist",
    "Add to the Blacklist",
    "Add to the Ignored",
    "Add to the Other",
    "Add to the Whitelist",
    "Assign a Code (additional)",
    "Assign a Code (overwrite)",
    "Confirm Categorized items",
    "Roll back Confirmations",
    "Send to GPT for categorization"
  ];

  // Sync local answers with props (but don't override if we have local modifications)
  useEffect(() => {
    if (!hasLocalModifications) {
      setLocalAnswers(answers);
    }
  }, [answers, hasLocalModifications]);

  // NOTE: Status is now managed directly by SelectCodeModal when saving codes
  // No automatic status sync needed - it's handled explicitly on save

  // Dynamic cell padding based on density
  const cellPad = density === 'compact' ? 'px-2 py-1' : 'px-3 py-2';

  // Trigger row animation
  function triggerRowAnimation(id: number, animationClass: string) {
    setRowAnimations(prev => ({ ...prev, [id]: animationClass }));
    setTimeout(() => {
      setRowAnimations(prev => ({ ...prev, [id]: '' }));
    }, 800);
  }

  // 🚀 FIX: Memoize checkbox handler to prevent recreation
  const handleCheckboxChange = useCallback((answerId: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, answerId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== answerId));
    }
  }, []); // No dependencies - uses setter function

  // 🚀 FIX: Memoize select all handler
  // TODO: Integrate with bulk selection UI
  const _handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(localAnswers.map(answer => answer.id));
    } else {
      setSelectedIds([]);
    }
  }, [localAnswers]); // Depends on localAnswers

  // Apply bulk action
  async function applyBulkAction() {
    if (selectedIds.length === 0 || !selectedAction) return;

    setIsApplying(true);

    try {
      if (selectedAction.includes("Assign a Code")) {
        // Handle code assignment - open modal
        const isOverwrite = selectedAction === 'Assign a Code (overwrite)';
        setAssignMode(isOverwrite ? 'overwrite' : 'additional');
        // Clear preselected codes for bulk action
        setPreselectedCodes([]);
        setSelectedAnswer(null);
        setModalOpen(true);
      } else if (actionMap[selectedAction as keyof typeof actionMap]) {
        // Handle status updates
        const newStatus = actionMap[selectedAction as keyof typeof actionMap];

        const update = {
          general_status: newStatus,
          coding_date: new Date().toISOString()
        };

        const { error } = await supabase
          .from('answers')
          .update(update)
          .in('id', selectedIds);

        if (error) throw error;

        // Update local state
        setLocalAnswers(prev => prev.map(answer =>
          selectedIds.includes(answer.id)
            ? { ...answer, general_status: newStatus as any, coding_date: new Date().toISOString() }
            : answer
        ));

        // Add blink effect to updated rows
        selectedIds.forEach(id => {
          triggerRowAnimation(id, "animate-pulse bg-green-600/20 transition duration-700");
        });
      }

      // Reset selection
      setSelectedIds([]);
      setSelectedAction('');
    } catch (error) {
      console.error('Error applying bulk action:', error);
    } finally {
      setIsApplying(false);
    }
  }


  // Handle Quick Status button clicks
  async function handleQuickStatus(answer: Answer, key: keyof typeof statusMap) {
    const { label: newStatus } = statusMap[key];

    // Get current answer from local state
    const currentAnswer = localAnswers.find(a => a.id === answer.id) || answer;

    // Find all duplicates
    const duplicateIds = findDuplicateAnswers(answer, localAnswers);
    const totalCount = duplicateIds.length + 1; // Include the clicked answer
    const allIds = [answer.id, ...duplicateIds];

    console.log(`🔄 Updating ${totalCount} answer${totalCount > 1 ? 's' : ''} (including duplicates)`);

    // Capture previous state for undo
    const previousState: Record<number, any> = {};
    allIds.forEach(id => {
      const ans = localAnswers.find(a => a.id === id);
      if (ans) {
        previousState[id] = {
          general_status: ans.general_status,
          quick_status: ans.quick_status,
          selected_code: ans.selected_code,
          coding_date: ans.coding_date,
        };
      }
    });

    // Optimistic update - update ALL duplicates immediately
    const optimisticUpdate: any = {
      general_status: newStatus as any,
      coding_date: new Date().toISOString()
    };

    if (key === 'C') {
      optimisticUpdate.quick_status = 'Confirmed';
    }
    if (key === 'gBL') {
      optimisticUpdate.selected_code = null; // Clear code for global blacklist
    }

    // Update local state for ALL affected answers
    setLocalAnswers(prev => prev.map(a =>
      allIds.includes(a.id) ? { ...a, ...optimisticUpdate } : a
    ));

    // Trigger animation for all affected rows
    allIds.forEach(id => {
      triggerRowAnimation(id, "animate-pulse bg-green-600/20 transition duration-700");
    });

    // Show toast with count
    if (totalCount > 1) {
      toast.success(
        `Applied to ${totalCount} identical answers`,
        {
          description: `Updated "${answer.answer_text.substring(0, 50)}${answer.answer_text.length > 50 ? '...' : ''}"`,
        }
      );
    }

    // Save to Supabase or queue for offline sync
    try {
      const update: any = {
        general_status: newStatus,
        coding_date: new Date().toISOString()
      };
      if (key === 'C') {
        update.quick_status = 'Confirmed';
      }
      if (key === 'gBL') {
        update.selected_code = null;
      }

      let saveSuccess = false;

      if (isOnline) {
        // Try direct Supabase update when online
        const { error } = await supabase
          .from('answers')
          .update(update)
          .in('id', allIds);

        if (error) {
          console.error('Error updating status:', error);
          throw error;
        }
        saveSuccess = true;
        console.log(`✅ Updated ${totalCount} answers with status: ${newStatus}`);
      } else {
        // Queue for offline sync
        await queueChange({
          action: 'update',
          table: 'answers',
          data: { ids: allIds, updates: update },
        });
        saveSuccess = true;
        console.log(`📝 Queued ${totalCount} answers for offline sync: ${newStatus}`);
      }

      if (saveSuccess) {

        // ADD TO HISTORY - only after successful database update
        const action: HistoryAction = {
          id: `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'status_change',
          timestamp: Date.now(),
          description: `Set ${totalCount} answer${totalCount > 1 ? 's' : ''} to ${newStatus}`,
          answerIds: allIds,
          previousState,
          newState: allIds.reduce((acc, id) => {
            acc[id] = optimisticUpdate;
            return acc;
          }, {} as Record<number, any>),
          undo: async () => {
            // Revert to previous state
            console.log(`⏪ Reverting ${totalCount} answers to previous state`);

            // Update local state
            setLocalAnswers(prev => prev.map(a => {
              const revert = previousState[a.id];
              return revert ? { ...a, ...revert } : a;
            }));

            // Update database
            for (const [id, state] of Object.entries(previousState)) {
              const { error } = await supabase
                .from('answers')
                .update(state)
                .eq('id', parseInt(id));

              if (error) {
                console.error(`Failed to revert answer ${id}:`, error);
                throw error;
              }
            }
          },
          redo: async () => {
            // Re-apply changes
            console.log(`⏩ Re-applying ${totalCount} answers to ${newStatus}`);

            // Update local state
            setLocalAnswers(prev => prev.map(a =>
              allIds.includes(a.id) ? { ...a, ...optimisticUpdate } : a
            ));

            // Update database
            const { error } = await supabase
              .from('answers')
              .update(update)
              .in('id', allIds);

            if (error) {
              console.error('Failed to redo status update:', error);
              throw error;
            }
          },
        };

        addAction(action);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setLocalAnswers(prev => prev.map(a =>
        allIds.includes(a.id) ? (a.id === answer.id ? currentAnswer : a) : a
      ));
      toast.error('Failed to update status');
    }
  }


  // Open modal for code selection
  function openCodeModal(answer: Answer) {
    console.log('🔍 Opening modal for answer:', {
      id: answer.id,
      answer_text: answer.answer_text,
      category_id: answer.category_id,
      general_status: answer.general_status,
      selected_code: answer.selected_code
    });

    setSelectedAnswer(answer);

    // Load existing codes from answer.selected_code if they exist
    const existingCodes = answer.selected_code
      ? answer.selected_code.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    console.log('🔍 Setting preselected codes:', existingCodes);
    setPreselectedCodes(existingCodes);
    setModalOpen(true);

    // Notify parent about coding start with category ID
    if (onCodingStart) {
      onCodingStart(answer.category_id || undefined);
    }
  }

  /**
   * Handle keyboard shortcuts for fast coding
   */
  const handleKeyboardShortcut = useCallback(
    async (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if no row is focused
      if (!focusedRowId) return;

      // Find the focused answer
      const focusedAnswer = localAnswers.find(a => a.id === focusedRowId);
      if (!focusedAnswer) return;

      const key = event.key.toLowerCase();

      // Handle undo/redo shortcuts (Ctrl+Z / Ctrl+Shift+Z)
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          // Ctrl+Shift+Z = Redo
          console.log('⌨️ Shortcut: Ctrl+Shift+Z (Redo)');
          redo();
        } else {
          // Ctrl+Z = Undo
          console.log('⌨️ Shortcut: Ctrl+Z (Undo)');
          undo();
        }
        return;
      }

      // Prevent default for our shortcuts
      const ourShortcuts = ['b', 'c', 'o', 'i', 'g', 'a', 's', '?'];
      if (ourShortcuts.includes(key)) {
        event.preventDefault();
      }

      switch (key) {
        case 'b':
          // Blacklist
          console.log('⌨️ Shortcut: B (Blacklist)');
          handleQuickStatus(focusedAnswer, 'BL');
          break;

        case 'c':
          // Confirmed/Whitelist with smart AI acceptance
          console.log('⌨️ Shortcut: C (Confirmed)');

          // Check if answer has AI suggestions
          const hasAISuggestion =
            focusedAnswer.ai_suggestions?.suggestions &&
            focusedAnswer.ai_suggestions.suggestions.length > 0;

          if (hasAISuggestion) {
            // Accept top AI suggestion
            const topSuggestion = focusedAnswer.ai_suggestions!.suggestions[0];
            console.log('✨ Auto-accepting AI suggestion:', topSuggestion.code_name);

            handleAcceptSuggestion(focusedAnswer.id, topSuggestion);
          } else {
            // Just mark as confirmed/whitelist
            handleQuickStatus(focusedAnswer, 'C');
          }
          break;

        case 'o':
          // Other
          console.log('⌨️ Shortcut: O (Other)');
          handleQuickStatus(focusedAnswer, 'Oth');
          break;

        case 'i':
          // Ignored
          console.log('⌨️ Shortcut: I (Ignored)');
          handleQuickStatus(focusedAnswer, 'Ign');
          break;

        case 'g':
          // Global Blacklist
          console.log('⌨️ Shortcut: G (Global Blacklist)');
          handleQuickStatus(focusedAnswer, 'gBL');
          break;

        case 'a':
          // Run AI categorization
          console.log('⌨️ Shortcut: A (AI Categorize)');
          handleSingleAICategorize(focusedAnswer.id);
          break;

        case 's':
          // Open code selection modal
          console.log('⌨️ Shortcut: S (Select Code)');
          openCodeModal(focusedAnswer);
          break;

        case '?':
          // Toggle shortcuts help
          setShowShortcutsHelp(prev => !prev);
          break;

        case 'arrowdown':
          // Navigate to next row
          event.preventDefault();
          const currentIndex = localAnswers.findIndex(a => a.id === focusedRowId);
          if (currentIndex < localAnswers.length - 1) {
            setFocusedRowId(localAnswers[currentIndex + 1].id);
          }
          break;

        case 'arrowup':
          // Navigate to previous row
          event.preventDefault();
          const prevIndex = localAnswers.findIndex(a => a.id === focusedRowId);
          if (prevIndex > 0) {
            setFocusedRowId(localAnswers[prevIndex - 1].id);
          }
          break;

        case 'escape':
          // Clear focus
          setFocusedRowId(null);
          break;
      }
    },
    [focusedRowId, localAnswers, undo, redo, handleQuickStatus, openCodeModal, setShowShortcutsHelp, setFocusedRowId]
  );

  // Setup keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [handleKeyboardShortcut]);

  // Auto-save every 5 seconds when there are local modifications
  useEffect(() => {
    if (!hasLocalModifications || localAnswers.length === 0) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        console.log('💾 Auto-save: Checking for changes to save...');

        // Check if there are any pending changes
        const stats = await getCacheStats();
        if (stats.unsyncedChanges > 0) {
          console.log(`💾 Auto-save: Found ${stats.unsyncedChanges} pending changes, syncing...`);
          await syncPendingChanges();
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    }, 5000); // Auto-save every 5 seconds

    return () => clearInterval(autoSaveInterval);
  }, [hasLocalModifications, localAnswers.length, syncPendingChanges]);

  // Load filter presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('filterPresets');
    if (saved) {
      try {
        const presets = JSON.parse(saved);
        setFilterPresets(presets);
        console.log(`✅ Loaded ${presets.length} filter presets`);
      } catch (error) {
        console.error('Failed to load filter presets:', error);
      }
    }
  }, []);

  // Initialize realtime collaboration
  useEffect(() => {
    if (!currentCategoryId) return;

    const initRealtime = async () => {
      try {
        // Generate user name (could be from auth system)
        const userName = `User-${Math.random().toString(36).substring(7)}`;
        const userId = `user-${Date.now()}`;

        await realtimeService.joinProject(
          currentCategoryId,
          userId,
          userName
        );

        // Setup presence updates
        realtimeService.onPresenceUpdate((users) => {
          setOnlineUsers(users);
          console.log(`👥 Online users updated: ${users.length} users`);
        });

        // Setup code update notifications
        realtimeService.onCodeUpdateReceived((update) => {
          console.log('📡 Received live code update:', update);
          setLiveUpdate(update);

          // Update local answers if affected
          setLocalAnswers(prev => prev.map(a =>
            a.id === update.answerId
              ? { ...a, selected_code: update.action === 'add' ? update.codeName : null }
              : a
          ));

          // Clear notification after 4 seconds
          setTimeout(() => setLiveUpdate(null), 4000);
        });

        console.log('✅ Realtime collaboration initialized');
      } catch (error) {
        console.error('❌ Failed to initialize realtime:', error);
      }
    };

    initRealtime();

    return () => {
      realtimeService.leave();
    };
  }, [currentCategoryId]);

  // Update current answer in realtime when focused row changes
  useEffect(() => {
    if (focusedRowId) {
      realtimeService.updateCurrentAnswer(focusedRowId);
    }
  }, [focusedRowId]);

  // Save filter preset
  const handleSavePreset = useCallback((name: string) => {
    const preset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      filterGroup: { ...filterGroup },
      createdAt: new Date().toISOString()
    };
    const newPresets = [...filterPresets, preset];
    setFilterPresets(newPresets);
    localStorage.setItem('filterPresets', JSON.stringify(newPresets));
    toast.success(`Filter preset "${name}" saved!`);
    console.log(`💾 Saved filter preset: ${name}`);
  }, [filterGroup, filterPresets]);

  // Load filter preset
  const handleLoadPreset = useCallback((preset: FilterPreset) => {
    setFilterGroup(preset.filterGroup);
    toast.success(`Loaded preset: ${preset.name}`);
    console.log(`📂 Loaded filter preset: ${preset.name}`);
  }, []);

  // Delete filter preset
  const handleDeletePreset = useCallback((presetId: string) => {
    const newPresets = filterPresets.filter(p => p.id !== presetId);
    setFilterPresets(newPresets);
    localStorage.setItem('filterPresets', JSON.stringify(newPresets));
    toast.success('Filter preset deleted');
    console.log(`🗑️  Deleted filter preset`);
  }, [filterPresets]);

  // Handle code click - check whitelist status first
  function handleCodeClick(answer: Answer) {
    if (answer.general_status === 'whitelist') {
      // Show rollback modal for whitelisted records
      setRollbackAnswer(answer);
      setRollbackModalOpen(true);
      return;
    }

    // Normal behavior for non-whitelisted records
    openCodeModal(answer);
  }

  // Handle AI categorization request
  // TODO: Integrate this with the AI categorization UI button
  const _handleAICategorize = (answerId: number) => {
    categorizeAnswer(answerId);
  };

  // Handle accepting AI suggestion
  const handleAcceptSuggestion = (answerId: number, suggestion: { code_id: string; code_name: string; confidence: number; reasoning: string }) => {
    // Use the React Query hook for better state management
    acceptSuggestion({
      answerId,
      codeId: suggestion.code_id,
      codeName: suggestion.code_name,
      confidence: suggestion.confidence,
    });

    // Update local state immediately for optimistic UI
    setLocalAnswers(prev => prev.map(a =>
      a.id === answerId
        ? {
            ...a,
            selected_code: suggestion.code_name,
            quick_status: 'Confirmed',
            general_status: 'whitelist',
            coding_date: new Date().toISOString()
          }
        : a
    ));

    // Show success animation
    setRowAnimations(prev => ({ ...prev, [answerId]: 'animate-flash-ok' }));
    setTimeout(() => {
      setRowAnimations(prev => {
        const newAnimations = { ...prev };
        delete newAnimations[answerId];
        return newAnimations;
      });
    }, 1500);
  };

  // Handle removing/dismissing AI suggestion
  const handleRemoveSuggestion = async (answerId: number) => {
    try {
      console.log(`🗑️ Removing AI suggestion for answer ${answerId}`);

      const { error } = await supabase
        .from('answers')
        .update({
          ai_suggestions: null,
          ai_suggested_code: null
        })
        .eq('id', answerId);

      if (error) {
        console.error('Error removing suggestion:', error);
        alert(`Failed to remove suggestion: ${error.message}`);
        return;
      }

      // Update local state
      setLocalAnswers(prev => prev.map(a =>
        a.id === answerId
          ? {
              ...a,
              ai_suggestions: null,
              ai_suggested_code: null
            }
          : a
      ));

      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['answers'] });

      console.log(`✅ AI suggestion removed for answer ${answerId}`);
    } catch (error) {
      console.error('Error removing suggestion:', error);
      alert('Failed to remove suggestion');
    }
  };

  // Handle regenerating AI suggestions (force new suggestions)
  const handleRegenerateSuggestions = (answerId: number) => {
    console.log(`🔄 Regenerating AI suggestions for answer ${answerId}`);

    // First clear existing suggestions
    setLocalAnswers(prev => prev.map(a =>
      a.id === answerId
        ? { ...a, ai_suggestions: null, ai_suggested_code: null }
        : a
    ));

    // Then request new categorization
    categorizeAnswer(answerId);
  };

  // Handle bulk AI categorization (for selected answers)
  const handleBulkAICategorize = async () => {
    if (selectedIds.length === 0) return;

    console.log(`🤖 Starting bulk AI categorization for ${selectedIds.length} answers`);

    setIsBulkCategorizing(true);

    try {
      const results = await batchCategorizeAsync(selectedIds);

      console.log(`✅ Bulk categorization complete:`, results);

      // Clear selection
      setSelectedIds([]);
      setSelectedAction('');

    } catch (error) {
      console.error('Bulk categorization error:', error);
    } finally {
      setIsBulkCategorizing(false);
    }
  };

  // Handle batch AI processing (new batch system)
  const handleBatchAI = async () => {
    if (batchSelection.selectedCount === 0) {
      toast.error('No answers selected');
      return;
    }

    if (!currentCategoryId) {
      toast.error('No category selected');
      return;
    }

    const confirmed = confirm(
      `Process ${batchSelection.selectedCount} answers with AI? This may take several minutes.`
    );

    if (!confirmed) return;

    try {
      setShowBatchModal(true);
      await batchProcessor.startBatch(
        Array.from(batchSelection.selectedIds).map(id => parseInt(id)),
        currentCategoryId
      );
    } catch (error) {
      console.error('Batch AI processing error:', error);
      toast.error('Failed to start batch processing');
      setShowBatchModal(false);
    }
  };

  // Handle single answer AI categorization (from row button)
  const handleSingleAICategorize = (answerId: number) => {
    console.log(`✨ AI categorizing single answer: ${answerId}`);
    setIsCategorizingRow(prev => ({ ...prev, [answerId]: true }));

    try {
      categorizeAnswer(answerId, {
        onSuccess: () => {
          console.log(`✅ AI categorization complete for answer ${answerId}`);
          setIsCategorizingRow(prev => ({ ...prev, [answerId]: false }));
        },
        onError: (error: any) => {
          console.error(`❌ AI categorization failed for answer ${answerId}:`, error);
          setIsCategorizingRow(prev => ({ ...prev, [answerId]: false }));
        }
      });
    } catch (error) {
      console.error(`❌ Error initiating AI categorization for answer ${answerId}:`, error);
      setIsCategorizingRow(prev => ({ ...prev, [answerId]: false }));
    }
  };

  // Handle bulk AI categorization for ALL VISIBLE answers (from header button)
  const handleBulkAICategorizeVisible = async () => {
    const visibleAnswers = localAnswers;
    const visibleCount = visibleAnswers.length;

    if (visibleCount === 0) {
      console.log('⚠️  No visible answers to categorize');
      return;
    }

    const confirmed = window.confirm(
      `AI categorize ${visibleCount} visible answer${visibleCount > 1 ? 's' : ''}?\n\nThis will generate AI suggestions for all visible answers.`
    );

    if (!confirmed) {
      console.log('❌ Bulk AI categorization cancelled');
      return;
    }

    console.log(`✨ Starting bulk AI categorization for ${visibleCount} visible answers`);
    setBulkAICategorizing(true);
    setCategorizedCount(0);

    try {
      // Use batchCategorizeAsync for bulk operation
      await batchCategorizeAsync(visibleAnswers.map(a => a.id));

      console.log(`✅ Bulk AI categorization complete: ${visibleCount} answers`);

      // Invalidate cache to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['answers'] });
    } catch (error) {
      console.error('❌ Bulk AI categorization failed:', error);
    } finally {
      setBulkAICategorizing(false);
      setCategorizedCount(0);
    }
  };

  // 🧩 Handle rollback only (unconfirm record and clear codes)
  async function handleRollback() {
    if (!rollbackAnswer) return;

    const currentAnswer =
      localAnswers.find(a => a.id === rollbackAnswer.id) || rollbackAnswer;

    // 🔹 Optimistic UI update
    const optimisticUpdate = {
      ...currentAnswer,
      general_status: 'uncategorized' as any,
      selected_code: null,
      quick_status: null,
      coding_date: new Date().toISOString(),
    };

    setLocalAnswers(prev =>
      prev.map(a => (a.id === rollbackAnswer.id ? optimisticUpdate : a))
    );

    triggerRowAnimation(
      rollbackAnswer.id,
      'animate-pulse bg-orange-600/20 transition duration-700'
    );

    // 🔹 Save rollback in Supabase
    try {
      const { error } = await supabase
        .from('answers')
        .update({
          general_status: 'uncategorized',
          selected_code: null,
          quick_status: null,
          coding_date: new Date().toISOString(),
        })
        .eq('id', rollbackAnswer.id);

      if (error) {
        console.error('❌ Error rolling back:', error);
        setLocalAnswers(prev =>
          prev.map(a => (a.id === rollbackAnswer.id ? currentAnswer : a))
        );
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      setLocalAnswers(prev =>
        prev.map(a => (a.id === rollbackAnswer.id ? currentAnswer : a))
      );
    }

    // 🔹 Force fresh data from Supabase (no cache)
    try {
      const { data: refreshed, error: refError } = await supabase
        .from('answers')
        .select(
          `
        *,
        answer_codes (
          codes ( id, name )
        )
      `
        )
        .eq('id', rollbackAnswer.id)
        .single();

      if (!refError && refreshed) {
        const refreshedAnswer = {
          ...refreshed,
          selected_code:
            refreshed.answer_codes
              ?.map((ac: any) => ac.codes?.name)
              .filter(Boolean)
              .join(', ') || null,
        };

        setLocalAnswers(prev =>
          prev.map(a => (a.id === rollbackAnswer.id ? refreshedAnswer : a))
        );
      }
    } catch (err) {
      console.error('⚠️ Error refreshing answer after rollback:', err);
    }

    // ✅ Cleanup state
    setPreselectedCodes([]);
    setRollbackModalOpen(false);
    setRollbackAnswer(null);
  }

  // 🧩 Handle rollback AND edit (rollback + reopen modal)
  async function handleRollbackAndEdit() {
    if (!rollbackAnswer) return;

    const currentAnswer =
      localAnswers.find(a => a.id === rollbackAnswer.id) || rollbackAnswer;

    // 🔹 Optimistic local update
    const optimisticUpdate = {
      ...currentAnswer,
      general_status: 'uncategorized' as any,
      quick_status: null,
      coding_date: new Date().toISOString(),
    };

    setLocalAnswers(prev =>
      prev.map(a => (a.id === rollbackAnswer.id ? optimisticUpdate : a))
    );

    triggerRowAnimation(
      rollbackAnswer.id,
      'animate-pulse bg-orange-600/20 transition duration-700'
    );

    // 🔹 Save rollback change
    try {
      const { error } = await supabase
        .from('answers')
        .update({
          general_status: 'uncategorized',
          quick_status: null,
          coding_date: new Date().toISOString(),
        })
        .eq('id', rollbackAnswer.id);

      if (error) throw error;
    } catch (error) {
      console.error('❌ RollbackAndEdit failed:', error);
      return;
    }

    // 🔹 Fetch fresh codes from Supabase
    let preselected: string[] = [];
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(
          `
        id,
        answer_codes (
          codes ( name )
        )
      `
        )
        .eq('id', rollbackAnswer.id)
        .single();

      if (!error && data?.answer_codes) {
        preselected = data.answer_codes
          .map((ac: any) => ac.codes?.name)
          .filter(Boolean);
      }
    } catch (err) {
      console.error('⚠️ Error fetching codes for edit:', err);
    }

    // ✅ Cleanup before reopening
    setRollbackModalOpen(false);
    setRollbackAnswer(null);
    setPreselectedCodes(preselected);

    // 🔹 Dodajemy małe opóźnienie, by UI zdążył się odświeżyć (unikamy "migania")
    await new Promise(resolve => setTimeout(resolve, 300));

    // 🔹 Otwórz modal edycji z aktualnymi danymi
    setSelectedAnswer({
      ...rollbackAnswer,
      selected_code: preselected.join(', ') || null,
    });
    setModalOpen(true);
  }

  // Handle code saved from modal
  async function handleCodeSaved() {
    // Get all affected answer IDs (including duplicates for single answer)
    let affectedIds: number[] = [];

    if (selectedAnswer) {
      // Find duplicates for the selected answer
      const duplicateIds = findDuplicateAnswers(selectedAnswer, localAnswers);
      affectedIds = [selectedAnswer.id, ...duplicateIds];

      // Show toast if affecting multiple
      if (affectedIds.length > 1) {
        toast.info(
          `Applying to ${affectedIds.length} identical answers`,
          {
            description: `"${selectedAnswer.answer_text.substring(0, 50)}${selectedAnswer.answer_text.length > 50 ? '...' : ''}"`,
          }
        );
      }
    } else if (selectedIds.length > 0) {
      // Bulk action - already has IDs
      affectedIds = selectedIds;
    }

    // Trigger animations for the updated rows
    if (selectedIds.length > 0) {
      selectedIds.forEach(id => {
        triggerRowAnimation(id, "animate-pulse bg-green-600/20 transition duration-700");
      });

      // Reset selection
      setSelectedIds([]);
      setSelectedAction('');
    } else if (selectedAnswer) {
      // Trigger animations for all affected rows (including duplicates)
      affectedIds.forEach(id => {
        triggerRowAnimation(id, "animate-pulse bg-green-600/20 transition duration-700");
      });
    }

    // Invalidate React Query cache to refresh data
    console.log('🔄 Invalidating answers cache after code save');
    queryClient.invalidateQueries({
      queryKey: ['answers', currentCategoryId]
    });

    // Refresh the answers data to show updated codes (for local state)
    try {
      // Get the IDs of answers that were updated
      const updatedAnswerIds = selectedIds.length > 0 ? selectedIds : (selectedAnswer ? [selectedAnswer.id] : []);

      if (updatedAnswerIds.length === 0) {
        console.log("No answer IDs to refresh");
        return;
      }

      const { data: updatedAnswers, error } = await supabase
        .from('answers')
        .select(`
          *,
          answer_codes (
            codes (
              id,
              name
            )
          )
        `)
        .in('id', updatedAnswerIds);

      if (error) {
        console.error('Error refreshing answers:', error);
        return;
      }

      // Transform the data to include selected_code
      const transformedAnswers = updatedAnswers.map(answer => ({
        ...answer,
        selected_code: answer.answer_codes?.map((ac: any) => ac.codes?.name).filter(Boolean).join(', ') || null
      }));

      // Update only the specific answers in localAnswers
      // Status is already updated by SelectCodeModal, just refresh the data
      setLocalAnswers(prev =>
        prev.map(answer => {
          const updatedAnswer = transformedAnswers.find(ua => ua.id === answer.id);
          return updatedAnswer || answer;
        })
      );

      // Mark that we have local modifications
      setHasLocalModifications(true);

      console.log("✅ Updated answers with codes:", transformedAnswers);
    } catch (err) {
      console.error('Error refreshing answers:', err);
    }

    setModalOpen(false);
    setSelectedAnswer(null);
  }

  // Format date for display
  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }

  // Format time ago for AI suggestions
  function formatTimeAgo(dateString: string): string {
    const now = Date.now();
    const past = new Date(dateString).getTime();
    const diffMs = now - past;

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  // Get color classes based on AI confidence level
  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) {
      // High confidence (90-100%)
      return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700';
    }
    if (confidence >= 0.7) {
      // Medium-high confidence (70-89%)
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700';
    }
    if (confidence >= 0.5) {
      // Medium confidence (50-69%)
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700';
    }
    // Low confidence (<50%)
    return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/50 dark:text-gray-200 dark:border-gray-600';
  }

  // Get confidence label
  function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  }

  // Quick status button component
  function QuickStatusButton({
    answer,
    statusKey,
    label
  }: {
    answer: Answer;
    statusKey: keyof typeof statusMap;
    label: string;
  }) {
    const isActive = answer.general_status === statusMap[statusKey].label;
    const { color, label: fullLabel } = statusMap[statusKey];

    const handleClick = () => {
      handleQuickStatus(answer, statusKey);
    };

    const tooltips: Record<string, string> = {
      'Oth': 'Mark as Other',
      'Ign': 'Mark as Ignored',
      'gBL': 'Add to Global Blacklist',
      'BL': 'Add to Blacklist',
      'C': 'Confirm as Whitelist'
    };

    return (
      <button
        onClick={handleClick}
        title={tooltips[label] || fullLabel}
        className={clsx(
          'px-2 py-0.5 text-xs rounded-full border transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none',
          isActive
            ? `${color} text-white border-transparent`
            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 border-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600'
        )}
      >
        {label}
      </button>
    );
  }


  return (
    <div className="relative" style={{ paddingBottom: selectedIds.length > 0 ? '80px' : '0' }}>
      {/* Online Users Widget - Fixed Position */}
      {currentCategoryId && onlineUsers.length > 1 && (
        <div className="fixed top-4 right-4 z-40">
          <OnlineUsers
            users={onlineUsers}
            currentUserId={realtimeService.getStats().users.find(u => u.isOnline)?.userId || 'current'}
          />
        </div>
      )}

      {/* Live Update Notifications */}
      {liveUpdate && (
        <LiveCodeUpdate
          update={liveUpdate}
          onDismiss={() => setLiveUpdate(null)}
        />
      )}

      {/* Breadcrumbs Navigation */}
      {currentCategoryId && (
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4 px-3" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1">
                <Home size={14} />
                Categories
              </Link>
              <ChevronRight size={14} className="inline mx-1" />
              <span className="text-gray-700 dark:text-gray-200">{categoryName}</span>
              <ChevronRight size={14} className="inline mx-1" />
              <span className="text-blue-600 dark:text-blue-400 font-medium">Coding</span>
            </nav>
      )}


      {/* Filters Bar - Integrated Component */}
      {currentCategoryId && (
        <>
          <FiltersBar
          filters={filters}
          updateFilter={memoizedUpdateFilter}
          typesList={[
            { key: 'uncategorized', label: 'Not categorized' },
            { key: 'categorized', label: 'Categorized' },
            { key: 'whitelist', label: 'Whitelist' },
            { key: 'blacklist', label: 'Blacklist' },
            { key: 'global_blacklist', label: 'gBlacklist' },
            { key: 'gibberish', label: 'Gibberish' },
            { key: 'ignored', label: 'Ignored' },
            { key: 'other', label: 'Other' },
            { key: 'bad_word', label: 'Bad Word' }
          ]}
          codesList={cachedCodes.map(c => c.name)}
          statusesList={filterOptions.statuses}
          languagesList={filterOptions.languages}
          countriesList={filterOptions.countries}
          onApply={applyFilters}
          onReset={resetFilters}
          onReload={reloadCategoryData}
          isApplying={isFiltering}
          isReloading={isFiltering}
          loadingCodes={loadingCodes}
          onReloadCodes={handleReloadCodes}
          onLoadMoreCodes={loadMoreCodes}
          hasMoreCodes={hasMoreCodes}
          // Undo/Redo props
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* Advanced Filters Panel */}
        <AdvancedFiltersPanel
          filterGroup={filterGroup}
          onFilterChange={setFilterGroup}
          presets={filterPresets}
          onSavePreset={handleSavePreset}
          onLoadPreset={handleLoadPreset}
          onDeletePreset={handleDeletePreset}
          resultsCount={sortedAndFilteredAnswers.length}
          totalCount={answers.length}
          onSearchChange={setAdvancedSearchTerm}
        />
        </>
      )}

      {/* Batch Selection Toolbar */}
      {currentCategoryId && batchSelection.selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950 border-y border-blue-200 dark:border-blue-900">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {batchSelection.selectedCount} selected
          </span>

          <button
            onClick={handleBatchAI}
            disabled={batchProcessor.getProgress().status === 'running'}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Sparkles size={16} />
            Process with AI
          </button>

          <button
            onClick={() => batchSelection.selectAll(localAnswers.map(a => String(a.id)))}
            className="px-3 py-1.5 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md transition-colors"
          >
            Select All ({localAnswers.length})
          </button>

          <button
            onClick={batchSelection.clearSelection}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          >
            Clear Selection
          </button>

          <div className="ml-auto flex items-center gap-2 border-l border-blue-200 dark:border-blue-900 pl-3">
            <button
              onClick={() => setShowAutoConfirmSettings(true)}
              className="px-3 py-1.5 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors flex items-center gap-1.5"
              title="Configure AI auto-confirm settings"
            >
              <Settings size={16} />
              <span className="hidden lg:inline">Auto-Confirm</span>
            </button>

            <button
              onClick={() => setShowAnalytics(true)}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5"
            >
              <BarChart3 size={16} />
              <span className="hidden lg:inline">Analytics</span>
            </button>

            <button
              onClick={() => setShowExportImport(true)}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1.5"
            >
              <FileDown size={16} />
              <span className="hidden lg:inline">Export/Import</span>
            </button>
          </div>
        </div>
      )}

      {/* Results Counter & Shortcuts Button */}
      {currentCategoryId && (
        <div className="mb-3 px-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing <span className="font-medium text-gray-700 dark:text-gray-300">{localAnswers.length}</span> of <span className="font-medium text-gray-700 dark:text-gray-300">{answers.length}</span> answers
                {localAnswers.length !== filteredAnswers.length && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                    ({filteredAnswers.length} filtered)
                  </span>
                )}
              </p>

              {/* Sync Status Indicator */}
              <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                {syncStatus === 'offline' && (
                  <>
                    <WifiOff size={14} className="text-orange-500" />
                    <span className="text-xs text-orange-600 dark:text-orange-400">
                      Offline ({pendingCount} queued)
                    </span>
                  </>
                )}

                {syncStatus === 'syncing' && (
                  <>
                    <Loader2 size={14} className="text-blue-500 animate-spin" />
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      Syncing... ({syncProgress.current}/{syncProgress.total})
                    </span>
                  </>
                )}

                {syncStatus === 'saved' && (
                  <>
                    <Check size={14} className="text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Saved
                    </span>
                  </>
                )}

                {syncStatus === 'online' && pendingCount === 0 && (
                  <>
                    <Wifi size={14} className="text-green-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Online
                    </span>
                  </>
                )}

                {pendingCount > 0 && syncStatus !== 'syncing' && (
                  <button
                    onClick={syncPendingChanges}
                    className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Sync Now
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sortField && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Sorted by: <span className="font-medium text-gray-700 dark:text-gray-300">{sortField}</span> <span className="text-blue-600 dark:text-blue-400">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                </div>
              )}
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                title="View keyboard shortcuts (press ?)"
              >
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded text-[10px] font-mono">
                  ?
                </kbd>
                <span>Shortcuts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block relative overflow-auto max-h-[60vh]">
        <table className="w-full border-collapse min-w-[900px] xl:min-w-[1200px] 2xl:min-w-[1500px]">
          <thead className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b">
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className={`text-center ${cellPad} w-[40px] text-xs font-medium uppercase tracking-wide text-zinc-500`}>
                <div className="flex items-center justify-center">
                  {batchSelection.isAllSelected(localAnswers.map(a => String(a.id))) ? (
                    <div
                      onClick={() => batchSelection.clearSelection()}
                      title="Clear selection"
                    >
                      <CheckSquare
                        size={18}
                        className="text-blue-600 dark:text-blue-400 cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => batchSelection.selectAll(localAnswers.map(a => String(a.id)))}
                      title="Select all"
                    >
                      <Square
                        size={18}
                        className="text-gray-400 dark:text-gray-500 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('created_at')}
                className={`text-left ${cellPad} w-[120px] text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
                title="Sort by date"
              >
                Date {sortField === 'created_at' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th
                onClick={() => handleSort('language')}
                className={`text-center ${cellPad} w-[64px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden sm:table-cell cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
                title="Sort by language"
              >
                Lang {sortField === 'language' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th
                onClick={() => handleSort('answer_text')}
                className={`text-left ${cellPad} w-auto text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
                title="Sort by answer text"
              >
                Answer {sortField === 'answer_text' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th
                onClick={() => handleSort('translation_en')}
                className={`text-left ${cellPad} w-[260px] xl:w-[320px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden md:table-cell cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
                title="Sort by translation"
              >
                Translation {sortField === 'translation_en' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th className={`text-left ${cellPad} w-[220px] xl:w-[260px] text-xs font-medium uppercase tracking-wide text-zinc-500`}>
                Quick Status
              </th>
              <th className={`text-center ${cellPad} w-[60px] text-xs font-medium uppercase tracking-wide text-zinc-500`}>
                <span className="flex items-center justify-center gap-1">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  AI
                </span>
              </th>
              <th
                onClick={() => handleSort('general_status')}
                className={`text-left ${cellPad} w-[150px] text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
                title="Sort by status"
              >
                Status {sortField === 'general_status' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th className={`text-left ${cellPad} w-[240px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden md:table-cell`}>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span>AI Suggestions</span>
                  </span>
                  <button
                    onClick={handleBulkAICategorizeVisible}
                    disabled={bulkAICategorizing || localAnswers.length === 0}
                    className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={`AI categorize all ${localAnswers.length} visible answers`}
                  >
                    {bulkAICategorizing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </button>
                  {bulkAICategorizing && categorizedCount > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {categorizedCount}/{localAnswers.length}
                    </span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('selected_code')}
                className={`text-left ${cellPad} w-[220px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden md:table-cell cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
                title="Sort by code"
              >
                Code {sortField === 'selected_code' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th
                onClick={() => handleSort('coding_date')}
                className={`text-left ${cellPad} w-[150px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden lg:table-cell cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
                title="Sort by coding date"
              >
                Coding Date {sortField === 'coding_date' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
              <th
                onClick={() => handleSort('country')}
                className={`text-left ${cellPad} w-[140px] text-xs font-medium uppercase tracking-wide text-zinc-500 hidden lg:table-cell cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
                title="Sort by country"
              >
                Country {sortField === 'country' && <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </th>
            </tr>
          </thead>
          <tbody data-answer-container>
            {localAnswers.map((answer) => (
              <tr
                key={answer.id}
                data-answer-id={answer.id}
                tabIndex={0}
                onClick={(e) => {
                  // Handle batch selection
                  batchSelection.toggleSelection(String(answer.id), e);
                  setFocusedRowId(answer.id);
                }}
                onFocus={() => setFocusedRowId(answer.id)}
                className={clsx(
                  "border-b border-zinc-100 dark:border-zinc-800 transition-colors cursor-pointer relative",
                  focusedRowId === answer.id
                    ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 ring-inset"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900",
                  batchSelection.isSelected(String(answer.id)) && "bg-blue-50 dark:bg-blue-950",
                  rowAnimations[answer.id]
                )}
              >
                {/* Selection Checkbox */}
                <td className="px-2 py-1 w-8">
                  <div className="flex items-center justify-center">
                    {batchSelection.isSelected(String(answer.id)) ? (
                      <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square size={18} className="text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </td>
                {/* Checkbox */}
                <td className={`${cellPad} text-center relative`}>
                  {focusedRowId === answer.id && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r" />
                  )}
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(answer.id)}
                    onChange={(e) => handleCheckboxChange(answer.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                  />
                </td>
                {/* Date */}
                <td className={`${cellPad} text-[11px] leading-tight text-zinc-500 whitespace-nowrap`}>
                  {formatDate(answer.created_at)}
                </td>

                {/* Language */}
                <td className={`${cellPad} text-sm text-zinc-800 dark:text-zinc-100 text-center hidden sm:table-cell`}>
                  {answer.language || '—'}
                </td>

                {/* Answer */}
                <td className={`${cellPad} text-sm text-zinc-800 dark:text-zinc-100`}>
                  <div className="truncate" title={answer.answer_text}>
                    {answer.answer_text}
                  </div>
                </td>

                {/* Translation */}
                <td className={`${cellPad} hidden md:table-cell`}>
                  {answer.translation_en ? (
                    <div className="max-w-[320px] text-sm text-zinc-700 dark:text-zinc-300 truncate">
                      {answer.translation_en}
                    </div>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-300">—</span>
                  )}
                </td>

                {/* Quick Status */}
                <td className={`${cellPad}`}>
                  <div className="flex flex-wrap gap-0.5 items-center">
                    <QuickStatusButton answer={answer} statusKey="Oth" label="Oth" />
                    <QuickStatusButton answer={answer} statusKey="Ign" label="Ign" />
                    <QuickStatusButton answer={answer} statusKey="gBL" label="gBL" />
                    <QuickStatusButton answer={answer} statusKey="BL" label="BL" />
                    <QuickStatusButton answer={answer} statusKey="C" label="C" />
                  </div>
                </td>

                {/* AI Actions Column */}
                <td className={`${cellPad} text-center`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSingleAICategorize(answer.id);
                    }}
                    disabled={isCategorizingRow[answer.id] || isCategorizing}
                    className="p-1.5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center"
                    title="Generate AI suggestions for this answer (A)"
                  >
                    {isCategorizingRow[answer.id] ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="h-5 w-5" />
                    )}
                  </button>
                </td>

                {/* General Status */}
                <td className={`${cellPad}`}>
                  {answer.general_status === 'whitelist' ? (
                    <span className="px-2 py-1 rounded-md text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                      {answer.general_status}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-md text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      {answer.general_status ?? '—'}
                    </span>
                  )}
                </td>

                {/* AI Suggestions */}
                <td className={`${cellPad} hidden md:table-cell`}>
                  <div className="flex items-center gap-2 min-h-[40px]">
                    {/* AI Categorize Button */}
                    <button
                      onClick={() => handleSingleAICategorize(answer.id)}
                      disabled={isCategorizingRow[answer.id] || isCategorizing}
                      className="flex-shrink-0 p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="AI categorize this answer"
                    >
                      {isCategorizingRow[answer.id] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </button>

                    {/* AI Suggestions (if exists) */}
                    {answer.ai_suggestions && answer.ai_suggestions.suggestions && answer.ai_suggestions.suggestions.length > 0 ? (
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-1">
                        {answer.ai_suggestions.suggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className={`group relative px-2 py-1 text-xs rounded border flex items-center gap-1 ${getConfidenceColor(suggestion.confidence)}`}
                          >
                            <button
                              onClick={() => handleAcceptSuggestion(answer.id, suggestion)}
                              disabled={isAcceptingSuggestion}
                              className="flex items-center gap-1 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                              title={`Confidence: ${getConfidenceLabel(suggestion.confidence)} (${(suggestion.confidence * 100).toFixed(0)}%)\nReasoning: ${suggestion.reasoning}\nModel: ${answer.ai_suggestions?.model || 'unknown'}`}
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>{suggestion.code_name}</span>
                              <span className="text-[10px] opacity-70 ml-1">
                                {(suggestion.confidence * 100).toFixed(0)}%
                              </span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSuggestion(answer.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Dismiss suggestion"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegenerateSuggestions(answer.id);
                            }}
                            disabled={isCategorizing}
                            className="text-xs text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Regenerate AI suggestions"
                          >
                            <RotateCw className="h-3 w-3" />
                          </button>
                        </div>
                        {answer.ai_suggestions.timestamp && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                            Generated {formatTimeAgo(answer.ai_suggestions.timestamp)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </div>
                </td>

                {/* Selected Code */}
                <td className={`${cellPad} hidden md:table-cell`}>
                  {answer.general_status === 'global_blacklist' ? (
                    <div
                      className="w-full text-left px-2 py-1 text-sm border border-zinc-300 rounded bg-zinc-100 text-zinc-400 cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500"
                      title="Codes cannot be assigned to global blacklist items"
                    >
                      —
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCodeClick(answer)}
                      title={answer.selected_code ? 'Click to edit codes' : 'Click to assign codes'}
                      className={`w-full text-left px-2 py-1 text-sm border rounded transition-colors cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        answer.selected_code
                          ? 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30'
                          : 'border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {answer.selected_code || 'Click to select code...'}
                    </button>
                  )}
                </td>

                {/* Coding Date */}
                <td className={`${cellPad} hidden lg:table-cell`}>
                  <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-300 whitespace-nowrap">
                    {formatDate(answer.coding_date)}
                  </span>
                </td>

                {/* Country */}
                <td className={`${cellPad} text-sm text-zinc-800 dark:text-zinc-100 hidden lg:table-cell`}>
                  {answer.country || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 p-4">
        {localAnswers.map((answer) => (
          <div
            key={answer.id}
            data-answer-id={answer.id}
            onClick={(e) => {
              // Handle batch selection
              batchSelection.toggleSelection(String(answer.id), e);
              setFocusedRowId(answer.id);
            }}
            className={clsx(
              "rounded-xl border p-3 mb-3 transition-all cursor-pointer relative",
              focusedRowId === answer.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500"
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",
              batchSelection.isSelected(String(answer.id)) && "bg-blue-50 dark:bg-blue-950 border-blue-300",
              rowAnimations[answer.id]
            )}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-3 left-3">
              {batchSelection.isSelected(String(answer.id)) ? (
                <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" />
              ) : (
                <Square size={20} className="text-gray-400 dark:text-gray-500" />
              )}
            </div>
            {focusedRowId === answer.id && (
              <div className="mb-2 text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                <span>✓</span> Focused (use keyboard shortcuts)
              </div>
            )}
                {/* Date and Language */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">
                    {formatDate(answer.created_at)}
                  </span>
                  {answer.language && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-300">
                      {answer.language}
                    </span>
                  )}
                </div>

                {/* Answer */}
                <div className="mb-3">
                  <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
                    Answer:
                  </div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-200">
                    {answer.answer_text}
                  </div>
                </div>

            {/* Translation */}
            <div className="mb-3">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
                Translation:
              </div>
              {answer.translation_en ? (
                <div className="max-w-full text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {answer.translation_en}
                </div>
              ) : (
                <span className="text-zinc-500 dark:text-zinc-300">—</span>
              )}
            </div>

            {/* Quick Status */}
            <div className="mb-3">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-2">
                Quick Status:
              </div>
              <div className="flex flex-wrap gap-0.5 items-center">
                <QuickStatusButton answer={answer} statusKey="Oth" label="Oth" />
                <QuickStatusButton answer={answer} statusKey="Ign" label="Ign" />
                <QuickStatusButton answer={answer} statusKey="gBL" label="gBL" />
                <QuickStatusButton answer={answer} statusKey="BL" label="BL" />
                <QuickStatusButton answer={answer} statusKey="C" label="C" />
              </div>
            </div>

            {/* AI Actions - Mobile */}
            <div className="mb-3">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-2">
                AI Actions:
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSingleAICategorize(answer.id);
                }}
                disabled={isCategorizingRow[answer.id] || isCategorizing}
                className="px-3 py-2 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
                title="Generate AI suggestions for this answer"
              >
                {isCategorizingRow[answer.id] ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Categorizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span className="text-sm">Generate AI Suggestions</span>
                  </>
                )}
              </button>
            </div>

            {/* Code */}
            <div className="mb-3">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
                Code:
              </div>
              {answer.general_status === 'global_blacklist' ? (
                <div className="px-2 py-1 text-sm border border-zinc-300 rounded bg-zinc-100 text-zinc-400 cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500">
                  —
                </div>
              ) : (
                <button
                  onClick={() => handleCodeClick(answer)}
                  className={`w-full text-left px-2 py-1 text-sm border rounded transition-colors cursor-pointer ${
                    answer.selected_code
                      ? 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30'
                      : 'border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  {answer.selected_code || 'Click to select code...'}
                </button>
              )}
            </div>

            {/* General Status */}
            <div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
                Status:
              </div>
              {answer.general_status === 'whitelist' ? (
                <span className="px-2 py-1 rounded-md text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                  {answer.general_status}
                </span>
              ) : (
                <span className="px-2 py-1 rounded-md text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  {answer.general_status ?? '—'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white px-2 py-3 sm:p-4 shadow-lg z-50 max-h-32 overflow-y-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <span className="text-sm font-medium whitespace-nowrap">
                {selectedIds.length} record{selectedIds.length !== 1 ? 's' : ''} selected
              </span>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-white text-gray-900 rounded border-0 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 sm:min-w-[200px]"
                title="Select bulk action"
              >
                <option value="">Select action...</option>
                {availableActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleBulkAICategorize}
                disabled={selectedIds.length === 0 || isBulkCategorizing}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                title="AI categorize selected answers"
              >
                {isBulkCategorizing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>AI ({selectedIds.length})</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setSelectedIds([]);
                  setSelectedAction('');
                }}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-white/10 text-white rounded text-sm hover:bg-white/20 transition-colors whitespace-nowrap"
                title="Clear selection"
              >
                Clear
              </button>
              <button
                onClick={applyBulkAction}
                disabled={!selectedAction || isApplying}
                title={!selectedAction ? 'Please select an action first' : 'Apply selected action'}
                className="flex-1 sm:flex-initial px-4 py-1.5 bg-white text-blue-600 rounded font-medium text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-white/50 focus:outline-none whitespace-nowrap"
              >
                {isApplying ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Code Modal */}
      <SelectCodeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedAnswer(null);
          setPreselectedCodes([]);
          setIsApplying(false);
        }}
        selectedAnswerIds={selectedIds.length > 0 ? selectedIds : (selectedAnswer ? [selectedAnswer.id] : [])}
        allAnswers={answers}
        currentAnswerIndex={selectedAnswer ? answers.findIndex(a => a.id === selectedAnswer.id) : 0}
        preselectedCodes={preselectedCodes}
        onSaved={handleCodeSaved}
        onNavigate={(newIndex) => {
          const newAnswer = answers[newIndex];
          if (newAnswer) {
            setSelectedAnswer(newAnswer);
            setPreselectedCodes([]);
          }
        }}
        mode={assignMode}
        categoryId={currentCategoryId}
        selectedAnswer={selectedAnswer?.answer_text || ""}
      />

      {/* Rollback Modal */}
      <RollbackConfirmationModal
        open={rollbackModalOpen}
        onClose={() => {
          setRollbackModalOpen(false);
          setRollbackAnswer(null);
        }}
        record={rollbackAnswer ? {
          id: rollbackAnswer.id,
          answer_text: rollbackAnswer.answer_text,
          selected_code: rollbackAnswer.selected_code || '',
          general_status: rollbackAnswer.general_status || '',
          confirmed_by: rollbackAnswer.confirmed_by || '',
          coding_date: rollbackAnswer.coding_date || ''
        } : {
          id: 0,
          answer_text: '',
          selected_code: '',
          general_status: '',
          confirmed_by: '',
          coding_date: ''
        }}
        onRollback={handleRollback}
        onRollbackAndEdit={handleRollbackAndEdit}
      />

      {/* Keyboard Shortcuts Help Overlay */}
      {showShortcutsHelp && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowShortcutsHelp(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                ⌨️ Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-neutral-700">
                <span className="text-gray-600 dark:text-gray-400 text-xs italic">Focus any row first (click it)</span>
              </div>

              <ShortcutRow shortcut="B" description="Mark as Blacklist" />
              <ShortcutRow shortcut="C" description="Confirm (accepts AI suggestion if available)" />
              <ShortcutRow shortcut="O" description="Mark as Other" />
              <ShortcutRow shortcut="I" description="Mark as Ignored" />
              <ShortcutRow shortcut="G" description="Mark as Global Blacklist" />
              <ShortcutRow shortcut="A" description="Run AI Categorization" />
              <ShortcutRow shortcut="M" description="Open code Selection modal" />
              <ShortcutRow shortcut="↑/↓" description="Navigate rows" />
              <ShortcutRow shortcut="Esc" description="Clear focus" />
              <ShortcutRow shortcut="?" description="Toggle this help" />
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
              <strong>💡 Tip:</strong> Click any row to focus it, then use keyboard shortcuts for lightning-fast coding!
            </div>
          </div>
        </div>
      )}

      {/* Batch Progress Modal */}
      {showBatchModal && batchProgress && (
        <BatchProgressModal
          progress={batchProgress}
          onPause={() => batchProcessor.pause()}
          onResume={() => batchProcessor.resume()}
          onCancel={() => {
            batchProcessor.cancel();
            setShowBatchModal(false);
          }}
          onClose={() => setShowBatchModal(false)}
          timeRemaining={batchProcessor.getTimeRemaining()}
          speed={batchProcessor.getSpeed()}
        />
      )}

      {/* Export/Import Modal */}
      {showExportImport && (
        <ExportImportModal
          onClose={() => setShowExportImport(false)}
          categoryId={currentCategoryId}
        />
      )}

      {/* Analytics Dashboard Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-auto">
            <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Analytics Dashboard
              </h2>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <AnalyticsDashboard categoryId={currentCategoryId} />
            </div>
          </div>
        </div>
      )}

      {/* Auto-Confirm Settings Modal */}
      {showAutoConfirmSettings && (
        <AutoConfirmSettings
          engine={autoConfirmEngine}
          onClose={() => setShowAutoConfirmSettings(false)}
        />
      )}

    </div>
  );
});
