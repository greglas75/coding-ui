/**
 * Smart Suggestions Section Component
 */

import type { CodeSuggestion } from '../../../lib/codeSuggestionEngine';
import { Tooltip } from '../../shared/Tooltip';

interface SmartSuggestionsSectionProps {
  suggestions: CodeSuggestion[];
  loading: boolean;
  onApplySuggestion: (codeId: number, codeName: string) => void;
}

export function SmartSuggestionsSection({
  suggestions,
  loading,
  onApplySuggestion,
}: SmartSuggestionsSectionProps) {
  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-400">⚡</span>
        Smart Suggestions
      </h3>
      <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10 h-[180px] flex flex-col overflow-y-auto">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="h-5 w-5 animate-spin">⏳</span>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <Tooltip
                key={idx}
                content={
                  <div className="space-y-1">
                    <div className="font-semibold">{suggestion.codeName}</div>
                    <div className="text-xs">{suggestion.reason}</div>
                    {suggestion.frequency && suggestion.frequency > 0 && (
                      <div className="text-xs text-gray-400 border-t border-gray-700 pt-1 mt-1">
                        Used {suggestion.frequency}× before
                      </div>
                    )}
                  </div>
                }
              >
                <button
                  onClick={() => onApplySuggestion(suggestion.codeId, suggestion.codeName)}
                  className="px-3 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 rounded-md border border-blue-300 dark:border-blue-700 text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  {suggestion.codeName}
                  {suggestion.confidence && (
                    <span className="text-xs opacity-70 ml-1">
                      ({Math.round(suggestion.confidence * 100)}%)
                    </span>
                  )}
                </button>
              </Tooltip>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 italic text-sm">
            <div>
              <span className="block mb-2 text-2xl">⚡</span>
              <p>No suggestions available yet.</p>
              <p className="text-xs mt-1">Code more answers to build history!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

