import { X, Brain, Globe, Image as ImageIcon, Calendar, Cpu, Eye } from 'lucide-react';
import type { FC } from 'react';

interface AISuggestion {
  code_id: string;
  code_name: string;
  confidence: number;
  reasoning: string;
}

interface WebContext {
  title: string;
  snippet: string;
  url: string;
}

interface ImageResult {
  title: string;
  link: string;
  thumbnailLink?: string;
  contextLink?: string;
}

interface VisionAnalysisResult {
  brandDetected: boolean;
  brandName: string;
  confidence: number;
  reasoning: string;
  objectsDetected: string[];
}

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: AISuggestion;
  webContext?: WebContext[];
  images?: ImageResult[];
  timestamp?: string;
  model?: string;
  answer: string;
  translation?: string;
  searchQuery?: string;
  visionResult?: VisionAnalysisResult;
  categoryName?: string;
}

export const AIInsightsModal: FC<AIInsightsModalProps> = ({
  isOpen,
  onClose,
  suggestion,
  webContext,
  images,
  timestamp,
  model,
  answer,
  translation,
  searchQuery,
  visionResult,
  categoryName,
}) => {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.7) return 'text-blue-600 dark:text-blue-400';
    if (confidence >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  // Separate AI reasoning from Web Evidence
  const separateReasoning = (reasoning: string): { aiReasoning: string; webEvidence: string | null } => {
    const parts = reasoning.split('\n\n🔍 Web Evidence');
    if (parts.length === 1) {
      return { aiReasoning: reasoning, webEvidence: null };
    }
    return {
      aiReasoning: parts[0].trim(),
      webEvidence: '🔍 Web Evidence' + parts[1],
    };
  };

  const { aiReasoning, webEvidence } = separateReasoning(suggestion.reasoning);

  // Reconstruct search query if missing (for old cached data)
  const baseQuery = searchQuery || (translation && translation !== answer ? translation : answer);
  const displaySearchQuery = categoryName ? `${categoryName} ${baseQuery}` : baseQuery;
  const isReconstructed = !searchQuery && (webContext || images);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 flex flex-col max-w-4xl w-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                AI Insights
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Detailed analysis for: <span className="font-semibold">{suggestion.code_name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Answer */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              User Response
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-900 dark:text-gray-100">{answer}</p>
              {translation && translation !== answer && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-semibold">Translation:</span> {translation}
                </p>
              )}
            </div>
          </div>

          {/* Confidence */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Confidence Score
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    suggestion.confidence >= 0.9
                      ? 'bg-green-500'
                      : suggestion.confidence >= 0.7
                      ? 'bg-blue-500'
                      : suggestion.confidence >= 0.5
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                  }`}
                  style={{ width: `${suggestion.confidence * 100}%` }}
                />
              </div>
              <div className="text-right min-w-[120px]">
                <div className={`text-lg font-bold ${getConfidenceColor(suggestion.confidence)}`}>
                  {(suggestion.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {getConfidenceLabel(suggestion.confidence)}
                </div>
              </div>
            </div>
          </div>

          {/* AI Reasoning */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Reasoning
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                {aiReasoning}
              </p>
            </div>
          </div>

          {/* Warning for old cached data (no web validation) */}
          {!webContext && !images && !searchQuery && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                    Cached Data (No Web Evidence)
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                    This analysis was generated before web validation was added.
                    To see Google Search results, related images, and confidence boost from web evidence,
                    regenerate this suggestion.
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                    <span>💡</span>
                    <span>Click the 🔄 icon next to the suggestion to regenerate with full web analysis</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Web Evidence (if available) */}
          {webEvidence && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Web Evidence Validation
              </h3>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                  {webEvidence}
                </p>
              </div>
            </div>
          )}

          {/* Vision AI Analysis */}
          {visionResult && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Vision AI Analysis
              </h3>
              <div className={`rounded-lg p-4 border ${
                visionResult.brandDetected
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}>
                <div className="space-y-3">
                  {/* Detection Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Brand Detected:</span>
                    <span className={`text-sm font-bold ${
                      visionResult.brandDetected
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {visionResult.brandDetected ? `✓ ${visionResult.brandName}` : '✗ No brand detected'}
                    </span>
                  </div>

                  {/* Confidence */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Confidence:</span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      {(visionResult.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Objects Detected */}
                  {visionResult.objectsDetected && visionResult.objectsDetected.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Objects Detected:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {visionResult.objectsDetected.map((obj, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reasoning */}
                  <div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Analysis:</span>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 leading-relaxed">
                      {visionResult.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Web Context */}
          {webContext && webContext.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Web Context ({webContext.length} results)
              </h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  🔍 Google search phrase{isReconstructed && ' (reconstructed from answer)'}:
                </p>
                <p className="text-sm font-mono text-amber-800 dark:text-amber-300 mt-1">
                  &quot;{displaySearchQuery}&quot;
                </p>
              </div>
              <div className="space-y-3">
                {webContext.map((context, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <a
                      href={context.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {context.title}
                    </a>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {context.snippet}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {context.url}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images */}
          {images && images.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Related Images ({images.length})
              </h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  🔍 Google search phrase{isReconstructed && ' (reconstructed from answer)'}:
                </p>
                <p className="text-sm font-mono text-amber-800 dark:text-amber-300 mt-1">
                  &quot;{displaySearchQuery}&quot;
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {images.map((image, idx) => (
                  <a
                    key={idx}
                    href={image.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                  >
                    <img
                      src={image.link}
                      alt={image.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      loading="lazy"
                    />
                    {/* Domain Badge (Top) */}
                    {image.displayLink && (
                      <div className="absolute top-2 left-2 bg-blue-500/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        {image.displayLink}
                      </div>
                    )}
                    {/* Dimensions Badge (Bottom Right) */}
                    {image.width && image.height && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                        {image.width}×{image.height}
                      </div>
                    )}
                    {/* Hover Overlay with Details */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/75 transition-colors flex flex-col items-center justify-center p-2 gap-1">
                      <p className="text-white text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                        {image.title}
                      </p>
                      {image.snippet && (
                        <p className="text-white/80 text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">
                          {image.snippet}
                        </p>
                      )}
                      {(image.width || image.byteSize) && (
                        <div className="text-white/60 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          {image.width && <span>{image.width}×{image.height}px</span>}
                          {image.byteSize && <span>• {Math.round(image.byteSize / 1024)}KB</span>}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              {model && (
                <div className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  <span>Model: {model}</span>
                </div>
              )}
              {timestamp && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Generated: {new Date(timestamp).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
