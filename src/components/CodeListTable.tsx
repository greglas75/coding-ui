/**
 * Code List Table Component
 * Displays codes with editing capabilities
 * Desktop: table view, Mobile: card view
 */

import type { Category, CodeWithCategories } from '../types';
import { formatDate } from '../lib/dateUtils';
import { useCodeListState } from './CodeListTable/useCodeListState';
import { useCodeActions } from './CodeListTable/useCodeActions';
import { useSorting } from './CodeListTable/useSorting';
import { DesktopView } from './CodeListTable/DesktopView';
import { MobileView } from './CodeListTable/MobileView';

interface CodeListTableProps {
  codes: CodeWithCategories[];
  categories: Category[];
  codeUsageCounts: Record<number, number>;
  onUpdateName: (id: number, name: string) => void;
  onToggleWhitelist: (id: number, isWhitelisted: boolean) => void;
  onUpdateCategories: (id: number, categoryIds: number[]) => void;
  onDelete: (id: number, name: string) => void;
  onRecountMentions: (codeName: string) => Promise<number>;
}

export function CodeListTable({
  codes,
  categories,
  codeUsageCounts,
  onUpdateName,
  onToggleWhitelist,
  onUpdateCategories,
  onDelete,
  onRecountMentions: _onRecountMentions,
}: CodeListTableProps) {
  // State management
  const state = useCodeListState();

  // Sorting logic
  const { handleSort, sortedCodes } = useSorting({
    codes,
    sortField: state.sortField,
    sortOrder: state.sortOrder,
    setSortField: state.setSortField,
    setSortOrder: state.setSortOrder,
  });

  // Action handlers
  const actions = useCodeActions({
    onUpdateName,
    onUpdateCategories,
    setEditingName: state.setEditingName,
    setEditingCategories: state.setEditingCategories,
    setTempName: state.setTempName,
    setTempCategories: state.setTempCategories,
    setSavingName: state.setSavingName,
    setSuccessAnimation: state.setSuccessAnimation,
    tempName: state.tempName,
    tempCategories: state.tempCategories,
  });

  return (
    <div className="relative overflow-auto max-h-[60vh]">
      <DesktopView
        sortedCodes={sortedCodes}
        categories={categories}
        codeUsageCounts={codeUsageCounts}
        editingName={state.editingName}
        editingCategories={state.editingCategories}
        tempName={state.tempName}
        tempCategories={state.tempCategories}
        savingName={state.savingName}
        successAnimation={state.successAnimation}
        sortField={state.sortField}
        sortOrder={state.sortOrder}
        onSort={handleSort}
        onStartEditingName={actions.startEditingName}
        onSaveName={actions.saveName}
        onCancelEditingName={actions.cancelEditingName}
        onStartEditingCategories={actions.startEditingCategories}
        onToggleCategory={actions.toggleCategory}
        onSaveCategories={actions.saveCategories}
        onCancelEditingCategories={actions.cancelEditingCategories}
        onToggleWhitelist={onToggleWhitelist}
        onDelete={onDelete}
        setTempName={state.setTempName}
        formatDate={formatDate}
      />

      <MobileView
        sortedCodes={sortedCodes}
        categories={categories}
        codeUsageCounts={codeUsageCounts}
        editingName={state.editingName}
        tempName={state.tempName}
        savingName={state.savingName}
        successAnimation={state.successAnimation}
        onStartEditingName={actions.startEditingName}
        onSaveName={actions.saveName}
        onCancelEditingName={actions.cancelEditingName}
        onToggleWhitelist={onToggleWhitelist}
        onDelete={onDelete}
        setTempName={state.setTempName}
      />
    </div>
  );
}
