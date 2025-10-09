import clsx from 'clsx';
import type { FC } from 'react';
import type { Answer } from '../../../types';

interface QuickStatusButtonsProps {
  answer: Answer;
  onStatusChange: (answer: Answer, key: keyof typeof statusMap) => void;
}

const statusMap = {
  Oth: { label: "Other", color: "bg-purple-500" },
  Ign: { label: "Ignore", color: "bg-orange-500" },
  gBL: { label: "Global Blacklist", color: "bg-red-600" },
  BL: { label: "Blacklist", color: "bg-rose-700" },
  C: { label: "Confirmed", color: "bg-green-600" },
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
    <div className="flex flex-wrap gap-1 items-center">
      {(Object.keys(statusMap) as Array<keyof typeof statusMap>).map((key) => {
        const isActive = answer.quick_status === statusMap[key].label;
        const { color, label: fullLabel } = statusMap[key];

        return (
          <button
            key={key}
            onClick={() => onStatusChange(answer, key)}
            title={tooltips[key] || fullLabel}
            className={clsx(
              'px-1.5 py-0.5 text-[10px] rounded border transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[28px] h-6 flex items-center justify-center',
              isActive
                ? `${color} text-white border-transparent`
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 border-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600'
            )}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
};
