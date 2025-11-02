import { Info, RotateCw } from 'lucide-react';
import type { FC } from 'react';
import { useState } from 'react';
import type { ImageResult } from '../../../types';
import { Tooltip } from '../../shared/Tooltip';
import { BrandValidationModal } from '../modals/BrandValidationModal';
import type { MultiSourceValidationResult } from '../../../services/multiSourceValidator';

interface AISuggestion {
  code_id: string;
  code_name: string;
  confidence: number;
  reasoning: string;
  isNew?: boolean; // True if code doesn't exist in database yet
}

interface WebContext {
  title: string;
  snippet: string;
  url: string;
}

interface VisionAnalysisResult {
  brandDetected: boolean;
  brandName: string;
  confidence: number;
  reasoning: string;
  objectsDetected: string[];
  costEstimate?: number;
  imagesAnalyzed?: number;
}

interface AISuggestionsData {
  suggestions: AISuggestion[];
  timestamp?: string;
  model?: string;
  webContext?: WebContext[];
  images?: ImageResult[];
  searchQuery?: string;
  visionResult?: VisionAnalysisResult;
  categoryName?: string;
  multiSourceResult?: MultiSourceValidationResult; // NEW: Full multi-source validation
}

interface AISuggestionsCellProps {
  answerId: number;
  aiSuggestions: AISuggestionsData | null;
  isCategorizing: boolean;
  isAccepting: boolean;
  onAccept: (suggestion: AISuggestion) => void;
  onRegenerate: () => void;
  answer: string;
  translation?: string;
}

export const AISuggestionsCell: FC<AISuggestionsCellProps> = ({
  answerId: _answerId, // Kept for future use in analytics/logging
  aiSuggestions,
  isCategorizing,
  isAccepting,
  onAccept,
  onRegenerate,
  answer,
  translation,
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleShowInsights = (suggestion: AISuggestion) => {
    setSelectedSuggestion(suggestion);
    setIsModalOpen(true);
  };

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
      {/* Suggestions (if any) - FILTER OUT NEGATIVE CONFIDENCE */}
      {aiSuggestions?.suggestions &&
      aiSuggestions.suggestions.length > 0 &&
      aiSuggestions.suggestions.filter(s => s.confidence > 0).length > 0 ? (
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 h-full">
            <div className="flex items-center gap-1 overflow-hidden">
              {aiSuggestions.suggestions
                .filter(suggestion => suggestion.confidence > 0) // 🎯 HIDE NEGATIVE CONFIDENCE
                .map((suggestion, idx) => (
                  <Tooltip
                    key={idx}
                    content={
                      <div className="space-y-2">
                        {suggestion.isNew && (
                          <div className="bg-purple-900/50 border border-purple-600 rounded p-2 mb-2">
                            <span className="font-semibold text-purple-300">⚡ New Code</span>
                            <p className="mt-1 text-xs text-purple-200">
                              This code will be created when you apply it
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold">Confidence: </span>
                          <span
                            className={
                              getConfidenceLabel(suggestion.confidence) === 'Very High'
                                ? 'text-green-300'
                                : getConfidenceLabel(suggestion.confidence) === 'High'
                                  ? 'text-blue-300'
                                  : getConfidenceLabel(suggestion.confidence) === 'Medium'
                                    ? 'text-yellow-300'
                                    : 'text-gray-300'
                            }
                          >
                            {getConfidenceLabel(suggestion.confidence)} (
                            {(suggestion.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold">Reasoning:</span>
                          <p className="mt-1 text-xs text-gray-300 whitespace-normal break-words">
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
                    <div className="flex items-center gap-1">
                      <div
                        onClick={() => !isAccepting && onAccept(suggestion)}
                        className={`group relative px-2 py-1 text-xs rounded border flex items-center gap-1 cursor-pointer transition-opacity h-[24px] whitespace-nowrap ${getConfidenceColor(suggestion.confidence)} ${isAccepting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                      >
                        <span className="text-xs font-semibold leading-none">
                          {suggestion.code_name}
                        </span>
                        {suggestion.isNew && (
                          <span className="text-[10px] font-bold px-1 py-0.5 bg-purple-500 text-white rounded uppercase">
                            NEW
                          </span>
                        )}
                        <span className="text-xs text-gray-500 font-medium leading-none">
                          ({(suggestion.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleShowInsights(suggestion);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        title="View AI insights"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    </div>
                  </Tooltip>
                ))}
            </div>
            <button
              onClick={e => {
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
      ) : aiSuggestions && (aiSuggestions.webContext || aiSuggestions.images) ? (
        // No suggestions but have web context/images - show info button
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">No match</span>
          <button
            onClick={e => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            title="View web context"
          >
            <Info className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
      )}

      {/* ALWAYS show new Brand Validation Modal with all 7 features */}
      <BrandValidationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSuggestion(null);
        }}
        result={
          aiSuggestions?.multiSourceResult || {
            // Fallback for cached data without multiSourceResult
            type: 'unclear',
            reasoning: 'Loading validation data...',
            confidence: 0,
            ui_action: 'MANUAL_REVIEW',
            brand: null,
            expected_category: aiSuggestions?.categoryName || 'Unknown',
            sources: {},
            kg_details: {},
            cost: 0,
            time_ms: 0,
            tier: 0,
          }
        }
        userResponse={answer}
        translation={translation}
        categoryName={
          aiSuggestions?.multiSourceResult?.expected_category ||
          aiSuggestions?.categoryName ||
          'Unknown Category'
        }
      />
    </div>
  );
};
