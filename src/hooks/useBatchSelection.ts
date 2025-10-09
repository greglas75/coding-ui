import { useCallback, useEffect, useState } from 'react';

export function useBatchSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [allIdsCache, setAllIdsCache] = useState<string[]>([]);

  // Cache wszystkich IDs
  const updateIdsCache = useCallback(() => {
    const elements = document.querySelectorAll('[data-answer-id]');
    const ids = Array.from(elements).map(el => el.getAttribute('data-answer-id')!);
    setAllIdsCache(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  // Update cache on mount
  useEffect(() => {
    updateIdsCache();

    const observer = new MutationObserver(() => {
      updateIdsCache();
    });

    const container = document.querySelector('[data-answer-container]');
    if (container && container instanceof Node) {
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, [updateIdsCache]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // Select all visible
        setSelectedIds(new Set(allIdsCache));
      }
      if (e.key === 'Escape') {
        // Clear selection
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allIdsCache, clearSelection]);

  const toggleSelection = useCallback((id: string, event?: React.MouseEvent) => {
    if (event?.shiftKey && lastSelectedId) {
      // SHIFT + CLICK: Select range
      const ids = allIdsCache;
      const startIdx = ids.indexOf(lastSelectedId);
      const endIdx = ids.indexOf(id);

      if (startIdx !== -1 && endIdx !== -1) {
        const [start, end] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

        setSelectedIds(prev => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            next.add(ids[i]);
          }
          return next;
        });
      }
    } else if (event?.ctrlKey || event?.metaKey) {
      // CTRL/CMD + CLICK: Toggle single row
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      // NORMAL CLICK: Select only this row (or toggle if already selected)
      setSelectedIds(prev => {
        if (prev.has(id) && prev.size === 1) {
          // If only this is selected, deselect
          return new Set();
        } else {
          // Otherwise, select only this
          return new Set([id]);
        }
      });
    }
    setLastSelectedId(id);
  }, [lastSelectedId, allIdsCache]);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const isAllSelected = useCallback((ids: string[]) => {
    return ids.length > 0 && ids.every(id => selectedIds.has(id));
  }, [selectedIds]);

  const isPartiallySelected = useCallback((ids: string[]) => {
    return selectedIds.size > 0 && selectedIds.size < ids.length;
  }, [selectedIds]);

  return {
    selectedIds,
    toggleSelection,
    clearSelection,
    selectAll,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    selectedCount: selectedIds.size,
  };
}
