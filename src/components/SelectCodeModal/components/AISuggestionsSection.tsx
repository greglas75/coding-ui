/**
 * AI Suggestions Section Component
 */

import { toast } from 'sonner';
import { simpleLogger } from '../../../utils/logger';
import { Tooltip } from '../../shared/Tooltip';

interface AISuggestion {
  code_id: string;
  code_name: string;
  confidence: number;
  reasoning: string;
}

interface AISuggestionsSectionProps {
  aiSuggestions?: {
    suggestions: AISuggestion[];
    timestamp?: string;
    model?: string;
  };
  selectedAnswerIds: number[];
  onGenerateAISuggestions?: (answerId: number) => void;
  onApplySuggestion: (codeId: number, codeName: string) => void;
}

export function AISuggestionsSection({
  aiSuggestions,
  selectedAnswerIds,
  onGenerateAISuggestions,
  onApplySuggestion,
}: AISuggestionsSectionProps) {
  const getConfidenceLabel = (conf: number): string => {
    if (conf >= 90) return 'Very High';
    if (conf >= 70) return 'High';
    if (conf >= 50) return 'Medium';
    return 'Low';
  };

  const hasValidSuggestions =
    aiSuggestions &&
    aiSuggestions.suggestions &&
    aiSuggestions.suggestions.length > 0 &&
    aiSuggestions.suggestions.filter(s => s.confidence > 0).length > 0;

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="text-purple-600 dark:text-purple-400">✨</span>
          AI Suggestions
          <span className="text-xs text-gray-500">
            (Press{' '}
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">A</kbd>)
          </span>
        </span>
        <button
          onClick={() => {
            if (selectedAnswerIds.length > 0 && onGenerateAISuggestions) {
              const answerId = selectedAnswerIds[0];
              simpleLogger.info('🤖 Generating AI suggestions for answer:', answerId);
              toast.info('🤖 Generating AI suggestions...');
              onGenerateAISuggestions(answerId);
            } else {
              toast.error('Unable to generate AI suggestions');
            }
          }}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 cursor-pointer"
          title="Generate AI suggestions"
        >
          <span className="text-xl">✨</span>
        </button>
      </h3>
      <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10 h-[180px] flex flex-col overflow-y-auto">
        {hasValidSuggestions ? (
          <div className="w-full space-y-2">
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.suggestions
                .filter(suggestion => suggestion.confidence > 0)
                .map((suggestion, idx) => {
                  const confidence = Math.round(suggestion.confidence * 100);
                  const colorClass =
                    confidence >= 90
                      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200'
                      : confidence >= 70
                        ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200';

                  return (
                    <Tooltip
                      key={idx}
                      content={
                        <div className="space-y-1">
                          <div className="font-semibold">
                            {getConfidenceLabel(confidence)} ({confidence}%)
                          </div>
                          <div className="text-xs">{suggestion.reasoning}</div>
                          {aiSuggestions.model && (
                            <div className="text-xs text-gray-400 border-t border-gray-700 pt-1 mt-1">
                              Model: {aiSuggestions.model}
                            </div>
                          )}
                        </div>
                      }
                    >
                      <button
                        onClick={() => {
                          const codeId = parseInt(suggestion.code_id);
                          onApplySuggestion(codeId, suggestion.code_name);
                        }}
                        className={`px-3 py-1.5 rounded-md border text-sm font-medium hover:opacity-80 transition-all ${colorClass}`}
                      >
                        <span className="flex items-center gap-1">
                          <span>✨</span>
                          <span>{suggestion.code_name}</span>
                          <span className="text-xs opacity-70">{confidence}%</span>
                        </span>
                      </button>
                    </Tooltip>
                  );
                })}
            </div>
            {aiSuggestions.timestamp && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Generated {new Date(aiSuggestions.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 italic text-sm">
            <div>
              <span className="block mb-2 text-2xl">✨</span>
              <p>No AI suggestions available yet.</p>
              <p className="text-xs mt-1">Click the ✨ button above to generate.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

