import { TrendingUp, Eye, Search, Globe, Zap } from 'lucide-react';
import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';

interface ConfidenceBreakdownProps {
  result: MultiSourceValidationResult;
}

export function ConfidenceBreakdown({ result }: ConfidenceBreakdownProps) {
  if (!result.sources?.confidence_breakdown) return null;

  const breakdown = result.sources.confidence_breakdown;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <div className="font-semibold text-blue-900 dark:text-blue-200">
          Confidence Breakdown
        </div>
      </div>

      {/* Total Confidence */}
      <div className="mb-4 p-4 bg-white dark:bg-gray-900/50 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Confidence
          </span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {result.confidence}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              result.confidence >= 70
                ? 'bg-green-500'
                : result.confidence >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${result.confidence}%` }}
          />
        </div>
      </div>

      {/* Individual Tier Contributions */}
      <div className="space-y-3">
        {/* Vision AI */}
        {breakdown.vision_ai && (
          <div className="p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-indigo-200 dark:border-indigo-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Vision AI
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    breakdown.vision_ai.status === 'strong'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : breakdown.vision_ai.status === 'moderate'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}
                >
                  {breakdown.vision_ai.status}
                </span>
              </div>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                +{breakdown.vision_ai.contribution}%
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500"
                  style={{
                    width: `${
                      breakdown.vision_ai.max_contribution > 0
                        ? (breakdown.vision_ai.contribution / breakdown.vision_ai.max_contribution) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {breakdown.vision_ai.contribution}/{breakdown.vision_ai.max_contribution}
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {breakdown.vision_ai.reason}
            </div>
          </div>
        )}

        {/* Web Search */}
        {breakdown.web_search && (
          <div className="p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Web Search AI
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    breakdown.web_search.status === 'strong'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : breakdown.web_search.status === 'moderate'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}
                >
                  {breakdown.web_search.status}
                </span>
              </div>
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                +{breakdown.web_search.contribution}%
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${
                      breakdown.web_search.max_contribution > 0
                        ? (breakdown.web_search.contribution / breakdown.web_search.max_contribution) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {breakdown.web_search.contribution}/{breakdown.web_search.max_contribution}
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {breakdown.web_search.reason}
            </div>
          </div>
        )}

        {/* Knowledge Graph */}
        {breakdown.knowledge_graph && (
          <div className="p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Knowledge Graph
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    breakdown.knowledge_graph.status === 'strong'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : breakdown.knowledge_graph.status === 'weak'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}
                >
                  {breakdown.knowledge_graph.status}
                </span>
              </div>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                +{breakdown.knowledge_graph.contribution}%
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${
                      breakdown.knowledge_graph.max_contribution > 0
                        ? (breakdown.knowledge_graph.contribution / breakdown.knowledge_graph.max_contribution) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {breakdown.knowledge_graph.contribution}/{breakdown.knowledge_graph.max_contribution}
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {breakdown.knowledge_graph.reason}
            </div>
          </div>
        )}

        {/* Embeddings */}
        {breakdown.embeddings && (
          <div className="p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-orange-200 dark:border-orange-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Embeddings
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    breakdown.embeddings.status === 'strong'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : breakdown.embeddings.status === 'moderate'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}
                >
                  {breakdown.embeddings.status}
                </span>
              </div>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                +{breakdown.embeddings.contribution}%
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500"
                  style={{
                    width: `${
                      breakdown.embeddings.max_contribution > 0
                        ? (breakdown.embeddings.contribution / breakdown.embeddings.max_contribution) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {breakdown.embeddings.contribution}/{breakdown.embeddings.max_contribution}
              </span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {breakdown.embeddings.reason}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-700">
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong>How confidence is calculated:</strong> Each validation tier contributes
          a portion based on its results. Vision AI and Web Search are weighted most heavily,
          followed by Knowledge Graph verification and text similarity.
        </div>
      </div>
    </div>
  );
}

