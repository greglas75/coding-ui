import { RotateCw } from 'lucide-react';
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
  onAccept: (suggestion: AISuggestion) => void;
  onRegenerate: () => void;
}

export const AISuggestionsCell: FC<AISuggestionsCellProps> = ({
  answerId: _answerId, // Kept for future use in analytics/logging
  aiSuggestions,
  isCategorizing,
  isAccepting,
  onAccept,
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


  return (
    <div className="flex items-center gap-2 h-[28px] overflow-hidden">

      {/* Suggestions (if any) */}
      {aiSuggestions?.suggestions && aiSuggestions.suggestions.length > 0 ? (
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 h-full">
            <div className="flex items-center gap-1 overflow-hidden">
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
                      onClick={() => !isAccepting && onAccept(suggestion)}
                      className={`group relative px-2 py-1 text-xs rounded border flex items-center gap-1 cursor-pointer transition-opacity h-[24px] whitespace-nowrap ${getConfidenceColor(suggestion.confidence)} ${isAccepting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                    >
                        <span className="text-xs font-semibold leading-none">{suggestion.code_name}</span>
                        <span className="text-xs text-gray-500 font-medium leading-none">
                          ({(suggestion.confidence * 100).toFixed(0)}%)
                        </span>
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
              className="text-xs text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors flex-shrink-0"
              title="Regenerate AI suggestions"
            >
              <RotateCw className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
      )}
    </div>
  );
};
