/**
 * useGridEffects Hook
 *
 * Manages side effects for CodingGrid:
 * - URL filter initialization
 * - Local answers synchronization
 * - Auto-save functionality
 * - Auto-focus first row
 * - Global click handler for clearing focus
 */

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { normalizeStatus } from '../../../lib/statusNormalization';
import { simpleLogger } from '../../../utils/logger';
import type { Answer } from '../../../types';

interface UseGridEffectsOptions {
  // URL filters
  setFilter: (key: string, value: any) => void;

  // Local answers sync
  sortedAndFilteredAnswers: Answer[];
  hasLocalModifications: boolean;
  setLocalAnswers: Dispatch<SetStateAction<Answer[]>>;

  // Auto-save
  localAnswers: Answer[];
  getCacheStats: () => Promise<any>;
  syncPendingChanges: () => Promise<void>;

  // Auto-focus
  focusedRowId: number | null;
  setFocusedRowId: (id: number | null) => void;
}

export function useGridEffects({
  setFilter,
  sortedAndFilteredAnswers,
  hasLocalModifications,
  setLocalAnswers,
  localAnswers,
  getCacheStats,
  syncPendingChanges,
  focusedRowId,
  setFocusedRowId,
}: UseGridEffectsOptions) {
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

  // Sync local answers with sorted/filtered
  useEffect(() => {
    if (!hasLocalModifications) {
      setLocalAnswers(sortedAndFilteredAnswers);
    }
  }, [sortedAndFilteredAnswers, hasLocalModifications, setLocalAnswers]);

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

  // Auto-focus first row when data loads
  useEffect(() => {
    if (localAnswers.length > 0 && !focusedRowId) {
      setFocusedRowId(localAnswers[0].id);
    }
  }, [localAnswers, focusedRowId, setFocusedRowId]);

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
  }, [focusedRowId, setFocusedRowId]);
}
