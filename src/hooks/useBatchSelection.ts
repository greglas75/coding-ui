import { useCallback, useEffect, useState } from 'react';

export function useBatchSelection(initialIds: string[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>(initialIds);

  const setIds = useCallback((ids: string[]) => {
    setOrderedIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  // Remove selections that no longer exist when the ordered list changes
  useEffect(() => {
    setSelectedIds(prev => {
      const filtered = Array.from(prev).filter(id => orderedIds.includes(id));
      if (filtered.length === prev.size) {
        return prev;
      }
      return new Set(filtered);
    });
  }, [orderedIds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSelectedIds(new Set(orderedIds));
      }
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderedIds, clearSelection]);

  const toggleSelection = useCallback(
    (id: string, event?: React.MouseEvent) => {
      if (event?.shiftKey && lastSelectedId) {
        const startIdx = orderedIds.indexOf(lastSelectedId);
        const endIdx = orderedIds.indexOf(id);

        if (startIdx !== -1 && endIdx !== -1) {
          const [start, end] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

          setSelectedIds(prev => {
            const next = new Set(prev);
            for (let i = start; i <= end; i++) {
              next.add(orderedIds[i]);
            }
            return next;
          });
        }
      } else if (event?.ctrlKey || event?.metaKey) {
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
        setSelectedIds(prev => {
          if (prev.has(id) && prev.size === 1) {
            return new Set();
          }
          return new Set([id]);
        });
      }
      setLastSelectedId(id);
    },
    [lastSelectedId, orderedIds]
  );

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id);
    },
    [selectedIds]
  );

  const isAllSelected = useCallback(
    (ids: string[]) => {
      return ids.length > 0 && ids.every(id => selectedIds.has(id));
    },
    [selectedIds]
  );

  const isPartiallySelected = useCallback(
    (ids: string[]) => {
      return selectedIds.size > 0 && selectedIds.size < ids.length;
    },
    [selectedIds]
  );

  return {
    selectedIds,
    toggleSelection,
    clearSelection,
    selectAll,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    selectedCount: selectedIds.size,
    setIds,
  };
}
