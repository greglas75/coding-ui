import type { FC } from 'react';

interface SortableHeaderProps {
  label: string;
  field: string;
  currentSortField: string | null;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  className?: string;
}

export const SortableHeader: FC<SortableHeaderProps> = ({
  label,
  field,
  currentSortField,
  sortOrder,
  onSort,
  className = ''
}) => {
  const isActive = currentSortField === field;

  return (
    <th
      onClick={() => onSort(field)}
      className={`text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${className}`}
      title={`Sort by ${label}`}
    >
      {label}
      {isActive && (
        <span className="ml-1">
          {sortOrder === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  );
};
