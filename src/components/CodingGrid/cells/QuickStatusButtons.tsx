import clsx from 'clsx';
import type { FC } from 'react';
import type { Answer } from '../../../types';

interface QuickStatusButtonsProps {
  answer: Answer;
  onStatusChange: (answer: Answer, key: keyof typeof statusMap) => void;
}

const statusMap = {
  Oth: { label: "Other", color: "bg-orange-500" },
  Ign: { label: "Ignore", color: "bg-yellow-500" },
  gBL: { label: "Global Blacklist", color: "bg-red-500" },
  BL: { label: "Blacklist", color: "bg-gray-500" },
  C: { label: "Confirmed", color: "bg-purple-500" },
} as const;

const tooltips: Record<string, string> = {
  'Oth': 'Mark as Other',
  'Ign': 'Mark as Ignored',
  'gBL': 'Add to Global Blacklist',
  'BL': 'Add to Blacklist',
  'C': 'Confirm as Whitelist'
};

export const QuickStatusButtons: FC<QuickStatusButtonsProps> = ({
  answer,
  onStatusChange
}) => {
  return (
    <div className="flex gap-1 items-center">
      {(Object.keys(statusMap) as Array<keyof typeof statusMap>).map((key) => {
        const isActive = answer.quick_status === statusMap[key].label;
        const { color, label: fullLabel } = statusMap[key];

        // Disable 'C' button if no AI suggestions available
        const hasAISuggestion = answer.ai_suggestions?.suggestions?.[0]?.code_name;
        const isDisabled = key === 'C' && !hasAISuggestion;

        return (
          <button
            key={key}
            onClick={() => !isDisabled && onStatusChange(answer, key)}
            title={isDisabled ? 'No AI suggestion available' : tooltips[key] || fullLabel}
            disabled={isDisabled}
            className={clsx(
              'px-2 py-1 text-[10px] font-medium rounded border focus:ring-2 focus:ring-blue-500 focus:outline-none w-[40px] h-[28px] flex items-center justify-center leading-none transition-all',
              isDisabled
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 border-zinc-300 dark:border-zinc-700 cursor-not-allowed opacity-50'
                : isActive
                ? `${color} text-white border-transparent font-semibold cursor-pointer`
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 border-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600 cursor-pointer'
            )}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
};
