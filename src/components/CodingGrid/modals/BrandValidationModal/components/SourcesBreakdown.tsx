import { Database, Globe, Eye, Search, Brain, Zap } from 'lucide-react';
import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';

interface SourcesBreakdownProps {
  result: MultiSourceValidationResult;
  userResponse: string;
  categoryName: string;
}

/**
 * Displays all 6 validation tiers in a compact breakdown
 */
export function SourcesBreakdown({ result, userResponse, categoryName }: SourcesBreakdownProps) {
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
        📊 Sources Breakdown (6 Tiers)
      </h3>
      <div className="space-y-3">
        {/* Tier 0: Pinecone */}
        {result.sources.pinecone && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <div className="font-semibold text-purple-900 dark:text-purple-200">
                Tier 0: Pinecone Vector Search{' '}
                <span className="text-xs font-normal text-purple-700 dark:text-purple-300">
                  (Existing Database)
                </span>
              </div>
              {result.sources.pinecone.match && (
                <span className="ml-auto text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                  ✓ Match Found
                </span>
              )}
            </div>
            <div className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
              {result.sources.pinecone.match ? (
                <>
                  <div>
                    Similarity:{' '}
                    {((result.sources.pinecone.similarity || 0) * 100).toFixed(1)}%
                  </div>
                  <div>Namespace: {result.sources.pinecone.namespace}</div>
                  {result.sources.pinecone.is_global && (
                    <div className="text-xs bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded mt-2 inline-block">
                      🌐 Global Code
                    </div>
                  )}
                </>
              ) : (
                <div>❌ No existing match found in vector database</div>
              )}
            </div>
          </div>
        )}

        {/* Tier 1: Google Search */}
        {(result.sources.google_search_a || result.sources.google_search_b) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div className="font-semibold text-blue-900 dark:text-blue-200">
                Tier 1: Dual Google Images Search{' '}
                <span className="text-xs font-normal text-blue-700 dark:text-blue-300">
                  (Google Custom Search API)
                </span>
              </div>
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              {result.sources.google_search_a && (
                <div>
                  Search A (no category): {result.sources.google_search_a.results_count} results
                  {result.sources.google_search_a.pattern &&
                    ` (${result.sources.google_search_a.pattern})`}
                </div>
              )}
              {result.sources.google_search_b && (
                <div>
                  Search B (with category): {result.sources.google_search_b.results_count} results
                  {result.sources.google_search_b.pattern &&
                    ` (${result.sources.google_search_b.pattern})`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tier 2: Vision AI Analysis */}
        {(result.sources.vision_ai_search_a ||
          result.sources.vision_ai_search_b ||
          result.sources.vision_ai) && (
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
            <div className="text-sm text-indigo-800 dark:text-indigo-200 space-y-2">
              {result.sources.vision_ai?.dominant_brand && (
                <div className="font-semibold text-indigo-900 dark:text-indigo-100 mt-2">
                  🎯 Dominant Brand: {result.sources.vision_ai.dominant_brand}
                </div>
              )}
              {result.sources.vision_ai?.images_analyzed && (
                <div>Images analyzed: {result.sources.vision_ai.images_analyzed}</div>
              )}
            </div>
          </div>
        )}

        {/* Tier 1.5: Web Search AI */}
        {(result.sources.web_search_ai_a || result.sources.web_search_ai_b) && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <div className="font-semibold text-purple-900 dark:text-purple-200">
                Tier 1.5: Web Search AI Analysis{' '}
                <span className="text-xs font-normal text-purple-700 dark:text-purple-300">
                  (Claude Haiku 4.5)
                </span>
              </div>
            </div>
            <div className="text-sm text-purple-800 dark:text-purple-200 space-y-3">
              {result.sources.web_search_ai_b?.brands &&
                Object.keys(result.sources.web_search_ai_b.brands).length > 0 && (
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                    <div className="text-sm font-semibold mb-2 text-purple-900 dark:text-purple-100">
                      🔍 Search B: "{userResponse} {categoryName}"
                    </div>
                    <div className="space-y-2">
                      {Object.entries(result.sources.web_search_ai_b.brands).map(
                        ([brand, data]: [string, any]) => (
                          <div key={brand} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-purple-900 dark:text-purple-100">
                                {brand}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-purple-700 dark:text-purple-300">
                                  {data.count}/{result.sources.web_search_ai_b.total_results} (
                                  {data.percentage.toFixed(0)}%)
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                                  {data.avg_confidence}% confident
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Tier 3: Knowledge Graph */}
        {result.sources.knowledge_graph && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div className="font-semibold text-green-900 dark:text-green-200">
                Tier 3: Knowledge Graph Verification{' '}
                <span className="text-xs font-normal text-green-700 dark:text-green-300">
                  (Google Knowledge Graph API)
                </span>
              </div>
              {result.sources.knowledge_graph.verified_count > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                  ✓ {result.sources.knowledge_graph.verified_count} Verified
                </span>
              )}
            </div>
            <div className="text-sm text-green-800 dark:text-green-200 space-y-2">
              <div>
                Entities found: {result.sources.knowledge_graph.total_entities || 0}
              </div>
            </div>
          </div>
        )}

        {/* Tier 4: Embeddings */}
        {result.sources.embeddings && Object.keys(result.sources.embeddings).length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <div className="font-semibold text-orange-900 dark:text-orange-200">
                Tier 4: Embedding Similarity{' '}
                <span className="text-xs font-normal text-orange-700 dark:text-orange-300">
                  (OpenAI text-embedding-3-large)
                </span>
              </div>
            </div>
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.sources.embeddings)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([brand, similarity]) => (
                    <div
                      key={brand}
                      className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/40 px-3 py-1 rounded"
                    >
                      <span className="font-medium">{brand}:</span>
                      <span>{((similarity as number) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

