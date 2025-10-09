import type { FC } from 'react';

interface StatusCellProps {
  status: string | null;
}

export const StatusCell: FC<StatusCellProps> = ({ status }) => {
  if (status === 'whitelist') {
    return (
      <span className="px-2 py-1 rounded-md text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
        {status}
      </span>
    );
  }

  return (
    <span className="px-2 py-1 rounded-md text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
      {status ?? '—'}
    </span>
  );
};
