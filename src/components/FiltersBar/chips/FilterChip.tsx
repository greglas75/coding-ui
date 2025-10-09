import clsx from 'clsx';
import { X } from 'lucide-react';
import type { FC } from 'react';

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  variant?: 'default' | 'status' | 'code' | 'language' | 'country' | 'length';
}

export const FilterChip: FC<FilterChipProps> = ({
  label,
  value,
  onRemove,
  variant = 'default'
}) => {
  const variantStyles = {
    default: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    status: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
    code: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    language: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
    country: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700',
    length: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700'
  };

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md',
        'text-sm font-medium border',
        'transition-all duration-200',
        'hover:shadow-sm',
        variantStyles[variant]
      )}
    >
      <span className="text-xs opacity-70">{label}:</span>
      <span className="truncate max-w-[200px]" title={value}>
        {value}
      </span>
      <button
        onClick={onRemove}
        className={clsx(
          'ml-1 p-0.5 rounded-full',
          'hover:bg-black/10 dark:hover:bg-white/10 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          variant === 'status' && 'focus:ring-green-400',
          variant === 'code' && 'focus:ring-purple-400',
          variant === 'language' && 'focus:ring-orange-400',
          variant === 'country' && 'focus:ring-pink-400',
          variant === 'length' && 'focus:ring-indigo-400',
          variant === 'default' && 'focus:ring-blue-400'
        )}
        aria-label={`Remove filter ${label}: ${value}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
