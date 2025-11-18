import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Types
import { normalizeStatus } from '../../lib/statusNormalization';
import { simpleLogger } from '../../utils/logger';
import type { CodingGridProps } from './types';
import {
  createApplyFiltersHandler,
  createFilterChangeHandler,
  createResetFiltersHandler,
} from './utils/filterHandlers';
import { loadFilterPresets } from './utils/filterPresets';

// Hooks - Internal
import { useAcceptSuggestionHandler } from './hooks/useAcceptSuggestionHandler';
import { useAnswerActions } from './hooks/useAnswerActions';
import { useAnswerFiltering } from './hooks/useAnswerFiltering';
import { useCodeManagement } from './hooks/useCodeManagement';
import { useCodingGridHandlers } from './hooks/useCodingGridHandlers';
import { useCodingGridState } from './hooks/useCodingGridState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useModalManagement } from './hooks/useModalManagement';

// Hooks - External
import { useAcceptSuggestion } from '../../hooks/useAcceptSuggestion';
import { useBatchSelection } from '../../hooks/useBatchSelection';
import { useBatchCategorize, useCategorizeAnswer } from '../../hooks/useCategorizeAnswer';
import { useFilters } from '../../hooks/useFilters';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUndoRedo } from '../../hooks/useUndoRedo';

// Components - Toolbars
import { BatchSelectionToolbar } from './toolbars/BatchSelectionToolbar';

// Components - Internal
import { Breadcrumbs } from './components/Breadcrumbs';
import { DesktopTableView } from './components/DesktopTableView';
import { HeaderControls } from './components/HeaderControls';
import { MobileListView } from './components/MobileListView';
import { ModalsSection } from './components/ModalsSection';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';

// Components - Rows & Virtualized views (used in DesktopTableView and MobileListView)

// Components - External
import { AdvancedFiltersPanel } from '../AdvancedFiltersPanel';
import { FiltersBar } from '../FiltersBar';
import { LiveCodeUpdate } from '../LiveCodeUpdate';
import { OnlineUsers } from '../OnlineUsers';

// Services
import { AutoConfirmEngine } from '../../lib/autoConfirmEngine';
import { BatchAIProcessor, type BatchProgress } from '../../lib/batchAIProcessor';
import { FilterEngine, type FilterGroup, type FilterPreset } from '../../lib/filterEngine';
import {
  RealtimeService,
  type CodeUpdateEvent,
  type UserPresence,
} from '../../lib/realtimeService';
import { getSupabaseClient } from '../../lib/supabase';

const supabase = getSupabaseClient();

export function CodingGrid({
  answers,
  totalAnswers,
  density,
  setDensity,
  currentCategoryId,
  onCodingStart,
  onFiltersChange,
}: CodingGridProps) {
  const queryClient = useQueryClient();

  // ========================================
  // HOOKS - State Management
  // ========================================
  const gridState = useCodingGridState(answers);
  const {
    localAnswers,
    setLocalAnswers,
    hasLocalModifications,
    setHasLocalModifications,
    selectedIds,
    setSelectedIds,
    selectedAction: _selectedAction, // TODO: Implement batch actions
    setSelectedAction,
    isApplying: _isApplying, // TODO: Track applying state
    setIsApplying: _setIsApplying, // TODO: Set applying state
    rowAnimations,
    focusedRowId,
    setFocusedRowId,
    categoryName,
    setCategoryName,
    triggerRowAnimation,
    handleCheckboxChange: _handleCheckboxChange, // TODO: Individual checkbox handling
    handleSelectAll: _handleSelectAll, // TODO: Select all handling
  } = gridState;

  // Filters
  const {
    rawFilters: filters,
    setFilter,
    resetFilters: resetFiltersHook,
  } = useFilters({
    initialValues: {
      search: '',
      status: [],
      codes: [],
      language: '',
      country: '',
      minLength: 0,
      maxLength: 0,
    },
    debounceMs: 300,
    onChange: onFiltersChange,
  });

  // Advanced filters
  const [filterGroup, setFilterGroup] = useState<FilterGroup>({
    logic: 'AND',
    filters: [],
  });
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [advancedSearchTerm, setAdvancedSearchTerm] = useState('');
  // FUTURE: Advanced filtering engine - currently using basic filters
  const [_filterEngine] = useState(() => new FilterEngine());
  const [filterOptions, setFilterOptions] = useState({
    types: [] as string[],
    statuses: [] as string[],
    languages: [] as string[],
    countries: [] as string[],
    brands: [] as string[],
  });

  // Undo/Redo
  const { addAction, undo, redo, canUndo, canRedo } = useUndoRedo({ maxHistorySize: 100 });

  // Offline sync
  const {
    isOnline,
    syncStatus,
    pendingCount,
    queueChange: queueChangeOriginal,
    syncPendingChanges,
    syncProgress,
    getStats: getCacheStats,
  } = useOfflineSync();

  // Wrap queueChange to return void
  const queueChange = async (change: any) => {
    await queueChangeOriginal(change);
  };

  // Batch selection
  const batchSelection = useBatchSelection();
  const { setIds: setBatchSelectionIds, toggleSelection: toggleBatchSelection } = batchSelection;
  const [batchProcessor] = useState(() =>
    BatchAIProcessor.create({
      concurrency: 8, // 8 parallel AI requests
      maxRetries: 3,
      onProgress: progress => setBatchProgress(progress),
      onComplete: progress => {
        toast.success(
          `Batch completed: ${progress.succeeded} succeeded, ${progress.failed} failed`
        );
        // Will be set via modals.setShowBatchModal
      },
      onError: error => {
        toast.error(`Batch error: ${error.message}`);
        // Will be set via modals.setShowBatchModal
      },
    })
  );
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  const orderedAnswerIds = useMemo(
    () => localAnswers.map(answer => String(answer.id)),
    [localAnswers]
  );

  useEffect(() => {
    setBatchSelectionIds(orderedAnswerIds);
  }, [setBatchSelectionIds, orderedAnswerIds]);

  const batchSelectedIds = useMemo(
    () =>
      Array.from(batchSelection.selectedIds)
        .map(id => parseInt(id, 10))
        .filter(id => !Number.isNaN(id)),
    [batchSelection.selectedIds]
  );

  // AI - Now properly integrated
  const { mutateAsync: categorizeAnswerAsync } = useCategorizeAnswer();
  const { mutateAsync: _batchCategorizeAsync } = useBatchCategorize();
  const { mutate: _acceptSuggestion, isPending: _isAcceptingSuggestion } = useAcceptSuggestion();
  const [autoConfirmEngine] = useState(() => new AutoConfirmEngine());

  // Realtime
  const [realtimeService] = useState(() => new RealtimeService());
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [liveUpdate, setLiveUpdate] = useState<CodeUpdateEvent | null>(null);

  // Modals
  const modals = useModalManagement({ onCodingStart });

  // Code management
  const codeManagement = useCodeManagement(currentCategoryId);

  // Filtering & Sorting
  const filtering = useAnswerFiltering(answers, filters, filterGroup, advancedSearchTerm);

  // Answer actions
  const answerActions = useAnswerActions({
    localAnswers,
    setLocalAnswers,
    isOnline,
    queueChange,
    addAction,
    triggerRowAnimation,
    categorizeAnswer: categorizeAnswerAsync,
  });

  // ========================================
  // EFFECTS
  // ========================================

  // Fetch category name
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
          document.title = `${data.name} - Coding`;
        }
      };
      fetchCategoryName();
    } else {
      setCategoryName('');
      document.title = 'Coding & AI Categorization Dashboard';
    }
  }, [currentCategoryId, setCategoryName]);

  // Apply URL filter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter');

    if (filterParam) {
      simpleLogger.info('🔍 Applying initial filter from URL:', filterParam);
      // Support comma-separated multiple statuses
      const statusValues = filterParam.split(',').map(s => s.trim());
      // Normalize to canonical values before setting
      const normalizedStatuses = statusValues.map(s => {
        try {
          return normalizeStatus(s);
        } catch {
          return s; // Fallback to original if normalization fails
        }
      });
      setFilter('status', normalizedStatuses);
    }
  }, [setFilter]);

  // Fetch filter options
  useEffect(() => {
    if (currentCategoryId) {
      const fetchFilterOptions = async () => {
        try {
          const { data, error } = await supabase.rpc('get_filter_options', {
            p_category_id: currentCategoryId,
          });

          if (error) {
            simpleLogger.error('Error fetching filter options:', error);
            return;
          }

          if (data && data.length > 0) {
            const row = data[0] as any;
            const hardcodedStatuses = [
              'uncategorized',
              'whitelist',
              'blacklist',
              'categorized',
              'global_blacklist',
              'ignored',
              'other',
            ];

            setFilterOptions({
              types: (row.types || []).filter(Boolean),
              statuses: row.statuses ? (row.statuses || []).filter(Boolean) : hardcodedStatuses,
              languages: (row.languages || []).filter(Boolean),
              countries: (row.countries || []).filter(Boolean),
              brands: [],
            });
          }
        } catch (error) {
          simpleLogger.error('Error fetching filter options:', error);
        }
      };
      fetchFilterOptions();
    }
  }, [currentCategoryId]);

  // Sync local answers with sorted/filtered
  useEffect(() => {
    if (!hasLocalModifications) {
      setLocalAnswers(filtering.sortedAndFilteredAnswers);
    }
  }, [filtering.sortedAndFilteredAnswers, hasLocalModifications, setLocalAnswers]);

  // Auto-save
  useEffect(() => {
    if (!hasLocalModifications || localAnswers.length === 0) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        const stats = await getCacheStats();
        if (stats.unsyncedChanges > 0) {
          await syncPendingChanges();
        }
      } catch (error) {
        simpleLogger.error('Auto-save error:', error);
      }
    }, 5000);

    return () => clearInterval(autoSaveInterval);
  }, [hasLocalModifications, localAnswers.length, syncPendingChanges, getCacheStats]);

  // Load filter presets
  useEffect(() => {
    const presets = loadFilterPresets();
    setFilterPresets(presets);
  }, [setFilterPresets]);

  // Initialize realtime
  useEffect(() => {
    if (!currentCategoryId) return;

    const initRealtime = async () => {
      try {
        const userName = `User-${Math.random().toString(36).substring(7)}`;
        const userId = `user-${Date.now()}`;

        await realtimeService.joinProject(currentCategoryId, userId, userName);

        realtimeService.onPresenceUpdate(users => {
          setOnlineUsers(users);
        });

        realtimeService.onCodeUpdateReceived(update => {
          setLiveUpdate(update);
          setLocalAnswers(prev =>
            prev.map(a =>
              a.id === update.answerId
                ? { ...a, selected_code: update.action === 'add' ? update.codeName : null }
                : a
            )
          );
          setTimeout(() => setLiveUpdate(null), 4000);
        });
      } catch (error) {
        simpleLogger.error('❌ Failed to initialize realtime:', error);
      }
    };

    initRealtime();

    return () => {
      realtimeService.leave();
    };
  }, [currentCategoryId, realtimeService, setLocalAnswers]);

  // Auto-focus first row when data loads
  useEffect(() => {
    if (localAnswers.length > 0 && !focusedRowId) {
      setFocusedRowId(localAnswers[0].id);
    }
  }, [localAnswers, focusedRowId]);

  // Update current answer in realtime (only when focused, not when clearing focus)
  useEffect(() => {
    if (focusedRowId) {
      realtimeService.updateCurrentAnswer(focusedRowId);
    }
  }, [focusedRowId, realtimeService]);

  // Global click handler to clear focus when clicking outside the grid
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Element;

      // Don't clear focus if clicking on:
      // - Grid components (table, rows, cells, buttons)
      // - Modals
      // - Input fields
      if (
        target.closest('[data-grid-container]') ||
        target.closest('[data-modal]') ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      // Clear focus when clicking anywhere else
      if (focusedRowId) {
        simpleLogger.info('🧹 Clearing focus - clicked outside grid');
        setFocusedRowId(null);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [focusedRowId]);

  // ========================================
  // HANDLERS
  // ========================================

  // Filter handlers
  const handleFilterChange = createFilterChangeHandler({ setFilter, onFiltersChange }) as (
    key: string,
    value: any
  ) => void;
  const applyFilters = createApplyFiltersHandler(
    filtering.filteredAnswers,
    setLocalAnswers,
    filters,
    onFiltersChange
  );
  const resetFilters = createResetFiltersHandler(resetFiltersHook, onFiltersChange);

  const reloadCategoryData = () => {
    if (!currentCategoryId) return;
    queryClient.invalidateQueries({ queryKey: ['answers', currentCategoryId] });
    if (onCodingStart) {
      onCodingStart(currentCategoryId);
    }
  };

  // Accept suggestion handler
  const handleAcceptSuggestionWrapper = useAcceptSuggestionHandler({
    localAnswers,
    setLocalAnswers,
    answerActions,
    acceptSuggestion: _acceptSuggestion,
    addAction,
  });

  // Handlers
  const {
    handleCodeSaved,
    handleQuickRollback,
    handleSavePreset,
    handleLoadPreset,
    handleDeletePreset,
    handleBatchAI,
  } = useCodingGridHandlers({
    localAnswers,
    setLocalAnswers,
    setHasLocalModifications,
    selectedIds,
    setSelectedIds,
    setSelectedAction,
    batchSelectedIds,
    batchSelection,
    currentCategoryId: currentCategoryId ?? null,
    filterGroup,
    filterPresets,
    setFilterPresets,
    setFilterGroup,
    answerActions,
    addAction,
    modals,
    batchProcessor,
    batchSelectionCount: batchSelection.selectedCount,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    focusedRowId,
    localAnswers,
    setFocusedRowId,
    handleQuickStatus: answerActions.handleQuickStatus,
    handleAcceptSuggestion: handleAcceptSuggestionWrapper,
    handleSingleAICategorize: answerActions.handleSingleAICategorize,
    openCodeModal: modals.openCodeModal,
    undo,
    redo,
  });

  // ========================================
  // RENDER
  // ========================================

  const cellPad = density === 'compact' ? 'px-2 py-1' : 'px-3 py-2';
  const isTestEnv =
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');

  // Date formatter is already imported from utils

  const handleRowFocus = useCallback(
    (answerId: number) => {
      simpleLogger.info('🎯 Setting focus to answer:', answerId);
      setFocusedRowId(answerId);
    },
    [setFocusedRowId]
  );

  const handleRowClick = useCallback(
    (answerId: number) => {
      simpleLogger.info('🎯 Setting focus to answer (click):', answerId);
      setFocusedRowId(answerId);
    },
    [setFocusedRowId]
  );

  const handleToggleSelection = useCallback(
    (id: string, event: React.MouseEvent) => {
      toggleBatchSelection(id, event);
      const numericId = parseInt(id, 10);
      if (!Number.isNaN(numericId)) {
        setFocusedRowId(numericId);
      }
    },
    [toggleBatchSelection, setFocusedRowId]
  );

  return (
    <div
      className="relative"
      style={{ paddingBottom: batchSelection.selectedCount > 0 ? '80px' : '0' }}
    >
      {/* Online Users */}
      {currentCategoryId && onlineUsers.length > 1 && (
        <div className="fixed top-4 right-4 z-40">
          <OnlineUsers
            users={onlineUsers}
            currentUserId={
              realtimeService.getStats().users.find(u => u.isOnline)?.userId || 'current'
            }
          />
        </div>
      )}

      {/* Live Updates */}
      {liveUpdate && <LiveCodeUpdate update={liveUpdate} onDismiss={() => setLiveUpdate(null)} />}

      {/* Breadcrumbs and Controls */}
      {currentCategoryId && (
        <div className="flex items-center justify-between mb-4 px-3">
          {/* Left: Breadcrumbs */}
          <Breadcrumbs categoryName={categoryName} />

          {/* Right: Status + Shortcuts + View Options */}
          <HeaderControls
            syncStatus={syncStatus}
            pendingCount={pendingCount}
            syncProgress={syncProgress}
            onSyncNow={async () => {
              await syncPendingChanges();
            }}
            density={density}
            onDensityChange={setDensity}
            onShowShortcuts={() => modals.setShowShortcutsHelp(true)}
          />
        </div>
      )}

      {/* Filters and Results Counter */}
      {currentCategoryId && (
        <>
          <FiltersBar
            filters={filters}
            updateFilter={handleFilterChange}
            typesList={[
              { key: 'uncategorized', label: 'Not Categorized' },
              { key: 'categorized', label: 'Categorized' },
              { key: 'whitelist', label: 'Whitelist' },
              { key: 'blacklist', label: 'Blacklist' },
              { key: 'global_blacklist', label: 'Global Blacklist' },
              { key: 'ignored', label: 'Ignored' },
              { key: 'other', label: 'Other' },
            ]}
            codesList={codeManagement.cachedCodes.map(c => c.name)}
            statusesList={filterOptions.statuses}
            languagesList={filterOptions.languages}
            countriesList={filterOptions.countries}
            onApply={applyFilters}
            onReset={resetFilters}
            onReload={reloadCategoryData}
            isApplying={false}
            isReloading={false}
            loadingCodes={codeManagement.loadingCodes}
            onReloadCodes={codeManagement.handleReloadCodes}
            onLoadMoreCodes={codeManagement.loadMoreCodes}
            hasMoreCodes={codeManagement.hasMoreCodes}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            searchTerm={advancedSearchTerm}
            onSearchChange={setAdvancedSearchTerm}
          />

          <AdvancedFiltersPanel
            filterGroup={filterGroup}
            onFilterChange={setFilterGroup}
            presets={filterPresets}
            onSavePreset={handleSavePreset}
            onLoadPreset={handleLoadPreset}
            onDeletePreset={handleDeletePreset}
            resultsCount={(() => {
              // Show total count if no filters are active, otherwise show filtered count
              const hasActiveFilters =
                filters.search !== '' ||
                filters.status.length > 0 ||
                filters.codes.length > 0 ||
                filters.language !== '' ||
                filters.country !== '' ||
                filters.minLength > 0 ||
                filters.maxLength > 0 ||
                filterGroup.filters.length > 0 ||
                advancedSearchTerm !== '';

              return hasActiveFilters
                ? filtering.sortedAndFilteredAnswers.length
                : totalAnswers || answers.length;
            })()}
            totalCount={totalAnswers || answers.length}
            onShowShortcuts={() => modals.setShowShortcutsHelp(true)}
          />
        </>
      )}

      {/* Batch Toolbar */}
      {currentCategoryId && batchSelection.selectedCount > 0 && (
        <BatchSelectionToolbar
          selectedCount={batchSelection.selectedCount}
          onBatchAI={handleBatchAI}
          onSelectAll={() => batchSelection.selectAll(localAnswers.map(a => String(a.id)))}
          onClearSelection={batchSelection.clearSelection}
          totalCount={localAnswers.length}
          onShowAnalytics={() => modals.setShowAnalytics(true)}
          onShowExportImport={() => modals.setShowExportImport(true)}
          onShowAutoConfirm={() => modals.setShowAutoConfirmSettings(true)}
          isProcessing={batchProcessor.getProgress().status === 'running'}
        />
      )}

      {/* Desktop Table */}
      <DesktopTableView
        isTestEnv={isTestEnv}
        localAnswers={localAnswers}
        focusedRowId={focusedRowId}
        setFocusedRowId={setFocusedRowId}
        batchSelection={batchSelection}
        answerActions={answerActions}
        rowAnimations={rowAnimations}
        filtering={filtering}
        modals={modals}
        cellPad={cellPad}
        handleRowFocus={handleRowFocus}
        handleRowClick={handleRowClick}
        handleToggleSelection={handleToggleSelection}
        handleAcceptSuggestionWrapper={handleAcceptSuggestionWrapper}
        handleQuickRollback={handleQuickRollback}
        handleBatchAI={handleBatchAI}
        batchProcessor={batchProcessor}
      />

      {/* Mobile Cards */}
      <MobileListView
        isTestEnv={isTestEnv}
        localAnswers={localAnswers}
        focusedRowId={focusedRowId}
        setFocusedRowId={setFocusedRowId}
        batchSelection={batchSelection}
        answerActions={answerActions}
        rowAnimations={rowAnimations}
        modals={modals}
        handleToggleSelection={handleToggleSelection}
        handleQuickRollback={handleQuickRollback}
      />

      {/* Modals */}
      <ModalsSection
        modals={modals}
        batchSelectedIds={batchSelectedIds}
        answers={answers}
        currentCategoryId={currentCategoryId ?? null}
        handleCodeSaved={handleCodeSaved}
        batchProgress={batchProgress}
        batchProcessor={batchProcessor}
        answerActions={answerActions}
        autoConfirmEngine={autoConfirmEngine}
      />

      {/* Shortcuts Help */}
      <ShortcutsHelpModal
        isOpen={modals.showShortcutsHelp}
        onClose={() => modals.setShowShortcutsHelp(false)}
      />
    </div>
  );
}
