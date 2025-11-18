import { MobileCard } from '../rows/MobileCard';
import { VirtualizedMobileList } from '../VirtualizedMobileList';
import type { Answer } from '../../../types';
import { simpleLogger } from '../../../utils/logger';
import type { BatchSelection } from '../../../hooks/useBatchSelection';
import { formatRowDate } from '../utils/dateFormatter';

interface MobileListViewProps {
  isTestEnv: boolean;
  localAnswers: Answer[];
  focusedRowId: number | null;
  setFocusedRowId: (id: number | null) => void;
  batchSelection: BatchSelection;
  answerActions: {
    handleQuickStatus: (answer: Answer, key: string) => void;
  };
  rowAnimations: Record<number, string>;
  modals: {
    handleCodeClick: (answer: Answer) => void;
  };
  handleToggleSelection: (id: string, event: React.MouseEvent) => void;
  handleQuickRollback: (answer: Answer) => Promise<void>;
}

export function MobileListView({
  isTestEnv,
  localAnswers,
  focusedRowId,
  setFocusedRowId,
  batchSelection,
  answerActions,
  rowAnimations,
  modals,
  handleToggleSelection,
  handleQuickRollback,
}: MobileListViewProps) {
  if (isTestEnv) {
    return (
      <div
        className="md:hidden space-y-3 p-4"
        data-grid-container
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            simpleLogger.info('🧹 Clearing focus - clicked on mobile container');
            setFocusedRowId(null);
          }
        }}
      >
        {localAnswers.map((answer) => (
          <MobileCard
            key={answer.id}
            answer={answer}
            isFocused={focusedRowId === answer.id}
            isSelected={batchSelection.isSelected(String(answer.id))}
            rowAnimation={rowAnimations[answer.id] || ''}
            onFocus={() => setFocusedRowId(answer.id)}
            onClick={() => setFocusedRowId(answer.id)}
            onToggleSelection={handleToggleSelection}
            onQuickStatus={(ans, key) => answerActions.handleQuickStatus(ans, key)}
            onCodeClick={() => modals.handleCodeClick(answer)}
            onRollback={() => handleQuickRollback(answer)}
            formatDate={formatRowDate}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="md:hidden h-[70vh] p-4"
      data-grid-container
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          simpleLogger.info('🧹 Clearing focus - clicked on mobile container');
          setFocusedRowId(null);
        }
      }}
    >
      <VirtualizedMobileList
        answers={localAnswers}
        selectedIds={batchSelection.selectedIds}
        focusedRowId={focusedRowId}
        rowAnimations={rowAnimations}
        onSelect={setFocusedRowId}
        onToggleSelection={handleToggleSelection}
        onQuickStatus={(answer, key) => answerActions.handleQuickStatus(answer, key)}
        onCodeClick={(answer) => modals.handleCodeClick(answer)}
        onRollback={(answer) => handleQuickRollback(answer)}
        formatDate={formatRowDate}
      />
    </div>
  );
}

