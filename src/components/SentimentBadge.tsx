import { Info } from 'lucide-react';
import { Tooltip } from '@/components/shared/Tooltip';
import type { SentimentType } from '@/types/sentiment';

interface SentimentBadgeProps {
  sentiment: SentimentType | null;
  sentimentScore: number | null;
  sentimentApplicable: boolean;
  sentimentConfidence?: number | null;
  categoryEnabled: boolean;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export function SentimentBadge({
  sentiment,
  sentimentScore,
  sentimentApplicable,
  sentimentConfidence,
  categoryEnabled,
  size = 'md',
  showScore = true,
}: SentimentBadgeProps) {
  // Don't show if sentiment disabled at category level
  if (!categoryEnabled) return null;

  // Show "Not applicable" badge if AI determined sentiment doesn't make sense
  if (!sentimentApplicable) {
    return (
      <div className="flex items-center gap-1">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 ${
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'
          }`}
        >
          📋 Factual
        </span>
        <Tooltip content="AI determined sentiment analysis is not applicable for this answer (e.g., just a brand name or factual statement)">
          <Info className="w-3 h-3 text-gray-400 cursor-help" />
        </Tooltip>
      </div>
    );
  }

  // Sentiment not yet calculated
  if (!sentiment) {
    return (
      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        No sentiment
      </span>
    );
  }

  const sentimentConfig = {
    positive: {
      emoji: '😊',
      label: 'Positive',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      borderColor: 'border-green-300 dark:border-green-700',
      barColor: 'bg-green-500',
    },
    negative: {
      emoji: '😞',
      label: 'Negative',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      borderColor: 'border-red-300 dark:border-red-700',
      barColor: 'bg-red-500',
    },
    neutral: {
      emoji: '😐',
      label: 'Neutral',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      borderColor: 'border-gray-300 dark:border-gray-600',
      barColor: 'bg-gray-400',
    },
    mixed: {
      emoji: '🤔',
      label: 'Mixed',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      borderColor: 'border-yellow-300 dark:border-yellow-700',
      barColor: 'bg-yellow-500',
    },
  };

  const config =
    sentimentConfig[sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <div className="flex items-center gap-2">
      {/* Main sentiment badge */}
      <span
        className={`inline-flex items-center gap-1 rounded font-medium border ${config.color} ${config.borderColor} ${sizeClasses[size]}`}
      >
        <span>{config.emoji}</span>
        <span>{config.label}</span>
      </span>

      {/* Sentiment score bar (visual) */}
      {showScore && sentimentScore !== null && (
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${config.barColor}`}
              style={{ width: `${sentimentScore * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {Math.round(sentimentScore * 100)}%
          </span>
        </div>
      )}

      {/* Low confidence warning */}
      {sentimentConfidence !== null && sentimentConfidence < 0.6 && (
        <Tooltip
          content={`Low confidence (${Math.round(sentimentConfidence * 100)}%) - AI is uncertain about this sentiment`}
        >
          <span className="px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
            ⚠️
          </span>
        </Tooltip>
      )}
    </div>
  );
}
