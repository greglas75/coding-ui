import type { FC } from 'react';
import { CANONICAL_STATUS, getStatusLabel, normalizeStatus } from '../../../lib/statusNormalization';

interface StatusCellProps {
  status: string | null;
}

export const StatusCell: FC<StatusCellProps> = ({ status }) => {
  if (!status || status === 'uncategorized') {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 h-[28px] min-w-[90px] max-w-[140px] leading-none whitespace-nowrap overflow-hidden text-ellipsis">
        Not Categorized
      </span>
    );
  }

  const canonicalStatus = normalizeStatus(status);
  const displayLabel = getStatusLabel(canonicalStatus);

  const statusColors: Record<string, string> = {
    [CANONICAL_STATUS.WHITELIST]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    [CANONICAL_STATUS.BLACKLIST]: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 font-semibold',
    [CANONICAL_STATUS.GLOBAL_BLACKLIST]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    [CANONICAL_STATUS.IGNORED]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    [CANONICAL_STATUS.CATEGORIZED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    [CANONICAL_STATUS.OTHER]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  };

  const colorClass = statusColors[canonicalStatus] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium h-[28px] min-w-[90px] max-w-[140px] leading-none whitespace-nowrap overflow-hidden text-ellipsis ${colorClass}`}>
      {displayLabel}
    </span>
  );
};
