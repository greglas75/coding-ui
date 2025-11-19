import { memo, type FC } from 'react';

interface AnswerTextCellProps {
  text: string;
  translation?: string | null;
}

const AnswerTextCellComponent: FC<AnswerTextCellProps> = ({
  text,
  translation: _translation  // Keep prop but don't use it
}) => {
  return (
    <div className="text-sm text-zinc-800 dark:text-zinc-100">
      {text || '—'}
    </div>
  );
};

export const AnswerTextCell = memo(AnswerTextCellComponent);
