import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Home, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// Types
import type { CodingGridProps } from './types';

// Hooks - Internal
import { useAnswerActions } from './hooks/useAnswerActions';
import { useAnswerFiltering } from './hooks/useAnswerFiltering';
import { useCodeManagement } from './hooks/useCodeManagement';
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
// ResultsCounter moved inline to same row as Advanced Filters
import { SyncStatusIndicator } from './toolbars/SyncStatusIndicator';
import { TableHeader } from './toolbars/TableHeader';

// Components - Rows
import { DesktopRow } from './rows/DesktopRow';
import { MobileCard } from './rows/MobileCard';

// Components - External
import { AdvancedFiltersPanel } from '../AdvancedFiltersPanel';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { AutoConfirmSettings } from '../AutoConfirmSettings';
import { BatchProgressModal } from '../BatchProgressModal';
import { ExportImportModal } from '../ExportImportModal';
import { FiltersBar } from '../FiltersBar';
import { LiveCodeUpdate } from '../LiveCodeUpdate';
import { OnlineUsers } from '../OnlineUsers';
import { RollbackConfirmationModal } from '../RollbackConfirmationModal';
import { SelectCodeModal } from '../SelectCodeModal';

// Services
import { AutoConfirmEngine } from '../../lib/autoConfirmEngine';
import { BatchAIProcessor, type BatchProgress } from '../../lib/batchAIProcessor';
import { FilterEngine, type FilterGroup, type FilterPreset } from '../../lib/filterEngine';
import { RealtimeService, type CodeUpdateEvent, type UserPresence } from '../../lib/realtimeService';
import { getSupabaseClient } from '../../lib/supabase';

const supabase = getSupabaseClient();

export function CodingGrid({
  answers,
  density,
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
  const [batchProcessor] = useState(() =>
    BatchAIProcessor.create({
      rateLimitMs: 500,
      maxRetries: 3,
      onProgress: (progress) => setBatchProgress(progress),
      onComplete: (progress) => {
        toast.success(`Batch completed: ${progress.succeeded} succeeded, ${progress.failed} failed`);
        // Will be set via modals.setShowBatchModal
      },
      onError: (error) => {
        toast.error(`Batch error: ${error.message}`);
        // Will be set via modals.setShowBatchModal
      },
    })
  );
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  // AI - Now properly integrated
  const { mutateAsync: categorizeAnswerAsync, isPending: isCategorizing } = useCategorizeAnswer();
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
      console.log('🔍 Applying initial filter from URL:', filterParam);
      setFilter('status', [filterParam]);
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
            console.error('Error fetching filter options:', error);
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
          console.error('Error fetching filter options:', error);
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
        console.error('Auto-save error:', error);
      }
    }, 5000);

    return () => clearInterval(autoSaveInterval);
  }, [hasLocalModifications, localAnswers.length, syncPendingChanges, getCacheStats]);

  // Load filter presets
  useEffect(() => {
    const saved = localStorage.getItem('filterPresets');
    if (saved) {
      try {
        const presets = JSON.parse(saved);
        setFilterPresets(presets);
      } catch (error) {
        console.error('Failed to load filter presets:', error);
      }
    }
  }, []);

  // Initialize realtime
  useEffect(() => {
    if (!currentCategoryId) return;

    const initRealtime = async () => {
      try {
        const userName = `User-${Math.random().toString(36).substring(7)}`;
        const userId = `user-${Date.now()}`;

        await realtimeService.joinProject(currentCategoryId, userId, userName);

        realtimeService.onPresenceUpdate((users) => {
          setOnlineUsers(users);
        });

        realtimeService.onCodeUpdateReceived((update) => {
          setLiveUpdate(update);
          setLocalAnswers((prev) =>
            prev.map((a) =>
              a.id === update.answerId
                ? { ...a, selected_code: update.action === 'add' ? update.codeName : null }
                : a
            )
          );
          setTimeout(() => setLiveUpdate(null), 4000);
        });
      } catch (error) {
        console.error('❌ Failed to initialize realtime:', error);
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
        console.log('🧹 Clearing focus - clicked outside grid');
        setFocusedRowId(null);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [focusedRowId]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleFilterChange = (key: string, value: any) => {
    setFilter(key as any, value);

    const url = new URL(window.location.href);
    if (key === 'status') {
      if (Array.isArray(value) && value.length > 0) {
        url.searchParams.set('filter', value[0]);
      } else {
        url.searchParams.delete('filter');
      }
      window.history.replaceState({}, '', url);
    }
  };

  const applyFilters = () => {
    setLocalAnswers(filtering.filteredAnswers);
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  };

  const resetFilters = () => {
    resetFiltersHook();
    if (onFiltersChange) {
      onFiltersChange({
        search: '',
        status: [],
        codes: [],
        language: '',
        country: '',
        minLength: 0,
        maxLength: 0,
      });
    }
  };

  const reloadCategoryData = () => {
    if (!currentCategoryId) return;
    queryClient.invalidateQueries({ queryKey: ['answers', currentCategoryId] });
    if (onCodingStart) {
      onCodingStart(currentCategoryId);
    }
  };

  const handleAcceptSuggestionWrapper = (answerId: number, suggestion: any) => {
    _acceptSuggestion({
      answerId,
      codeId: suggestion.code_id,
      codeName: suggestion.code_name,
      confidence: suggestion.confidence,
    });

    setLocalAnswers((prev) =>
      prev.map((a) =>
        a.id === answerId
          ? {
              ...a,
              selected_code: suggestion.code_name,
              quick_status: 'Confirmed',
              general_status: 'whitelist',
              coding_date: new Date().toISOString(),
            }
          : a
      )
    );

    triggerRowAnimation(answerId, 'animate-flash-ok');
  };

  const handleCodeSaved = async () => {
    const affectedIds =
      selectedIds.length > 0
        ? selectedIds
        : modals.selectedAnswer
        ? [
            modals.selectedAnswer.id,
            ...answerActions.findDuplicateAnswers(modals.selectedAnswer),
          ]
        : [];

    if (affectedIds.length > 0) {
      affectedIds.forEach((id) => {
        triggerRowAnimation(id, 'animate-pulse bg-green-600/20 transition duration-700');
      });

      if (selectedIds.length > 0) {
        setSelectedIds([]);
        setSelectedAction('');
      }
    }

    queryClient.invalidateQueries({ queryKey: ['answers', currentCategoryId] });

    try {
      const updatedAnswerIds = affectedIds.length > 0 ? affectedIds : [];
      if (updatedAnswerIds.length === 0) return;

      const { data: updatedAnswers, error } = await supabase
        .from('answers')
        .select(`*, answer_codes (codes (id, name))`)
        .in('id', updatedAnswerIds);

      if (error) {
        console.error('Error refreshing answers:', error);
        return;
      }

      const transformedAnswers = updatedAnswers.map((answer) => ({
        ...answer,
        selected_code:
          answer.answer_codes?.map((ac: any) => ac.codes?.name).filter(Boolean).join(', ') || null,
      }));

      setLocalAnswers((prev) =>
        prev.map((answer) => {
          const updatedAnswer = transformedAnswers.find((ua) => ua.id === answer.id);
          return updatedAnswer || answer;
        })
      );

      setHasLocalModifications(true);
    } catch (err) {
      console.error('Error refreshing answers:', err);
    }

    modals.setModalOpen(false);
    modals.setSelectedAnswer(null);
  };

  const handleSavePreset = (name: string) => {
    const preset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      filterGroup: { ...filterGroup },
      createdAt: new Date().toISOString(),
    };
    const newPresets = [...filterPresets, preset];
    setFilterPresets(newPresets);
    localStorage.setItem('filterPresets', JSON.stringify(newPresets));
    toast.success(`Filter preset "${name}" saved!`);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    setFilterGroup(preset.filterGroup);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleDeletePreset = (presetId: string) => {
    const newPresets = filterPresets.filter((p) => p.id !== presetId);
    setFilterPresets(newPresets);
    localStorage.setItem('filterPresets', JSON.stringify(newPresets));
    toast.success('Filter preset deleted');
  };

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
      modals.setShowBatchModal(true);
      await batchProcessor.startBatch(
        Array.from(batchSelection.selectedIds).map((id) => parseInt(id)),
        currentCategoryId
      );
    } catch (error) {
      console.error('Batch AI processing error:', error);
      toast.error('Failed to start batch processing');
      modals.setShowBatchModal(false);
    }
  };

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

  return (
    <div
      className="relative"
      style={{ paddingBottom: selectedIds.length > 0 ? '80px' : '0' }}
    >
      {/* Online Users */}
      {currentCategoryId && onlineUsers.length > 1 && (
        <div className="fixed top-4 right-4 z-40">
          <OnlineUsers
            users={onlineUsers}
            currentUserId={
              realtimeService.getStats().users.find((u) => u.isOnline)?.userId || 'current'
            }
          />
        </div>
      )}

      {/* Live Updates */}
      {liveUpdate && <LiveCodeUpdate update={liveUpdate} onDismiss={() => setLiveUpdate(null)} />}

      {/* Breadcrumbs */}
      {currentCategoryId && (
        <nav className="text-sm text-gray-500 mb-4 px-3" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-blue-600 inline-flex items-center gap-1">
            <Home size={14} />
            Categories
          </Link>
          <ChevronRight size={14} className="inline mx-1" />
          <span className="text-gray-700">{categoryName}</span>
          <ChevronRight size={14} className="inline mx-1" />
          <span className="text-blue-600 font-medium">Coding</span>
        </nav>
      )}

      {/* Filters and Results Counter */}
      {currentCategoryId && (
        <>
          <FiltersBar
            filters={filters}
            updateFilter={handleFilterChange}
            typesList={[
              { key: 'uncategorized', label: 'Not categorized' },
              { key: 'categorized', label: 'Categorized' },
              { key: 'whitelist', label: 'Whitelist' },
              { key: 'blacklist', label: 'Blacklist' },
              { key: 'global_blacklist', label: 'gBlacklist' },
              { key: 'ignored', label: 'Ignored' },
              { key: 'other', label: 'Other' },
            ]}
            codesList={codeManagement.cachedCodes.map((c) => c.name)}
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
          />

          <AdvancedFiltersPanel
            filterGroup={filterGroup}
            onFilterChange={setFilterGroup}
            presets={filterPresets}
            onSavePreset={handleSavePreset}
            onLoadPreset={handleLoadPreset}
            onDeletePreset={handleDeletePreset}
            resultsCount={filtering.sortedAndFilteredAnswers.length}
            totalCount={answers.length}
            onSearchChange={setAdvancedSearchTerm}
          />

          {/* Results Counter with Shortcuts - Same row as Advanced Filters */}
          <div className="flex items-center justify-between w-full px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {localAnswers.length} of {answers.length} answers
                {localAnswers.length !== filtering.filteredAnswers.length && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                    ({filtering.filteredAnswers.length} filtered)
                  </span>
                )}
              </span>
              {filtering.sortField && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Sorted by: <span className="font-medium text-gray-700 dark:text-gray-300">{filtering.sortField}</span> <span className="text-blue-600 dark:text-blue-400">{filtering.sortOrder === 'asc' ? '▲' : '▼'}</span>
                </div>
              )}
            </div>

            {/* Right side: Shortcuts button */}
            <button
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              onClick={() => modals.setShowShortcutsHelp(true)}
              title="Show keyboard shortcuts"
            >
              <span>?</span>
              <span>Shortcuts</span>
            </button>
          </div>
        </>
      )}

      {/* Batch Toolbar */}
      {currentCategoryId && batchSelection.selectedCount > 0 && (
        <BatchSelectionToolbar
          selectedCount={batchSelection.selectedCount}
          onBatchAI={handleBatchAI}
          onSelectAll={() => batchSelection.selectAll(localAnswers.map((a) => String(a.id)))}
          onClearSelection={batchSelection.clearSelection}
          totalCount={localAnswers.length}
          onShowAnalytics={() => modals.setShowAnalytics(true)}
          onShowExportImport={() => modals.setShowExportImport(true)}
          onShowAutoConfirm={() => modals.setShowAutoConfirmSettings(true)}
          isProcessing={batchProcessor.getProgress().status === 'running'}
        />
      )}

      {/* Results Counter moved to same row as Advanced Filters above */}

      {/* Sync Status */}
      <SyncStatusIndicator
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        syncProgress={syncProgress}
        onSyncNow={syncPendingChanges}
      />

      {/* Desktop Table */}
      <div
        className="hidden md:block relative overflow-auto max-h-[60vh]"
        data-grid-container
        onClick={(e) => {
          // Clear focus when clicking on empty space in table container
          if (e.target === e.currentTarget) {
            console.log('🧹 Clearing focus - clicked on table container');
            setFocusedRowId(null);
          }
        }}
      >
        <table
          className="w-full border-collapse min-w-[900px]"
          onClick={(e) => {
            // Clear focus when clicking on table (but not on rows)
            if (e.target === e.currentTarget) {
              console.log('🧹 Clearing focus - clicked on table element');
              setFocusedRowId(null);
            }
          }}
        >
          <TableHeader
            cellPad={cellPad}
            sortField={filtering.sortField}
            sortOrder={filtering.sortOrder}
            onSort={filtering.handleSort}
            isAllSelected={batchSelection.isAllSelected(localAnswers.map((a) => String(a.id)))}
            onSelectAll={() => {
              if (batchSelection.isAllSelected(localAnswers.map((a) => String(a.id)))) {
                batchSelection.clearSelection();
              } else {
                batchSelection.selectAll(localAnswers.map((a) => String(a.id)));
              }
            }}
            onClearAll={batchSelection.clearSelection}
            onBulkAICategorize={handleBatchAI}
            isBulkCategorizing={batchProcessor.getProgress().status === 'running'}
            visibleCount={localAnswers.length}
          />
          <tbody
            data-answer-container
            onClick={(e) => {
              // Clear focus when clicking on empty space in tbody
              if (e.target === e.currentTarget) {
                console.log('🧹 Clearing focus - clicked on tbody element');
                setFocusedRowId(null);
              }
            }}
          >
            {localAnswers.map((answer) => (
              <DesktopRow
                key={answer.id}
                answer={answer}
                cellPad={cellPad}
                isFocused={focusedRowId === answer.id}
                isSelected={batchSelection.isSelected(String(answer.id))}
                isCategorizing={answerActions.isCategorizingRow[answer.id] || false}
                isAccepting={false}
                rowAnimation={rowAnimations[answer.id] || ''}
                onFocus={() => {
                  console.log('🎯 Setting focus to answer:', answer.id);
                  setFocusedRowId(answer.id);
                }}
                onClick={(_e) => {
                  console.log('🎯 Setting focus to answer (click):', answer.id);
                  setFocusedRowId(answer.id);
                }}
                onToggleSelection={(id, e) => {
                  batchSelection.toggleSelection(id, e);
                  setFocusedRowId(answer.id);
                }}
                onQuickStatus={(ans, key) => answerActions.handleQuickStatus(ans, key)}
                onCodeClick={() => modals.handleCodeClick(answer)}
                onAICategorize={() => answerActions.handleSingleAICategorize(answer.id)}
                onAcceptSuggestion={(suggestion) => handleAcceptSuggestionWrapper(answer.id, suggestion)}
                onRemoveSuggestion={() => {}}
                onRegenerateSuggestions={() => answerActions.handleSingleAICategorize(answer.id)}
                formatDate={(date) => {
                  if (!date) return '—';
                  const d = new Date(date);
                  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div
        className="md:hidden space-y-3 p-4"
        data-grid-container
        onClick={(e) => {
          // Clear focus when clicking on empty space in mobile container
          if (e.target === e.currentTarget) {
            console.log('🧹 Clearing focus - clicked on mobile container');
            setFocusedRowId(null);
          }
        }}
      >
        {localAnswers.map((answer) => (
          <MobileCard
            key={answer.id}
            answer={answer}
            isFocused={focusedRowId === answer.id}
            isSelected={batchSelection.isSelected(String(answer.id))}
            isCategorizing={answerActions.isCategorizingRow[answer.id] || false}
            rowAnimation={rowAnimations[answer.id] || ''}
            onFocus={() => setFocusedRowId(answer.id)}
            onClick={(_e) => {
              setFocusedRowId(answer.id);
            }}
            onToggleSelection={(id, e) => {
              batchSelection.toggleSelection(id, e);
              setFocusedRowId(answer.id);
            }}
            onQuickStatus={(ans, key) => answerActions.handleQuickStatus(ans, key)}
            onCodeClick={() => modals.handleCodeClick(answer)}
            onAICategorize={() => answerActions.handleSingleAICategorize(answer.id)}
            formatDate={(date) => {
              if (!date) return '—';
              const d = new Date(date);
              return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
            }}
          />
        ))}
      </div>

      {/* Modals */}
      <SelectCodeModal
        open={modals.modalOpen}
        onClose={() => {
          modals.setModalOpen(false);
          modals.setSelectedAnswer(null);
          modals.setPreselectedCodes([]);
        }}
        selectedAnswerIds={
          selectedIds.length > 0 ? selectedIds : modals.selectedAnswer ? [modals.selectedAnswer.id] : []
        }
        allAnswers={answers}
        currentAnswerIndex={modals.selectedAnswer ? answers.findIndex(a => a.id === modals.selectedAnswer!.id) : 0}
        preselectedCodes={modals.preselectedCodes}
        onSaved={handleCodeSaved}
        onNavigate={(newIndex) => {
          const newAnswer = answers[newIndex];
          if (newAnswer) {
            modals.setSelectedAnswer(newAnswer);
            modals.setPreselectedCodes([]);
          }
        }}
        mode={modals.assignMode}
        categoryId={currentCategoryId}
        selectedAnswer={modals.selectedAnswer?.answer_text || ''}
        translation={modals.selectedAnswer?.translation_en || ''}
        aiSuggestions={modals.selectedAnswer?.ai_suggestions || undefined}
        onGenerateAISuggestions={(answerId) => {
          answerActions.handleSingleAICategorize(answerId);
        }}
      />

      <RollbackConfirmationModal
        open={modals.rollbackModalOpen}
        onClose={() => {
          modals.setRollbackModalOpen(false);
          modals.setRollbackAnswer(null);
        }}
        record={
          modals.rollbackAnswer
            ? {
                id: modals.rollbackAnswer.id,
                answer_text: modals.rollbackAnswer.answer_text,
                selected_code: modals.rollbackAnswer.selected_code || '',
                general_status: modals.rollbackAnswer.general_status || '',
                confirmed_by: modals.rollbackAnswer.confirmed_by || '',
                coding_date: modals.rollbackAnswer.coding_date || '',
              }
            : {
                id: 0,
                answer_text: '',
                selected_code: '',
                general_status: '',
                confirmed_by: '',
                coding_date: '',
              }
        }
        onRollback={async () => {
          /* implement rollback */
        }}
        onRollbackAndEdit={async () => {
          /* implement rollback and edit */
        }}
      />

      {modals.showBatchModal && batchProgress && (
        <BatchProgressModal
          progress={batchProgress}
          onPause={() => batchProcessor.pause()}
          onResume={() => batchProcessor.resume()}
          onCancel={() => {
            batchProcessor.cancel();
            modals.setShowBatchModal(false);
          }}
          onClose={() => modals.setShowBatchModal(false)}
          timeRemaining={batchProcessor.getTimeRemaining()}
          speed={batchProcessor.getSpeed()}
        />
      )}

      {modals.showExportImport && (
        <ExportImportModal
          onClose={() => modals.setShowExportImport(false)}
          categoryId={currentCategoryId}
        />
      )}

      {modals.showAnalytics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-auto">
            <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
              <button onClick={() => modals.setShowAnalytics(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <AnalyticsDashboard categoryId={currentCategoryId} />
            </div>
          </div>
        </div>
      )}

      {modals.showAutoConfirmSettings && (
        <AutoConfirmSettings
          engine={autoConfirmEngine}
          onClose={() => modals.setShowAutoConfirmSettings(false)}
        />
      )}

      {/* Shortcuts Help */}
      {modals.showShortcutsHelp && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => modals.setShowShortcutsHelp(false)}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">⌨️ Keyboard Shortcuts</h3>
              <button onClick={() => modals.setShowShortcutsHelp(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <ShortcutRow shortcut="B" description="Mark as Blacklist" />
              <ShortcutRow shortcut="C" description="Confirm (accepts AI suggestion if available)" />
              <ShortcutRow shortcut="O" description="Mark as Other" />
              <ShortcutRow shortcut="I" description="Mark as Ignored" />
              <ShortcutRow shortcut="G" description="Mark as Global Blacklist" />
              <ShortcutRow shortcut="A" description="Run AI Categorization" />
              <ShortcutRow shortcut="S" description="Open Code Selection" />
              <ShortcutRow shortcut="↑/↓" description="Navigate rows" />
              <ShortcutRow shortcut="Esc" description="Clear focus" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b">
      <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs font-mono font-semibold">{shortcut}</kbd>
      <span className="text-gray-600 flex-1 ml-4 text-sm">{description}</span>
    </div>
  );
}
