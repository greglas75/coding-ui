// ═══════════════════════════════════════════════════════════════
// 🚀 Virtualized Code List Table - Optimized for large datasets
// ═══════════════════════════════════════════════════════════════

import { memo, useCallback, useMemo, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';
import type { Category, CodeWithCategories } from '../types';
import { simpleLogger } from '../utils/logger';

interface VirtualizedCodeListTableProps {
  codes: CodeWithCategories[];
  categories: Category[];
  codeUsageCounts: Record<number, number>;
  onUpdateName: (id: number, name: string) => void;
  onToggleWhitelist: (id: number, isWhitelisted: boolean) => void;
  onUpdateCategories: (id: number, categoryIds: number[]) => void;
  onDelete: (id: number, name: string) => void;
  rowHeight?: number;
}

// ───────────────────────────────────────────────────────────────
// Row Component (Memoized for performance)
// ───────────────────────────────────────────────────────────────

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    codes: CodeWithCategories[];
    categories: Category[];
    codeUsageCounts: Record<number, number>;
    editingName: number | null;
    editingCategories: number | null;
    tempName: string;
    savingName: boolean;
    successAnimation: Set<number>;
    onStartEditName: (code: CodeWithCategories) => void;
    onSaveName: (codeId: number) => void;
    onCancelEditName: () => void;
    onStartEditCategories: (code: CodeWithCategories) => void;
    onSaveCategories: (codeId: number) => void;
    onCancelEditCategories: () => void;
    onTempNameChange: (value: string) => void;
    onToggleWhitelist: (id: number, isWhitelisted: boolean) => void;
    onDelete: (id: number, name: string) => void;
    formatDate: (dateString: string | null | undefined) => string;
  };
}

const CodeRow = memo<RowProps>(({ index, style, data }) => {
  const {
    codes,
    categories,
    codeUsageCounts,
    editingName,
    editingCategories,
    tempName,
    savingName,
    successAnimation,
    onStartEditName,
    onSaveName,
    onCancelEditName,
    onStartEditCategories,
    onSaveCategories,
    onCancelEditCategories,
    onTempNameChange,
    onToggleWhitelist,
    onDelete,
    formatDate,
  } = data;

  const code = codes[index];

  return (
    <div
      style={style}
      className={`flex items-center border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900 transition-colors px-3 ${
        successAnimation.has(code.id) ? 'animate-pulse bg-green-50 dark:bg-green-900/20' : ''
      }`}
    >
      {/* Name (flex-1) */}
      <div className="flex-1 py-2 pr-3 min-w-0">
        {editingName === code.id ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tempName}
              onChange={(e) => onTempNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveName(code.id);
                if (e.key === 'Escape') onCancelEditName();
              }}
              className="flex-1 px-2 py-1 text-sm border border-zinc-300 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              autoFocus
            />
            <button
              onClick={() => onSaveName(code.id)}
              disabled={savingName}
              className="text-green-600 hover:text-green-700 p-1 rounded disabled:opacity-50"
              title="Save"
            >
              ✓
            </button>
            <button
              onClick={onCancelEditName}
              className="text-red-600 hover:text-red-700 p-1 rounded"
              title="Cancel"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStartEditName(code)}
            className="text-sm font-medium text-zinc-800 dark:text-zinc-100 hover:text-blue-600 text-left truncate w-full"
          >
            {code.name}
          </button>
        )}
      </div>

      {/* Categories (w-48) */}
      <div className="w-48 py-2 px-3">
        {editingCategories === code.id ? (
          <div className="text-xs">
            <button
              onClick={() => onSaveCategories(code.id)}
              className="text-green-600 mr-2"
            >
              Save
            </button>
            <button
              onClick={onCancelEditCategories}
              className="text-zinc-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {code.category_ids.slice(0, 2).map(categoryId => {
              const category = categories.find(c => c.id === categoryId);
              return category ? (
                <span
                  key={categoryId}
                  className="inline-flex items-center px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded dark:bg-blue-900/20 dark:text-blue-300"
                >
                  {category.name}
                </span>
              ) : null;
            })}
            {code.category_ids.length > 2 && (
              <span className="text-xs text-zinc-500">+{code.category_ids.length - 2}</span>
            )}
            <button
              onClick={() => onStartEditCategories(code)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Whitelist (w-24) */}
      <div className="w-24 py-2 px-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={code.is_whitelisted}
            onChange={(e) => onToggleWhitelist(code.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            {code.is_whitelisted ? 'Yes' : 'No'}
          </span>
        </label>
      </div>

      {/* Mentions (w-24) */}
      <div className="w-24 py-2 px-3 text-center">
        {codeUsageCounts[code.id] !== undefined ? (
          codeUsageCounts[code.id] > 0 ? (
            <span className="px-2 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded">
              {codeUsageCounts[code.id]}
            </span>
          ) : (
            <span className="text-gray-400 text-sm">0</span>
          )
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        )}
      </div>

      {/* Dates (w-28 each) */}
      <div className="w-28 py-2 px-3 text-xs text-zinc-500 truncate">
        {formatDate(code.created_at)}
      </div>

      <div className="w-28 py-2 px-3 text-xs text-zinc-500 truncate">
        {formatDate(code.updated_at)}
      </div>

      {/* Actions (w-24) */}
      <div className="w-24 py-2 px-3">
        {codeUsageCounts[code.id] && codeUsageCounts[code.id] > 0 ? (
          <button
            disabled
            className="px-2 py-1 text-xs bg-gray-300 text-gray-500 rounded cursor-not-allowed"
            title={`Cannot delete: Used in ${codeUsageCounts[code.id]} answer(s)`}
          >
            Delete
          </button>
        ) : (
          <button
            onClick={() => onDelete(code.id, code.name)}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
});

CodeRow.displayName = 'CodeRow';

// ───────────────────────────────────────────────────────────────
// Main Component
// ───────────────────────────────────────────────────────────────

export const VirtualizedCodeListTable = memo<VirtualizedCodeListTableProps>(({
  codes,
  categories,
  codeUsageCounts,
  onUpdateName,
  onToggleWhitelist,
  onUpdateCategories,
  onDelete,
  rowHeight = 52,
}) => {
  const [editingName, setEditingName] = useState<number | null>(null);
  const [editingCategories, setEditingCategories] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempCategoryIds, setTempCategoryIds] = useState<number[]>([]);
  const [savingName, setSavingName] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState<Set<number>>(new Set());

  const startEditingName = useCallback((code: CodeWithCategories) => {
    setEditingName(code.id);
    setTempName(code.name);
  }, []);

  const saveName = useCallback(async (codeId: number) => {
    if (!tempName.trim() || tempName.trim().length > 100) return;

    setSavingName(true);
    try {
      await onUpdateName(codeId, tempName.trim());
      setEditingName(null);
      setTempName('');

      setSuccessAnimation(prev => new Set(prev).add(codeId));
      setTimeout(() => {
        setSuccessAnimation(prev => {
          const newSet = new Set(prev);
          newSet.delete(codeId);
          return newSet;
        });
      }, 1000);
    } catch (error) {
      simpleLogger.error('Error saving code name:', error);
    } finally {
      setSavingName(false);
    }
  }, [tempName, onUpdateName]);

  const cancelEditingName = useCallback(() => {
    setEditingName(null);
    setTempName('');
  }, []);

  const startEditingCategories = useCallback((code: CodeWithCategories) => {
    setEditingCategories(code.id);
    setTempCategoryIds([...code.category_ids]);
  }, []);

  const saveCategories = useCallback((codeId: number) => {
    onUpdateCategories(codeId, tempCategoryIds);
    setEditingCategories(null);
    setTempCategoryIds([]);
  }, [tempCategoryIds, onUpdateCategories]);

  const cancelEditingCategories = useCallback(() => {
    setEditingCategories(null);
    setTempCategoryIds([]);
  }, []);

  const toggleCategory = useCallback((categoryId: number) => {
    setTempCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const formatDate = useCallback((dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }, []);

  // Memoize row data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    codes,
    categories,
    codeUsageCounts,
    editingName,
    editingCategories,
    tempName,
    tempCategoryIds,
    savingName,
    successAnimation,
    onStartEditName: startEditingName,
    onSaveName: saveName,
    onCancelEditName: cancelEditingName,
    onStartEditCategories: startEditingCategories,
    onSaveCategories: saveCategories,
    onCancelEditCategories: cancelEditingCategories,
    onToggleCategory: toggleCategory,
    onTempNameChange: setTempName,
    onToggleWhitelist,
    onDelete,
    formatDate,
  }), [
    codes,
    categories,
    codeUsageCounts,
    editingName,
    editingCategories,
    tempName,
    tempCategoryIds,
    savingName,
    successAnimation,
    startEditingName,
    saveName,
    cancelEditingName,
    startEditingCategories,
    saveCategories,
    cancelEditingCategories,
    toggleCategory,
    onToggleWhitelist,
    onDelete,
    formatDate,
  ]);

  return (
    <div className="relative h-[60vh] bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-700 flex items-center text-xs font-medium uppercase tracking-wide text-zinc-500 px-3 py-2">
        <div className="flex-1 pr-3">Code</div>
        <div className="w-48 px-3">Categories</div>
        <div className="w-24 px-3">Whitelist</div>
        <div className="w-24 px-3 text-center">Mentions</div>
        <div className="w-28 px-3">Added</div>
        <div className="w-28 px-3">Edited</div>
        <div className="w-24 px-3">Actions</div>
      </div>

      {/* Virtualized List */}
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height - 40} // Subtract header height
            itemCount={codes.length}
            itemSize={rowHeight}
            width={width}
            itemData={itemData}
            overscanCount={5}
          >
            {CodeRow}
          </List>
        )}
      </AutoSizer>

      {/* Empty State */}
      {codes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No codes found</p>
        </div>
      )}
    </div>
  );
});

VirtualizedCodeListTable.displayName = 'VirtualizedCodeListTable';

