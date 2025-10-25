/**
 * Brand Insights Modal - Shows Google validation results for brands
 */
import { X, CheckCircle, AlertCircle, Globe, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { type FC } from 'react';
import type { HierarchyNode } from '@/types/codeframe';

interface BrandInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: HierarchyNode;
  onApprove?: () => void;
  onReject?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const BrandInsightsModal: FC<BrandInsightsModalProps> = ({
  isOpen,
  onClose,
  node,
  onApprove,
  onReject,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}) => {
  if (!isOpen) return null;

  // Parse validation_evidence if it's a string
  const validationEvidence = typeof node.validation_evidence === 'string'
    ? JSON.parse(node.validation_evidence)
    : node.validation_evidence;

  const evidence = validationEvidence?.evidence || {};
  const searchResults = evidence.search_results?.results || [];
  const imageResults = evidence.image_results?.image_urls || [];
  const knowledgeGraph = evidence.knowledge_graph || {};

  const getConfidenceColor = () => {
    if (node.confidence === 'high') return 'text-green-600 dark:text-green-400';
    if (node.confidence === 'medium') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceBg = () => {
    if (node.confidence === 'high') return 'bg-green-100 dark:bg-green-900/30';
    if (node.confidence === 'medium') return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-purple-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Insights
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Detailed analysis for: {node.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Response */}
          {node.example_texts && (() => {
            try {
              const examples = typeof node.example_texts === 'string'
                ? JSON.parse(node.example_texts)
                : node.example_texts;
              if (examples && examples.length > 0) {
                return (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      User Response
                    </h3>
                    <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                      {examples[0].text || examples[0]}
                    </div>
                  </div>
                );
              }
            } catch (e) {
              return null;
            }
            return null;
          })()}

          {/* Confidence Score */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Confidence Score
            </h3>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg ${getConfidenceBg()}`}>
                <span className={`text-2xl font-bold ${getConfidenceColor()}`}>
                  {node.confidence?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Based on Google validation
              </span>
            </div>
          </div>

          {/* Knowledge Graph */}
          {knowledgeGraph.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Knowledge Graph
                </h3>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <p className="text-sm text-gray-900 dark:text-white">
                  {knowledgeGraph.description}
                </p>
                {knowledgeGraph.url && (
                  <a
                    href={knowledgeGraph.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline mt-2 inline-block"
                  >
                    Learn more →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Web Context */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Web Context ({searchResults.length} results)
                </h3>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-sm">
                <span className="text-gray-600 dark:text-gray-400">🔍 Google search phrase:</span>
                <div className="font-mono bg-white dark:bg-gray-900 p-2 rounded mt-1 text-orange-600 dark:text-orange-400">
                  "{node.name}"
                </div>
              </div>
              <div className="space-y-3">
                {searchResults.slice(0, 5).map((result: any, i: number) => (
                  <a
                    key={i}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                  >
                    <h4 className="font-medium text-blue-600 dark:text-blue-400 text-sm mb-1">
                      {result.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {result.snippet}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {result.display_link}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Related Images */}
          {imageResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Related Images ({imageResults.length})
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {imageResults.slice(0, 6).map((url: string, i: number) => (
                  <div key={i} className="relative aspect-video bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                    <img
                      src={url}
                      alt={`${node.name} image ${i + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            {/* Navigation */}
            <div className="flex gap-2">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Approve/Reject */}
            <div className="flex gap-3">
              <button
                onClick={onReject}
                className="flex items-center gap-2 px-6 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                <AlertCircle className="h-4 w-4" />
                Reject
              </button>
              <button
                onClick={onApprove}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
