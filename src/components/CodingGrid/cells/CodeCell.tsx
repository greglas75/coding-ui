import clsx from 'clsx';
import type { FC } from 'react';

interface CodeCellProps {
  answerId: number;
  selectedCode: string | null;
  generalStatus: string | null;
  onClick: () => void;
  disabled?: boolean;
}

export const CodeCell: FC<CodeCellProps> = ({
  answerId: _answerId, // Kept for future use in analytics/tracking
  selectedCode,
  generalStatus,
  onClick,
  disabled = false
}) => {
  // Global blacklist items cannot have codes assigned
  if (generalStatus === 'global_blacklist') {
    return (
      <div
        className="w-full text-left px-2 py-1 text-sm border border-zinc-300 rounded bg-zinc-100 text-zinc-400 cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500"
        title="Codes cannot be assigned to global blacklist items"
      >
        —
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={selectedCode ? 'Click to edit codes' : 'Click to assign codes'}
      className={clsx(
        'w-full text-left px-2 py-1 text-sm border rounded transition-colors cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        selectedCode
          ? 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30'
          : 'border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
      )}
    >
      {selectedCode || 'Click to select code...'}
    </button>
  );
};
