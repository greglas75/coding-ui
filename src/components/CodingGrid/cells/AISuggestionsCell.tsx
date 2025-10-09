import { RotateCw, Sparkles, X } from 'lucide-react';
import type { FC } from 'react';
import { Tooltip } from '../../shared/Tooltip';

interface AISuggestion {
  code_id: string;
  code_name: string;
  confidence: number;
  reasoning: string;
}

interface AISuggestionsData {
  suggestions: AISuggestion[];
  timestamp?: string;
  model?: string;
}

interface AISuggestionsCellProps {
  answerId: number;
  aiSuggestions: AISuggestionsData | null;
  isCategorizing: boolean;
  isAccepting: boolean;
  onCategorize: () => void;
  onAccept: (suggestion: AISuggestion) => void;
  onRemove: () => void;
  onRegenerate: () => void;
}

export const AISuggestionsCell: FC<AISuggestionsCellProps> = ({
  answerId: _answerId, // Kept for future use in analytics/logging
  aiSuggestions,
  isCategorizing,
  isAccepting,
  onCategorize,
  onAccept,
  onRemove,
  onRegenerate
}) => {
  // Helper functions
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) {
      return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700';
    }
    if (confidence >= 0.7) {
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700';
    }
    if (confidence >= 0.5) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/50 dark:text-gray-200 dark:border-gray-600';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = Date.now();
    const past = new Date(dateString).getTime();
    const diffMs = now - past;

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div className="flex items-center gap-2 min-h-[40px]">
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {isCategorizing ? (
          <span className="text-lg animate-spin">⏳</span>
        ) : aiSuggestions?.suggestions && aiSuggestions.suggestions.length > 0 ? (
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCategorize();
            }}
            className="p-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/20 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            title="AI categorize"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions (if any) */}
      {aiSuggestions?.suggestions && aiSuggestions.suggestions.length > 0 ? (
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {aiSuggestions.suggestions.map((suggestion, idx) => (
                <Tooltip
                  key={idx}
                  content={
                    <div className="space-y-2">
                      <div>
                        <span className="font-semibold">Confidence: </span>
                        <span className={getConfidenceLabel(suggestion.confidence) === 'Very High' ? 'text-green-300' : getConfidenceLabel(suggestion.confidence) === 'High' ? 'text-blue-300' : getConfidenceLabel(suggestion.confidence) === 'Medium' ? 'text-yellow-300' : 'text-gray-300'}>
                          {getConfidenceLabel(suggestion.confidence)} ({(suggestion.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold">Reasoning:</span>
                        <p className="mt-1 text-xs text-gray-300">
                          {suggestion.reasoning}
                        </p>
                      </div>
                      {aiSuggestions.model && (
                        <div className="text-xs text-gray-400 border-t border-gray-700 pt-2 mt-2">
                          Model: {aiSuggestions.model}
                        </div>
                      )}
                    </div>
                  }
                >
                  <div
                    className={`group relative px-2 py-1 text-xs rounded border flex items-center gap-1 ${getConfidenceColor(suggestion.confidence)}`}
                  >
                    <button
                      onClick={() => onAccept(suggestion)}
                      disabled={isAccepting}
                      className="flex items-center gap-1 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{suggestion.code_name}</span>
                      <span className="text-[10px] opacity-70 ml-1">
                        {(suggestion.confidence * 100).toFixed(0)}%
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Dismiss suggestion"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </Tooltip>
              ))}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              disabled={isCategorizing}
              className="text-xs text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Regenerate AI suggestions"
            >
              <RotateCw className="h-3 w-3" />
            </button>
          </div>
          {aiSuggestions.timestamp && (
            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              Generated {formatTimeAgo(aiSuggestions.timestamp)}
            </div>
          )}
        </div>
      ) : (
        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
      )}
    </div>
  );
};
