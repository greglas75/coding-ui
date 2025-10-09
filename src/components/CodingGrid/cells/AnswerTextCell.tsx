import type { FC } from 'react';

interface AnswerTextCellProps {
  text: string;
  translation?: string | null;
}

export const AnswerTextCell: FC<AnswerTextCellProps> = ({
  text,
  translation: _translation  // Keep prop but don't use it
}) => {
  return (
    <div className="text-sm text-zinc-800 dark:text-zinc-100">
      {text || '—'}
    </div>
  );
};
