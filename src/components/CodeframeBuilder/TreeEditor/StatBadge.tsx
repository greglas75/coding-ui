/**
 * StatBadge - Large, accessible badge for displaying stats
 * Minimum 44x44px touch target (WCAG AAA)
 */
import { FC } from 'react';
import type { LucideProps } from 'lucide-react';

interface StatBadgeProps {
  icon: FC<LucideProps>;
  label: string;
  value: number;
  detail: string;
  color?: 'purple' | 'blue' | 'indigo' | 'green';
}

export const StatBadge: FC<StatBadgeProps> = ({
  icon: Icon,
  label,
  value,
  detail,
  color = 'blue',
}) => {
  const colorClasses = {
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2
        px-3 py-2 rounded-lg
        cursor-help transition-all duration-200
        min-h-[44px] min-w-[100px]
        ${colorClasses[color]}
        hover:shadow-md hover:-translate-y-0.5
      `}
      title={detail}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium opacity-75 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-lg font-bold">
          {value}
        </span>
      </div>
    </div>
  );
};
