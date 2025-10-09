import { Sparkles, TrendingUp, Zap } from 'lucide-react';
import type { CodeSuggestion } from '../lib/codeSuggestionEngine';

interface Props {
  suggestions: CodeSuggestion[];
  onApply: (codeId: number, codeName: string) => void;
  isLoading: boolean;
}

export function CodeSuggestions({ suggestions, onApply, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="border border-purple-200 dark:border-purple-900 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Sparkles size={18} className="animate-pulse" />
          <span className="font-semibold text-sm">Analyzing patterns...</span>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="border border-gray-200 dark:border-neutral-800 rounded-lg p-4 bg-gray-50 dark:bg-neutral-900/50">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Sparkles size={18} />
          <span className="text-sm">No suggestions available yet. Code more answers to build history!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-purple-200 dark:border-purple-900 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
      <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-3">
        <Sparkles size={18} />
        <span className="font-semibold text-sm">Smart Suggestions</span>
        <span className="text-xs text-purple-600 dark:text-purple-400 ml-auto">
          Based on your coding history
        </span>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.codeId}
            onClick={() => onApply(suggestion.codeId, suggestion.codeName)}
            className="w-full text-left p-3 rounded-lg bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {/* Rank Badge */}
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold">
                    {index + 1}
                  </span>

                  {/* Code Name */}
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {suggestion.codeName}
                  </span>

                  {/* Confidence Badge */}
                  <span className={`
                    flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full
                    ${suggestion.confidence >= 0.7 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                      suggestion.confidence >= 0.4 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}
                  `}>
                    {Math.round(suggestion.confidence * 100)}%
                  </span>

                  {/* Frequency Badge */}
                  {suggestion.frequency > 0 && (
                    <span className="flex-shrink-0 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                      {suggestion.frequency}× used
                    </span>
                  )}
                </div>

                {/* Reason */}
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {suggestion.reason}
                </p>
              </div>

              {/* Apply Button Indicator */}
              <div className="flex-shrink-0 text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <TrendingUp size={20} />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-900">
        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
          <Zap size={12} className="text-purple-600 dark:text-purple-400" />
          Click any suggestion to apply instantly • Updates in real-time
        </p>
      </div>
    </div>
  );
}
