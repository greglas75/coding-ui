import { TableHeader } from '../toolbars/TableHeader';
import { DesktopRow } from '../rows/DesktopRow';
import { VirtualizedTable } from '../VirtualizedTable';
import type { Answer } from '../../../types';
import { simpleLogger } from '../../../utils/logger';
import type { BatchSelection } from '../../../hooks/useBatchSelection';
import type { BatchAIProcessor } from '../../../lib/batchAIProcessor';
import { formatRowDate } from '../utils/dateFormatter';

interface DesktopTableViewProps {
  isTestEnv: boolean;
  localAnswers: Answer[];
  focusedRowId: number | null;
  setFocusedRowId: (id: number | null) => void;
  batchSelection: BatchSelection;
  answerActions: {
    isCategorizingRow: Record<number, boolean>;
    handleQuickStatus: (answer: Answer, key: string) => void;
    handleSingleAICategorize: (answerId: number) => void;
  };
  rowAnimations: Record<number, string>;
  filtering: {
    sortField: keyof Answer | null;
    sortOrder: 'asc' | 'desc';
    handleSort: (field: keyof Answer) => void;
  };
  modals: {
    handleCodeClick: (answer: Answer) => void;
  };
  cellPad: string;
  handleRowFocus: (answerId: number) => void;
  handleRowClick: (answerId: number) => void;
  handleToggleSelection: (id: string, event: React.MouseEvent) => void;
  handleAcceptSuggestionWrapper: (answerId: number, suggestion: any) => Promise<void>;
  handleQuickRollback: (answer: Answer) => Promise<void>;
  handleBatchAI: () => Promise<void>;
  batchProcessor: BatchAIProcessor;
}

export function DesktopTableView({
  isTestEnv,
  localAnswers,
  focusedRowId,
  setFocusedRowId,
  batchSelection,
  answerActions,
  rowAnimations,
  filtering,
  modals,
  cellPad,
  handleRowFocus,
  handleRowClick,
  handleToggleSelection,
  handleAcceptSuggestionWrapper,
  handleQuickRollback,
  handleBatchAI,
  batchProcessor,
}: DesktopTableViewProps) {
  if (isTestEnv) {
    return (
      <div
        className="hidden md:block relative overflow-auto max-h-[60vh]"
        data-grid-container
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            simpleLogger.info('🧹 Clearing focus - clicked on table container');
            setFocusedRowId(null);
          }
        }}
      >
        <table
          className="w-full border-collapse min-w-[900px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              simpleLogger.info('🧹 Clearing focus - clicked on table element');
              setFocusedRowId(null);
            }
          }}
        >
          <TableHeader
            cellPad={cellPad}
            sortField={filtering.sortField}
            sortOrder={filtering.sortOrder}
            onSort={filtering.handleSort}
            isAllSelected={batchSelection.isAllSelected(localAnswers.map((a) => String(a.id)))}
            onSelectAll={() => {
              if (batchSelection.isAllSelected(localAnswers.map((a) => String(a.id)))) {
                batchSelection.clearSelection();
              } else {
                batchSelection.selectAll(localAnswers.map((a) => String(a.id)));
              }
            }}
            onClearAll={batchSelection.clearSelection}
            onBulkAICategorize={handleBatchAI}
            isBulkCategorizing={batchProcessor.getProgress().status === 'running'}
            visibleCount={localAnswers.length}
          />
          <tbody
            data-answer-container
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                simpleLogger.info('🧹 Clearing focus - clicked on tbody element');
                setFocusedRowId(null);
              }
            }}
          >
            {localAnswers.map((answer) => (
              <DesktopRow
                key={answer.id}
                answer={answer}
                isFocused={focusedRowId === answer.id}
                isSelected={batchSelection.isSelected(String(answer.id))}
                isCategorizing={answerActions.isCategorizingRow[answer.id] || false}
                isAccepting={false}
                rowAnimation={rowAnimations[answer.id] || ''}
                onFocus={() => handleRowFocus(answer.id)}
                onClick={() => handleRowClick(answer.id)}
                onToggleSelection={handleToggleSelection}
                onQuickStatus={(ans, key) => answerActions.handleQuickStatus(ans, key)}
                onCodeClick={() => modals.handleCodeClick(answer)}
                onRollback={() => handleQuickRollback(answer)}
                onAcceptSuggestion={(suggestion) =>
                  handleAcceptSuggestionWrapper(answer.id, suggestion)
                }
                onRegenerateSuggestions={() => answerActions.handleSingleAICategorize(answer.id)}
                formatDate={formatRowDate}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className="hidden md:block relative"
      data-grid-container
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          simpleLogger.info('🧹 Clearing focus - clicked on table container');
          setFocusedRowId(null);
        }
      }}
    >
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse min-w-[900px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              simpleLogger.info('🧹 Clearing focus - clicked on table element');
              setFocusedRowId(null);
            }
          }}
        >
          <TableHeader
            cellPad={cellPad}
            sortField={filtering.sortField}
            sortOrder={filtering.sortOrder}
            onSort={filtering.handleSort}
            isAllSelected={batchSelection.isAllSelected(localAnswers.map((a) => String(a.id)))}
            onSelectAll={() => {
              if (batchSelection.isAllSelected(localAnswers.map((a) => String(a.id)))) {
                batchSelection.clearSelection();
              } else {
                batchSelection.selectAll(localAnswers.map((a) => String(a.id)));
              }
            }}
            onClearAll={batchSelection.clearSelection}
            onBulkAICategorize={handleBatchAI}
            isBulkCategorizing={batchProcessor.getProgress().status === 'running'}
            visibleCount={localAnswers.length}
          />
        </table>
      </div>
      <div
        className="mt-0 h-[60vh]"
        data-answer-container
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            simpleLogger.info('🧹 Clearing focus - clicked on tbody element');
            setFocusedRowId(null);
          }
        }}
      >
        <VirtualizedTable
          answers={localAnswers}
          focusedRowId={focusedRowId}
          selectedIds={batchSelection.selectedIds}
          isCategorizingRow={answerActions.isCategorizingRow}
          rowAnimations={rowAnimations}
          onFocus={handleRowFocus}
          onClick={handleRowClick}
          onToggleSelection={handleToggleSelection}
          onQuickStatus={(answer, key) => answerActions.handleQuickStatus(answer, key)}
          onCodeClick={(answer) => modals.handleCodeClick(answer)}
          onRollback={(answer) => handleQuickRollback(answer)}
          onAcceptSuggestion={(answerId, suggestion) =>
            handleAcceptSuggestionWrapper(answerId, suggestion)
          }
          onRegenerateSuggestions={(answerId) => answerActions.handleSingleAICategorize(answerId)}
          formatDate={formatRowDate}
        />
      </div>
    </div>
  );
}

