import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

// Types
import { simpleLogger } from '../../utils/logger';
import type { CodingGridProps } from './types';
import {
  createApplyFiltersHandler,
  createFilterChangeHandler,
  createResetFiltersHandler,
} from './utils/filterHandlers';

// Hooks - Internal
import { useAcceptSuggestionHandler } from './hooks/useAcceptSuggestionHandler';
import { useAdvancedFilters } from './hooks/useAdvancedFilters';
import { useAnswerActions } from './hooks/useAnswerActions';
import { useAnswerFiltering } from './hooks/useAnswerFiltering';
import { useBatchProcessing } from './hooks/useBatchProcessing';
import { useCategoryMetadata } from './hooks/useCategoryMetadata';
import { useCodeManagement } from './hooks/useCodeManagement';
import { useCodingGridHandlers } from './hooks/useCodingGridHandlers';
import { useCodingGridState } from './hooks/useCodingGridState';
import { useGridEffects } from './hooks/useGridEffects';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useModalManagement } from './hooks/useModalManagement';
import { useRealtimeCollaboration } from './hooks/useRealtimeCollaboration';

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

// Context
import { CodingGridProvider } from './context/CodingGridContext';

// Services
import { AutoConfirmEngine } from '../../lib/autoConfirmEngine';

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
    setSelectedAction,
    rowAnimations,
    focusedRowId,
    setFocusedRowId,
    triggerRowAnimation,
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

  // Advanced filters (extracted)
  const advancedFilters = useAdvancedFilters();
  const { filterGroup, setFilterGroup, filterPresets, advancedSearchTerm, setAdvancedSearchTerm } =
    advancedFilters;

  // Category metadata (extracted)
  const { categoryName, filterOptions } = useCategoryMetadata({ categoryId: currentCategoryId });

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
  interface OfflineChange {
    action: 'update' | 'delete' | 'insert';
    table: string;
    data: {
      ids?: number[];
      updates?: Record<string, unknown>;
      [key: string]: unknown;
    };
  }

  const queueChange = async (change: OfflineChange) => {
    await queueChangeOriginal(change);
  };

  // Batch selection
  const batchSelection = useBatchSelection();
  const { toggleSelection: toggleBatchSelection } = batchSelection;

  // Batch processing (extracted)
  const { batchProcessor, batchProgress, setBatchProgress, batchSelectedIds } = useBatchProcessing({
    batchSelection,
    localAnswers,
  });

  // AI - Now properly integrated
  const { mutateAsync: categorizeAnswerAsync } = useCategorizeAnswer();
  const { mutateAsync: _batchCategorizeAsync } = useBatchCategorize();
  const { mutate: _acceptSuggestion, isPending: _isAcceptingSuggestion } = useAcceptSuggestion();
  const [autoConfirmEngine] = useState(() => new AutoConfirmEngine());

  // Realtime collaboration (extracted)
  const { realtimeService, onlineUsers, liveUpdate, setLiveUpdate } = useRealtimeCollaboration({
    categoryId: currentCategoryId,
    focusedRowId,
    setLocalAnswers,
  });

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
  useGridEffects({
    setFilter,
    sortedAndFilteredAnswers: filtering.sortedAndFilteredAnswers,
    hasLocalModifications,
    setLocalAnswers,
    localAnswers,
    getCacheStats,
    syncPendingChanges,
    focusedRowId,
    setFocusedRowId,
  });

  // ========================================
  // HANDLERS
  // ========================================

  // Filter handlers
  const handleFilterChange = createFilterChangeHandler({ setFilter, onFiltersChange });
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
  const { handleCodeSaved, handleQuickRollback, handleBatchAI } = useCodingGridHandlers({
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
    setFilterPresets: () => {
      /* Now handled by advancedFilters hook */
    },
    setFilterGroup,
    answerActions,
    addAction,
    modals,
    batchProcessor,
    batchSelectionCount: batchSelection.selectedCount,
  });

  // Use preset handlers from advanced filters hook
  const { handleSavePreset, handleLoadPreset, handleDeletePreset } = advancedFilters;

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

  // Memoize expensive computations
  const resultsCount = useMemo(() => {
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
  }, [
    filters,
    filterGroup.filters.length,
    advancedSearchTerm,
    filtering.sortedAndFilteredAnswers.length,
    totalAnswers,
    answers.length,
  ]);

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

  const handleSyncNow = useCallback(async () => {
    await syncPendingChanges();
  }, [syncPendingChanges]);

  const handleShowShortcuts = useCallback(() => {
    modals.setShowShortcutsHelp(true);
  }, [modals]);

  const handleShowAnalytics = useCallback(() => {
    modals.setShowAnalytics(true);
  }, [modals]);

  const handleShowExportImport = useCallback(() => {
    modals.setShowExportImport(true);
  }, [modals]);

  const handleShowAutoConfirm = useCallback(() => {
    modals.setShowAutoConfirmSettings(true);
  }, [modals]);

  const handleSelectAll = useCallback(() => {
    batchSelection.selectAll(localAnswers.map(a => String(a.id)));
  }, [batchSelection, localAnswers]);

  const handleCloseShortcutsModal = useCallback(() => {
    modals.setShowShortcutsHelp(false);
  }, [modals]);

  // Prepare context value (memoized to prevent unnecessary re-renders)
  const contextValue = useMemo(
    () => ({
      localAnswers,
      focusedRowId,
      setFocusedRowId,
      rowAnimations,
      batchSelection,
      answerActions,
      modals,
      batchProcessor,
      handleAcceptSuggestion: handleAcceptSuggestionWrapper,
      handleQuickRollback,
      handleBatchAI,
      handleToggleSelection,
    }),
    [
      localAnswers,
      focusedRowId,
      setFocusedRowId,
      rowAnimations,
      batchSelection,
      answerActions,
      modals,
      batchProcessor,
      handleAcceptSuggestionWrapper,
      handleQuickRollback,
      handleBatchAI,
      handleToggleSelection,
    ]
  );

  return (
    <CodingGridProvider value={contextValue}>
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
            onSyncNow={handleSyncNow}
            density={density}
            onDensityChange={setDensity}
            onShowShortcuts={handleShowShortcuts}
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
            resultsCount={resultsCount}
            totalCount={totalAnswers || answers.length}
            onShowShortcuts={handleShowShortcuts}
          />
        </>
      )}

      {/* Batch Toolbar */}
      {currentCategoryId && batchSelection.selectedCount > 0 && (
        <BatchSelectionToolbar
          selectedCount={batchSelection.selectedCount}
          onBatchAI={handleBatchAI}
          onSelectAll={handleSelectAll}
          onClearSelection={batchSelection.clearSelection}
          totalCount={localAnswers.length}
          onShowAnalytics={handleShowAnalytics}
          onShowExportImport={handleShowExportImport}
          onShowAutoConfirm={handleShowAutoConfirm}
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
        onClose={handleCloseShortcutsModal}
      />
      </div>
    </CodingGridProvider>
  );
}
