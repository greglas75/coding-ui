import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList } from 'react-window';
import type { Answer } from '../../types';
import { MobileCard } from './rows/MobileCard';

interface VirtualizedMobileListProps {
  answers: Answer[];
  selectedIds: Set<string>;
  focusedRowId: number | null;
  rowAnimations: Record<number, string>;
  onSelect: (answerId: number) => void;
  onToggleSelection: (id: string, event: React.MouseEvent) => void;
  onQuickStatus: (answer: Answer, key: string) => void;
  onCodeClick: (answer: Answer) => void;
  onRollback: (answer: Answer) => void;
  formatDate: (date: string | null) => string;
}

const ROW_HEIGHT = 360;
const DEFAULT_HEIGHT = ROW_HEIGHT * 3;
const DEFAULT_WIDTH = 600;

export function VirtualizedMobileList({
  answers,
  selectedIds,
  focusedRowId,
  rowAnimations,
  onSelect,
  onToggleSelection,
  onQuickStatus,
  onCodeClick,
  onRollback,
  formatDate,
}: VirtualizedMobileListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const answer = answers[index];

    if (!answer) return null;

    return (
      <div style={style} className="px-2">
        <MobileCard
          answer={answer}
          isFocused={focusedRowId === answer.id}
          isSelected={selectedIds.has(String(answer.id))}
          rowAnimation={rowAnimations[answer.id] || ''}
          onClick={() => onSelect(answer.id)}
          onQuickStatus={onQuickStatus}
          onCodeClick={() => onCodeClick(answer)}
          onRollback={() => onRollback(answer)}
          onToggleSelection={onToggleSelection}
          onFocus={() => onSelect(answer.id)}
          formatDate={formatDate}
        />
      </div>
    );
  };

  return (
    <AutoSizer defaultHeight={DEFAULT_HEIGHT} defaultWidth={DEFAULT_WIDTH}>
      {({ height, width }) => (
        <FixedSizeList
          height={Math.max(height ?? DEFAULT_HEIGHT, ROW_HEIGHT)}
          width={Math.max(width ?? DEFAULT_WIDTH, 320)}
          itemCount={answers.length}
          itemSize={ROW_HEIGHT}
          overscanCount={4}
        >
          {Row}
        </FixedSizeList>
      )}
    </AutoSizer>
  );
}

