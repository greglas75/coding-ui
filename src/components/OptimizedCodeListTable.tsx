// ═══════════════════════════════════════════════════════════════
// ⚡ Optimized Code List Table
// Automatically switches between normal and virtualized rendering
// based on dataset size
// ═══════════════════════════════════════════════════════════════

import { memo } from 'react';
import type { Category, CodeWithCategories } from '../types';
import { CodeListTable } from './CodeListTable';
import { VirtualizedCodeListTable } from './VirtualizedCodeListTable';

interface OptimizedCodeListTableProps {
  codes: CodeWithCategories[];
  categories: Category[];
  codeUsageCounts: Record<number, number>;
  onUpdateName: (id: number, name: string) => void;
  onToggleWhitelist: (id: number, isWhitelisted: boolean) => void;
  onUpdateCategories: (id: number, categoryIds: number[]) => void;
  onDelete: (id: number, name: string) => void;
  onRecountMentions: (codeName: string) => Promise<number>;
  virtualizationThreshold?: number;
  forceVirtualization?: boolean;
}

export const OptimizedCodeListTable = memo<OptimizedCodeListTableProps>(({
  codes,
  categories,
  codeUsageCounts,
  onUpdateName,
  onToggleWhitelist,
  onUpdateCategories,
  onDelete,
  onRecountMentions,
  virtualizationThreshold = 100,
  forceVirtualization = false,
}) => {
  const shouldVirtualize = forceVirtualization || codes.length > virtualizationThreshold;

  console.log(`📊 CodeListTable: ${codes.length} codes, virtualized: ${shouldVirtualize}`);

  if (shouldVirtualize) {
    return (
      <VirtualizedCodeListTable
        codes={codes}
        categories={categories}
        codeUsageCounts={codeUsageCounts}
        onUpdateName={onUpdateName}
        onToggleWhitelist={onToggleWhitelist}
        onUpdateCategories={onUpdateCategories}
        onDelete={onDelete}
      />
    );
  }

  return (
    <CodeListTable
      codes={codes}
      categories={categories}
      codeUsageCounts={codeUsageCounts}
      onUpdateName={onUpdateName}
      onToggleWhitelist={onToggleWhitelist}
      onUpdateCategories={onUpdateCategories}
      onDelete={onDelete}
      onRecountMentions={onRecountMentions}
    />
  );
});

OptimizedCodeListTable.displayName = 'OptimizedCodeListTable';

