import { Eye } from 'lucide-react';
import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';

interface Tier2VisionAIProps {
  result: MultiSourceValidationResult;
  userResponse: string;
  categoryName: string;
}

export function Tier2VisionAI({ result, userResponse, categoryName }: Tier2VisionAIProps) {
  if (!result.sources.vision_ai_search_a && !result.sources.vision_ai_search_b && !result.sources.vision_ai) {
    return null;
  }

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <div className="font-semibold text-indigo-900 dark:text-indigo-200">
          Tier 2: Vision AI Analysis{' '}
          <span className="text-xs font-normal text-indigo-700 dark:text-indigo-300">
            (Google Gemini Vision)
          </span>
        </div>
      </div>

      {/* Search A vs B Comparison */}
      {result.sources.vision_ai_search_a && result.sources.vision_ai_search_b && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search A */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-indigo-200 dark:border-indigo-700">
              <h4 className="text-sm font-semibold mb-2 text-indigo-900 dark:text-indigo-100">
                🔍 Search A: "{userResponse}"
              </h4>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Images:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {result.sources.vision_ai_search_a.total_images ??
                      result.sources.vision_ai_search_a.correct_matches +
                        result.sources.vision_ai_search_a.mismatched_count}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Correct Type:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {result.sources.vision_ai_search_a.correct_matches} ✅
                  </span>
                </div>

                {result.sources.vision_ai_search_a.mismatched_count > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Wrong Type:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {result.sources.vision_ai_search_a.mismatched_count} ❌
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-800">
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    Accuracy:{' '}
                    {Math.round(
                      (result.sources.vision_ai_search_a.correct_matches /
                        (result.sources.vision_ai_search_a.total_images ??
                          result.sources.vision_ai_search_a.correct_matches +
                            result.sources.vision_ai_search_a.mismatched_count)) *
                        100
                    )}
                    %
                  </div>
                </div>
              </div>

              {/* Show brands detected */}
              {result.sources.vision_ai_search_a.brands &&
                Object.keys(result.sources.vision_ai_search_a.brands).length > 0 && (
                  <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Brands Detected:
                    </div>
                    {Object.entries(result.sources.vision_ai_search_a.brands).map(
                      ([brand, data]: [string, any]) => (
                        <div key={brand} className="text-xs text-gray-700 dark:text-gray-300">
                          • {brand}: {data.count} images ({Math.round(data.frequency * 100)}%)
                          {data.avg_confidence && (
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                              ({Math.round(data.avg_confidence)}% confident)
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>

            {/* Search B */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-indigo-200 dark:border-indigo-700">
              <h4 className="text-sm font-semibold mb-2 text-indigo-900 dark:text-indigo-100">
                🔍 Search B: "{userResponse} {categoryName}"
              </h4>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Images:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {result.sources.vision_ai_search_b.total_images ??
                      result.sources.vision_ai_search_b.correct_matches +
                        result.sources.vision_ai_search_b.mismatched_count}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Correct Type:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {result.sources.vision_ai_search_b.correct_matches} ✅
                  </span>
                </div>

                {result.sources.vision_ai_search_b.mismatched_count > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Wrong Type:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {result.sources.vision_ai_search_b.mismatched_count} ❌
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-800">
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    Accuracy:{' '}
                    {Math.round(
                      (result.sources.vision_ai_search_b.correct_matches /
                        (result.sources.vision_ai_search_b.total_images ??
                          result.sources.vision_ai_search_b.correct_matches +
                            result.sources.vision_ai_search_b.mismatched_count)) *
                        100
                    )}
                    %
                  </div>
                </div>
              </div>

              {/* Show brands detected */}
              {result.sources.vision_ai_search_b.brands &&
                Object.keys(result.sources.vision_ai_search_b.brands).length > 0 && (
                  <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Brands Detected:
                    </div>
                    {Object.entries(result.sources.vision_ai_search_b.brands).map(
                      ([brand, data]: [string, any]) => (
                        <div key={brand} className="text-xs text-gray-700 dark:text-gray-300">
                          • {brand}: {data.count} images ({Math.round(data.frequency * 100)}%)
                          {data.avg_confidence && (
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                              ({Math.round(data.avg_confidence)}% confident)
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

              {/* Perfect match badge */}
              {result.sources.vision_ai_search_b.mismatched_count === 0 &&
                (result.sources.vision_ai_search_b.total_images ??
                  result.sources.vision_ai_search_b.correct_matches +
                    result.sources.vision_ai_search_b.mismatched_count) > 0 && (
                  <div className="mt-3 px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs text-green-800 dark:text-green-200 text-center font-medium">
                    ✅ Perfect Category Match!
                  </div>
                )}
            </div>
          </div>

          {/* Comparison Note */}
          {result.sources.vision_ai_search_a &&
            result.sources.vision_ai_search_b &&
            result.sources.vision_ai_search_b.correct_matches >
              result.sources.vision_ai_search_a.correct_matches && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="text-sm text-green-800 dark:text-green-200">
                  ✅ <strong>Category filtering improved results:</strong> Search B found{' '}
                  <strong>
                    {result.sources.vision_ai_search_b.correct_matches -
                      result.sources.vision_ai_search_a.correct_matches}
                  </strong>{' '}
                  more correct products by adding "{categoryName}" to the search.
                </div>
              </div>
            )}

          {/* Warning if Search A had many mismatches */}
          {result.sources.vision_ai_search_a &&
            result.sources.vision_ai_search_a.mismatched_count >
              result.sources.vision_ai_search_a.correct_matches && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Note:</strong> Search A found more incorrect product types than correct
                  ones. This brand may produce multiple product categories (e.g., both toothpaste and
                  whitening strips).
                </div>
              </div>
            )}
        </div>
      )}

      {/* Fallback: Show aggregated vision_ai if no search breakdown */}
      {!result.sources.vision_ai_search_a &&
        !result.sources.vision_ai_search_b &&
        result.sources.vision_ai && (
          <div className="text-sm text-indigo-800 dark:text-indigo-200 space-y-2">
            <div>Images analyzed: {result.sources.vision_ai.images_analyzed}</div>
            <div>Products identified: {result.sources.vision_ai.products_identified}</div>
            {result.sources.vision_ai.dominant_brand && (
              <div className="font-semibold text-indigo-900 dark:text-indigo-100 mt-2">
                🎯 Dominant Brand: {result.sources.vision_ai.dominant_brand}
              </div>
            )}
            {result.sources.vision_ai.brands_detected &&
              Object.keys(result.sources.vision_ai.brands_detected).length > 0 && (
                <div className="mt-3 p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                  <div className="text-sm font-semibold mb-2 text-indigo-900 dark:text-indigo-100">
                    Brand Detection Results:
                  </div>
                  <div className="space-y-2">
                    {Object.entries(result.sources.vision_ai.brands_detected).map(
                      ([brand, data]: [string, any]) => (
                        <div
                          key={brand}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-medium text-indigo-900 dark:text-indigo-100">
                            {brand}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-indigo-700 dark:text-indigo-300">
                              {data.count} images ({(data.frequency * 100).toFixed(0)}%)
                            </span>
                            <div className="w-24 h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 dark:bg-indigo-400"
                                style={{ width: `${data.frequency * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        )}
    </div>
  );
}

