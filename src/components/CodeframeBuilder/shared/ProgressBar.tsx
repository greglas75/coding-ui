/**
 * Progress bar component
 */
import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = true,
  color = 'blue',
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    blue: 'bg-blue-600 dark:bg-blue-500',
    green: 'bg-green-600 dark:bg-green-500',
    yellow: 'bg-yellow-600 dark:bg-yellow-500',
    red: 'bg-red-600 dark:bg-red-500',
  };

  return (
    <div className={className}>
      <div
        className={clsx(
          'w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
          heightClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300 ease-out',
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showLabel && (
        <div className="mt-1 flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{Math.round(percentage)}%</span>
          <span>
            {value}/{max}
          </span>
        </div>
      )}
    </div>
  );
}
