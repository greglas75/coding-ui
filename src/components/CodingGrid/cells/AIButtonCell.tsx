import type { FC } from 'react';

interface AIButtonCellProps {
  isCategorizing: boolean;
  timestamp?: string;
  onRegenerate: () => void;
}

/**
 * Format timestamp to compact display
 * Examples: "3m ago", "2h ago", "1d ago", "Dec 15"
 */
const formatCompactTimestamp = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Less than 1 hour: show minutes
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  // Less than 24 hours: show hours
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  // Less than 7 days: show days
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // 7+ days: show date (e.g., "Dec 15")
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Get timestamp color based on age
 */
const getTimestampColor = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffHours < 1) return 'text-green-600';  // Fresh (< 1 hour)
  if (diffHours < 24) return 'text-blue-600';   // Recent (< 24 hours)
  if (diffHours < 168) return 'text-gray-600';  // This week
  return 'text-gray-400';                        // Older
};

export const AIButtonCell: FC<AIButtonCellProps> = ({
  isCategorizing,
  timestamp,
  onRegenerate
}) => {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRegenerate();
        }}
        disabled={isCategorizing}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium border border-purple-200 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors leading-none"
        style={{ height: '26px' }}
        title="Generate AI suggestions"
      >
        {isCategorizing ? (
          <>
            <span className="animate-spin text-sm leading-none">⏳</span>
            <span className="leading-none">AI</span>
          </>
        ) : (
          <>
            <span className="leading-none" style={{ fontSize: '1em', verticalAlign: 'middle' }}>✨</span>
            <span className="leading-none">AI</span>
          </>
        )}
      </button>

      {/* Compact Timestamp */}
      {timestamp && (
        <span className={`text-[10px] leading-tight ${getTimestampColor(timestamp)}`}>
          {formatCompactTimestamp(timestamp)}
        </span>
      )}
    </div>
  );
};
