import clsx from 'clsx';
import type { FC } from 'react';
import type { Answer } from '../../../types';
import { AISuggestionsCell } from '../cells/AISuggestionsCell';
import { AnswerTextCell } from '../cells/AnswerTextCell';
import { CodeCell } from '../cells/CodeCell';
import { QuickStatusButtons } from '../cells/QuickStatusButtons';
import { SelectionCell } from '../cells/SelectionCell';
import { StatusCell } from '../cells/StatusCell';

interface DesktopRowProps {
  answer: Answer;
  cellPad: string;
  isSelected: boolean;
  isFocused: boolean;
  isCategorizing: boolean;
  isAccepting: boolean;
  rowAnimation: string;
  onToggleSelection: (id: string, event: React.MouseEvent) => void;
  onFocus: () => void;
  onClick: (e: React.MouseEvent) => void;
  onQuickStatus: (answer: Answer, key: any) => void;
  onCodeClick: () => void;
  onAICategorize: () => void;
  onAcceptSuggestion: (suggestion: any) => void;
  onRemoveSuggestion: () => void;
  onRegenerateSuggestions: () => void;
  formatDate: (date: string | null | undefined) => string;
}

export const DesktopRow: FC<DesktopRowProps> = ({
  answer,
  cellPad,
  isSelected,
  isFocused,
  isCategorizing,
  isAccepting,
  rowAnimation,
  onToggleSelection,
  onFocus,
  onClick,
  onQuickStatus,
  onCodeClick,
  onAICategorize,
  onAcceptSuggestion,
  onRemoveSuggestion,
  onRegenerateSuggestions,
  formatDate
}) => {
  return (
    <tr
      data-answer-id={answer.id}
      tabIndex={0}
      onClick={(e) => {
        // Don't trigger onClick when clicking on interactive elements
        if (
          e.target instanceof HTMLButtonElement ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLAnchorElement ||
          e.target instanceof SVGSVGElement ||
          e.target instanceof SVGElement
        ) {
          return;
        }
        onClick(e);
      }}
      onFocus={onFocus}
      className={clsx(
        "border-b border-zinc-100 dark:border-zinc-800 transition-colors cursor-pointer relative",
        isFocused
          ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 ring-inset"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900",
        isSelected && "bg-blue-50 dark:bg-blue-950",
        rowAnimation
      )}
    >
      {/* Selection Checkbox */}
      <td className="px-2 py-1 w-8">
        <SelectionCell
          answerId={answer.id}
          isSelected={isSelected}
          onToggle={onToggleSelection}
        />
      </td>

      {/* Date */}
      <td className={`${cellPad} text-[11px] leading-tight text-zinc-500 whitespace-nowrap`}>
        {formatDate(answer.created_at)}
      </td>

      {/* Language */}
      <td className={`${cellPad} text-sm text-zinc-800 dark:text-zinc-100 text-center hidden sm:table-cell`}>
        {answer.language || '—'}
      </td>

      {/* Answer Text */}
      <td className={`${cellPad} text-sm text-zinc-800 dark:text-zinc-100`}>
        <AnswerTextCell
          text={answer.answer_text}
          translation={answer.translation_en}
        />
      </td>

      {/* Translation (full) */}
      <td className={`${cellPad} hidden md:table-cell`}>
        {answer.translation_en ? (
          <div className="max-w-[320px] text-sm text-zinc-700 dark:text-zinc-300 truncate">
            {answer.translation_en}
          </div>
        ) : (
          <span className="text-zinc-500 dark:text-zinc-300">—</span>
        )}
      </td>

      {/* Quick Status Buttons */}
      <td className={`${cellPad}`}>
        <QuickStatusButtons
          answer={answer}
          onStatusChange={onQuickStatus}
        />
      </td>

      {/* General Status */}
      <td className={`${cellPad}`}>
        <StatusCell status={answer.general_status} />
      </td>

      {/* AI Suggestions */}
      <td className={`${cellPad} hidden md:table-cell`}>
        <AISuggestionsCell
          answerId={answer.id}
          aiSuggestions={answer.ai_suggestions}
          isCategorizing={isCategorizing}
          isAccepting={isAccepting}
          onCategorize={onAICategorize}
          onAccept={onAcceptSuggestion}
          onRemove={onRemoveSuggestion}
          onRegenerate={onRegenerateSuggestions}
        />
      </td>

      {/* Code */}
      <td className={`${cellPad} hidden md:table-cell`}>
        <CodeCell
          answerId={answer.id}
          selectedCode={answer.selected_code}
          generalStatus={answer.general_status}
          onClick={onCodeClick}
        />
      </td>

      {/* Coding Date */}
      <td className={`${cellPad} hidden lg:table-cell`}>
        <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-300 whitespace-nowrap">
          {formatDate(answer.coding_date)}
        </span>
      </td>

      {/* Country */}
      <td className={`${cellPad} text-sm text-zinc-800 dark:text-zinc-100 hidden lg:table-cell`}>
        {answer.country || '—'}
      </td>
    </tr>
  );
};
