import clsx from 'clsx';
import { CheckSquare, Loader2, Sparkles, Square } from 'lucide-react';
import type { FC } from 'react';
import type { Answer } from '../../../types';
import { CodeCell } from '../cells/CodeCell';
import { QuickStatusButtons } from '../cells/QuickStatusButtons';
import { StatusCell } from '../cells/StatusCell';

interface MobileCardProps {
  answer: Answer;
  isSelected: boolean;
  isFocused: boolean;
  isCategorizing: boolean;
  rowAnimation: string;
  onToggleSelection: (id: string, event: React.MouseEvent) => void;
  onFocus: () => void;
  onClick: (e: React.MouseEvent) => void;
  onQuickStatus: (answer: Answer, key: any) => void;
  onCodeClick: () => void;
  onAICategorize: () => void;
  formatDate: (date: string | null | undefined) => string;
}

export const MobileCard: FC<MobileCardProps> = ({
  answer,
  isSelected,
  isFocused,
  isCategorizing,
  rowAnimation,
  onToggleSelection: _onToggleSelection, // TODO: Add selection UI to mobile cards
  onFocus: _onFocus, // TODO: Add focus handling to mobile cards
  onClick,
  onQuickStatus,
  onCodeClick,
  onAICategorize,
  formatDate
}) => {
  return (
    <div
      data-answer-id={answer.id}
      onClick={onClick}
      className={clsx(
        "rounded-xl border p-3 mb-3 transition-all cursor-pointer relative",
        isFocused
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",
        isSelected && "bg-blue-50 dark:bg-blue-950 border-blue-300",
        rowAnimation
      )}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 left-3">
        {isSelected ? (
          <CheckSquare size={20} className="text-blue-600 dark:text-blue-400" />
        ) : (
          <Square size={20} className="text-gray-400 dark:text-gray-500" />
        )}
      </div>

      {/* Focused Indicator */}
      {isFocused && (
        <div className="mb-2 text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
          <span>✓</span> Focused (use keyboard shortcuts)
        </div>
      )}

      {/* Date and Language */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-zinc-600 dark:text-zinc-300">
          {formatDate(answer.created_at)}
        </span>
        {answer.language && (
          <span className="text-xs text-zinc-500 dark:text-zinc-300">
            {answer.language}
          </span>
        )}
      </div>

      {/* Answer */}
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
          Answer:
        </div>
        <div className="text-sm text-zinc-700 dark:text-zinc-200">
          {answer.answer_text}
        </div>
      </div>

      {/* Translation */}
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
          Translation:
        </div>
        {answer.translation_en ? (
          <div className="max-w-full text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {answer.translation_en}
          </div>
        ) : (
          <span className="text-zinc-500 dark:text-zinc-300">—</span>
        )}
      </div>

      {/* Quick Status */}
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-2">
          Quick Status:
        </div>
        <QuickStatusButtons
          answer={answer}
          onStatusChange={onQuickStatus}
        />
      </div>

      {/* AI Actions */}
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-2">
          AI Actions:
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAICategorize();
          }}
          disabled={isCategorizing}
          className="px-3 py-2 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 bg-purple-50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
        >
          {isCategorizing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Categorizing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span className="text-sm">Generate AI Suggestions</span>
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
          Code:
        </div>
        <CodeCell
          answerId={answer.id}
          selectedCode={answer.selected_code}
          generalStatus={answer.general_status}
          onClick={onCodeClick}
        />
      </div>

      {/* Status */}
      <div>
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 mb-1">
          Status:
        </div>
        <StatusCell status={answer.general_status} />
      </div>
    </div>
  );
};
