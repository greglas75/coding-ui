import clsx from 'clsx';
import { RotateCcw } from 'lucide-react';
import { memo, type FC } from 'react';

interface CodeCellProps {
  answerId: number;
  selectedCode: string | null;
  generalStatus: string | null;
  codingDate: string | null;
  onClick: () => void;
  onRollback?: () => void;
  disabled?: boolean;
}

const CodeCellComponent: FC<CodeCellProps> = ({
  answerId: _answerId, // Kept for future use in analytics/tracking
  selectedCode,
  generalStatus,
  codingDate,
  onClick,
  onRollback,
  disabled = false
}) => {
  // Format date and time in one line
  const formatDateTime = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dateStr} ${timeStr}`;
  };

  const formattedDateTime = formatDateTime(codingDate);

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

  const showRollbackIcon = generalStatus === 'whitelist' && onRollback;

  return (
    <div className="flex items-center gap-1 max-h-[52px] overflow-hidden">
      <button
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClick();
        }}
        disabled={disabled}
        title={selectedCode ? `${selectedCode}${formattedDateTime ? ' • ' + formattedDateTime : ''}` : 'Click to assign codes'}
        className={clsx(
          'flex-1 text-left px-2 py-1 text-sm border rounded transition-colors cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed truncate max-w-[200px]',
          selectedCode
            ? 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30'
            : 'border-zinc-300 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
        )}
      >
        {selectedCode || 'Click to select code...'}
      </button>

      {showRollbackIcon && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRollback();
          }}
          title="Rollback to uncategorized"
          className="p-1 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:text-orange-400 dark:hover:bg-orange-900/20 rounded transition-all hover:scale-110 focus:ring-2 focus:ring-orange-500 focus:outline-none flex-shrink-0"
        >
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
};

export const CodeCell = memo(CodeCellComponent);
