/**
 * 📱 Responsive Table Component
 *
 * Automatically switches between table and card layout based on screen size.
 *
 * Benefits:
 * - Mobile: Card layout (stacked vertically)
 * - Desktop: Traditional table layout
 * - No horizontal scrolling on mobile
 * - Touch-friendly on mobile
 * - Professional on desktop
 */

import { type ReactNode } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

export interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  mobileHidden?: boolean; // Hide this column on mobile
  sortable?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  mobileCardRender?: (item: T) => ReactNode; // Custom mobile card view
  emptyMessage?: string;
}

/**
 * Responsive table that adapts to screen size
 *
 * Usage:
 * ```tsx
 * <ResponsiveTable
 *   data={items}
 *   columns={[
 *     { key: 'name', label: 'Name', render: (item) => item.name },
 *     { key: 'status', label: 'Status', render: (item) => item.status, mobileHidden: true },
 *   ]}
 *   keyExtractor={(item) => item.id}
 *   onRowClick={(item) => handleRowClick(item)}
 * />
 * ```
 */
export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  mobileCardRender,
  emptyMessage = 'No data available',
}: ResponsiveTableProps<T>) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Empty state
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Mobile: Card Layout
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-zinc-700 transition-colors hover:border-blue-500 dark:hover:border-blue-400"
            onClick={() => onRowClick?.(item)}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={(e) => {
              if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onRowClick(item);
              }
            }}
          >
            {mobileCardRender ? (
              mobileCardRender(item)
            ) : (
              <div className="space-y-2">
                {columns
                  .filter((col) => !col.mobileHidden)
                  .map((col) => (
                    <div key={col.key} className="flex justify-between items-start gap-3">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">
                        {col.label}:
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100 text-right flex-1">
                        {col.render(item)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Desktop: Table Layout
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-zinc-700 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
        <thead className="bg-gray-50 dark:bg-zinc-900">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-zinc-700">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(item);
                }
              }}
              tabIndex={onRowClick ? 0 : undefined}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
