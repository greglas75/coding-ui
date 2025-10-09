import { AlertTriangle, Check, X } from 'lucide-react';

interface Props {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
}

export function ConfidenceIndicator({
  confidence,
  size = 'md',
  showLabel = true,
  showIcon = true
}: Props) {
  const getColor = () => {
    if (confidence >= 90) return 'green';
    if (confidence >= 60) return 'yellow';
    return 'red';
  };

  const getIcon = () => {
    const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 20;
    if (confidence >= 90) return <Check size={iconSize} />;
    if (confidence >= 60) return <AlertTriangle size={iconSize} />;
    return <X size={iconSize} />;
  };

  const getLabel = () => {
    if (confidence >= 90) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  const color = getColor();
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full font-semibold
      ${sizeClasses[size]}
      ${color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : ''}
      ${color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : ''}
      ${color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : ''}
    `}>
      {showIcon && getIcon()}
      {showLabel && (
        <span className="flex items-center gap-1">
          {confidence}%
          <span className="opacity-75 text-xs">({getLabel()})</span>
        </span>
      )}
    </div>
  );
}
