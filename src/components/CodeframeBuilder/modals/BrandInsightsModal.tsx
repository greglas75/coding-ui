/**
 * Brand Insights Modal - Comprehensive Validation Display
 * Shows EnhancedValidationResult with full validation breakdown
 */
import { X, CheckCircle, AlertCircle, Globe, Image as ImageIcon, ChevronLeft, ChevronRight, Brain, Eye, TrendingUp } from 'lucide-react';
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

  // Parse validation_evidence as EnhancedValidationResult
  let validationData: Record<string, unknown> | null = null;
  try {
    validationData = typeof node.validation_evidence === 'string'
      ? JSON.parse(node.validation_evidence)
      : (node.validation_evidence as Record<string, unknown>);
  } catch (e) {
    console.error('Failed to parse validation_evidence:', e);
  }

  console.log('🔍 BrandInsightsModal - validation data:', validationData);

  // Extract data from EnhancedValidationResult format
  const userResponse = validationData?.user_response || node.name;
  const translation = validationData?.translation || null;
  const variants = validationData?.variants || {};
  const confidence = validationData?.confidence || 0; // 0-100
  const recommendation = validationData?.recommendation || 'unknown';
  const reasoning = validationData?.reasoning || '';
  const riskFactors = validationData?.risk_factors || [];
  const visionAnalysis = validationData?.vision_analysis || {};
  const searchValidation = validationData?.search_validation || {};
  const translationInfo = validationData?.translation_info || {};
  const suggestedCodes = validationData?.suggested_codes || [];

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return 'VERY HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
  };

  // Z-index lower than BrandValidationModal (100) but higher than generic modals (50)
  const MODAL_Z_INDEX = 90;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: MODAL_Z_INDEX }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                AI Insights: Brand Validation
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Comprehensive analysis for: {node.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* USER RESPONSE & TRANSLATION */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                User Response
              </h3>
              <div className="text-2xl font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                {userResponse}
              </div>
            </div>
            {translation && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Translation
                </h3>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  {translation}
                </div>
              </div>
            )}
          </div>

          {/* VALIDATION BREAKDOWN */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-5 border border-purple-200 dark:border-purple-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              VALIDATION BREAKDOWN
            </h3>

            {/* Overall Confidence */}
            <div className="mb-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Overall Confidence
                  </span>
                  <span className={`text-xl font-bold ${getConfidenceColor(confidence)}`}>
                    {confidence}/100 ({getConfidenceLabel(confidence)})
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      confidence >= 80
                        ? 'bg-green-500'
                        : confidence >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {/* Vision Analysis */}
              {visionAnalysis && Object.keys(visionAnalysis).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">AI Vision</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {visionAnalysis.confidence_score || visionAnalysis.confidence || 'N/A'}
                    {typeof visionAnalysis.confidence_score === 'number' && '/100'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {visionAnalysis.products_identified || visionAnalysis.total_products || 0} products
                  </div>
                </div>
              )}

              {/* Google Search */}
              {searchValidation && Object.keys(searchValidation).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Google Search</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {searchValidation.confidence_score || searchValidation.confidence || 'N/A'}
                    {typeof searchValidation.confidence_score === 'number' && '/100'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {searchValidation.relevant_results || 0} results
                  </div>
                </div>
              )}

              {/* Google Images */}
              {visionAnalysis.image_match_score !== undefined && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Google Images</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {visionAnalysis.image_match_score}/100
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {visionAnalysis.analyzed_images?.length || 0} images
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MATCHED CODES FROM PINECONE */}
          {suggestedCodes && suggestedCodes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                MATCHED CODES (from existing database)
              </h3>
              <div className="space-y-2">
                {suggestedCodes.slice(0, 5).map((code: Record<string, unknown>, i: number) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      i === 0
                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                        : 'bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {i === 0 && <CheckCircle className="h-5 w-5 text-green-600" />}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {code.code_name || code.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        {((code.similarity || code.match_score || 0) * 100).toFixed(0)}% match
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {code.mentions || code.count || 0} mentions
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VARIANTS FOUND */}
          {variants && Object.keys(variants).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                VARIANTS FOUND
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-3">
                  {Object.entries(variants).map(([variant, count]: [string, unknown], i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{variant}</span>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GOOGLE SEARCH RESULTS */}
          {searchValidation.web_results && searchValidation.web_results.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                GOOGLE SEARCH RESULTS ({searchValidation.web_results.length})
              </h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-3 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                  🔍 Search phrase: <span className="font-mono text-orange-600 dark:text-orange-400">"{searchValidation.search_phrase || userResponse}"</span>
                </p>
              </div>
              <div className="space-y-2">
                {searchValidation.web_results.slice(0, 5).map((result: Record<string, string>, i: number) => {
                  const url = result.link || result.url;
                  let hostname = url;
                  try {
                    hostname = new URL(url).hostname;
                  } catch (e) {
                    // Keep original
                  }

                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-blue-600 dark:text-blue-400 text-sm hover:underline truncate">
                            {result.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {result.snippet}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {hostname}
                          </p>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* IMAGES ANALYZED */}
          {visionAnalysis.analyzed_images && visionAnalysis.analyzed_images.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                IMAGES ANALYZED ({visionAnalysis.analyzed_images.length})
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {visionAnalysis.analyzed_images.slice(0, 6).map((img: Record<string, unknown> | string, i: number) => (
                  <div
                    key={i}
                    className="relative aspect-square bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden group hover:ring-2 hover:ring-purple-500 transition-all"
                  >
                    <img
                      src={typeof img === 'string' ? img : (img.url as string || img.link as string || '')}
                      alt={`Product ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {typeof img === 'object' && img.similarity && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs p-1 text-center">
                        {Math.round((img.similarity as number) * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RECOMMENDATION */}
          <div className={`rounded-lg p-5 border-2 ${
            recommendation === 'approve'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
              : recommendation === 'reject'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
              : 'bg-gray-50 dark:bg-gray-900/50 border-gray-300'
          }`}>
            <div className="flex items-start gap-3">
              {recommendation === 'approve' ? (
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  RECOMMENDATION: {recommendation === 'approve' ? '✓ Approve' : '✗ Reject'}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {reasoning || 'No reasoning provided'}
                </p>
                {riskFactors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-red-800 dark:text-red-300">Risk Factors:</p>
                    {riskFactors.map((risk: string, i: number) => (
                      <p key={i} className="text-xs text-red-700 dark:text-red-400">
                        • {risk}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            {/* Navigation */}
            <div className="flex gap-2">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300 dark:border-gray-600"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300 dark:border-gray-600"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Approve/Reject */}
            <div className="flex gap-3">
              <button
                onClick={onReject}
                className="flex items-center gap-2 px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-semibold border-2 border-red-300 dark:border-red-700"
              >
                <AlertCircle className="h-5 w-5" />
                Reject
              </button>
              <button
                onClick={onApprove}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold shadow-lg"
              >
                <CheckCircle className="h-5 w-5" />
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
