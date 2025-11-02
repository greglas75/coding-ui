/**
 * 🔍 Brand Validation Modal - Multi-Source 6-Tier Validation Results
 *
 * Shows detailed breakdown from:
 * - Tier 0: Pinecone Vector Search (Existing Database)
 * - Tier 1: Dual Google Images Search (Google Custom Search API)
 * - Tier 2: Vision AI Analysis (Google Gemini Vision)
 * - Tier 3: Knowledge Graph Verification (Google Knowledge Graph API)
 * - Tier 4: Embedding Similarity (OpenAI text-embedding-3-large)
 * - Tier 5: Multi-Source Aggregation (Pattern Detection)
 */

import { X, Brain, Database, Globe, Image as ImageIcon, Eye, Zap, TrendingUp, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, Search, GitBranch, ArrowDown, AlertTriangle, Info } from 'lucide-react';
import { useEffect, type FC } from 'react';
import type { MultiSourceValidationResult, ValidationCandidate } from '../../../services/multiSourceValidator';

interface BrandValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: MultiSourceValidationResult;
  userResponse: string;
  translation?: string;
  categoryName: string;

  // Navigation between answers
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export const BrandValidationModal: FC<BrandValidationModalProps> = ({
  isOpen,
  onClose,
  result,
  userResponse,
  translation,
  categoryName,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  currentIndex,
  totalCount,
}) => {
  // ESC key to close & auto-scroll to top
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Arrow keys for navigation
      if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious();
      }
      if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Auto-scroll modal content to top when opened
    const modalContent = document.querySelector('.brand-validation-modal-content');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }

    // Cleanup function always runs when effect re-runs or component unmounts
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  if (!isOpen) return null;

  // Get validation type badge
  const getTypeBadge = () => {
    const badges = {
      global_code: { icon: '🌐', text: 'Global Code', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
      brand_match: { icon: '✅', text: 'Brand Match', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
      category_error: { icon: '❌', text: 'Category Error', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' },
      ambiguous_descriptor: { icon: '⚠️', text: 'Ambiguous', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' },
      clear_match: { icon: '🎯', text: 'Clear Match', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
      unclear: { icon: '❓', text: 'Unclear', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
    };
    return badges[result.type] || badges.unclear;
  };

  const badge = getTypeBadge();

  // Get UI action badge
  const getActionBadge = () => {
    const actions = {
      approve: { text: 'Auto-Approve', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
      ask_user_choose: { text: 'Disambiguation Needed', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' },
      review_category: { text: 'Category Review', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
      manual_review: { text: 'Manual Review', color: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    };
    return actions[result.ui_action] || actions.manual_review;
  };

  const action = getActionBadge();

  // Higher z-index than other modals to ensure it's always on top
  const MODAL_Z_INDEX = 100; // brand-validation has highest priority

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: MODAL_Z_INDEX }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 flex flex-col max-w-6xl w-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Multi-Source Brand Validation
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                6-Tier validation system • Category: {categoryName}
              </p>
            </div>

            {/* Navigation */}
            {totalCount && totalCount > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous answer (←)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                  {currentIndex !== undefined ? currentIndex + 1 : '?'} / {totalCount}
                </span>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next answer (→)"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="brand-validation-modal-content flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Response - Two Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column: User Response */}
            <div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                User Response
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-lg text-gray-900 dark:text-gray-100 font-medium">{userResponse}</p>
              </div>
            </div>

            {/* Right Column: Translation */}
            <div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Translation
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-lg text-gray-900 dark:text-gray-100 font-medium">
                  {translation && translation !== userResponse ? translation : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Validation Result */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type Badge */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Validation Type
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${badge.color}`}>
                <span>{badge.icon}</span>
                <span>{badge.text}</span>
              </div>
            </div>

            {/* Confidence Score */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Confidence Score
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      result.confidence >= 90
                        ? 'bg-green-500'
                        : result.confidence >= 70
                        ? 'bg-blue-500'
                        : result.confidence >= 50
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {result.confidence}%
                </div>
              </div>
            </div>
          </div>

          {/* UI Action */}
          <div className={`rounded-lg p-4 border ${action.color}`}>
            <div className="font-semibold mb-1">Recommended Action: {action.text}</div>
            <div className="text-sm opacity-90">{result.reasoning}</div>
          </div>

          {/* Confidence Breakdown */}
          {result.sources?.confidence_breakdown && (
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
                {result.sources.confidence_breakdown.vision_ai && (
                  <div className="p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-indigo-200 dark:border-indigo-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          Vision AI
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          result.sources.confidence_breakdown.vision_ai.status === 'strong'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : result.sources.confidence_breakdown.vision_ai.status === 'moderate'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {result.sources.confidence_breakdown.vision_ai.status}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        +{result.sources.confidence_breakdown.vision_ai.contribution}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{
                            width: `${result.sources.confidence_breakdown.vision_ai.max_contribution > 0
                              ? (result.sources.confidence_breakdown.vision_ai.contribution / result.sources.confidence_breakdown.vision_ai.max_contribution) * 100
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {result.sources.confidence_breakdown.vision_ai.contribution}/{result.sources.confidence_breakdown.vision_ai.max_contribution}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {result.sources.confidence_breakdown.vision_ai.reason}
                    </div>
                  </div>
                )}

                {/* Web Search */}
                {result.sources.confidence_breakdown.web_search && (
                  <div className="p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          Web Search AI
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          result.sources.confidence_breakdown.web_search.status === 'strong'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : result.sources.confidence_breakdown.web_search.status === 'moderate'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {result.sources.confidence_breakdown.web_search.status}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        +{result.sources.confidence_breakdown.web_search.contribution}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{
                            width: `${result.sources.confidence_breakdown.web_search.max_contribution > 0
                              ? (result.sources.confidence_breakdown.web_search.contribution / result.sources.confidence_breakdown.web_search.max_contribution) * 100
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {result.sources.confidence_breakdown.web_search.contribution}/{result.sources.confidence_breakdown.web_search.max_contribution}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {result.sources.confidence_breakdown.web_search.reason}
                    </div>
                  </div>
                )}

                {/* Knowledge Graph */}
                {result.sources.confidence_breakdown.knowledge_graph && (
                  <div className="p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          Knowledge Graph
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          result.sources.confidence_breakdown.knowledge_graph.status === 'strong'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : result.sources.confidence_breakdown.knowledge_graph.status === 'weak'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}>
                          {result.sources.confidence_breakdown.knowledge_graph.status}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        +{result.sources.confidence_breakdown.knowledge_graph.contribution}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${result.sources.confidence_breakdown.knowledge_graph.max_contribution > 0
                              ? (result.sources.confidence_breakdown.knowledge_graph.contribution / result.sources.confidence_breakdown.knowledge_graph.max_contribution) * 100
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {result.sources.confidence_breakdown.knowledge_graph.contribution}/{result.sources.confidence_breakdown.knowledge_graph.max_contribution}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {result.sources.confidence_breakdown.knowledge_graph.reason}
                    </div>
                  </div>
                )}

                {/* Embeddings */}
                {result.sources.confidence_breakdown.embeddings && (
                  <div className="p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-orange-200 dark:border-orange-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          Embeddings
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          result.sources.confidence_breakdown.embeddings.status === 'strong'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : result.sources.confidence_breakdown.embeddings.status === 'moderate'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {result.sources.confidence_breakdown.embeddings.status}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        +{result.sources.confidence_breakdown.embeddings.contribution}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500"
                          style={{
                            width: `${result.sources.confidence_breakdown.embeddings.max_contribution > 0
                              ? (result.sources.confidence_breakdown.embeddings.contribution / result.sources.confidence_breakdown.embeddings.max_contribution) * 100
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {result.sources.confidence_breakdown.embeddings.contribution}/{result.sources.confidence_breakdown.embeddings.max_contribution}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {result.sources.confidence_breakdown.embeddings.reason}
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
          )}

          {/* Decision Tree */}
          {result.sources?.decision_tree && (
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div className="font-semibold text-slate-900 dark:text-slate-200">
                  Decision Tree
                </div>
              </div>

              <div className="space-y-3">
                {result.sources.decision_tree.map((step: any, index: number) => {
                  const isLast = index === result.sources.decision_tree.length - 1;
                  const iconMap: Record<string, any> = {
                    eye: Eye,
                    search: Search,
                    'check-circle': CheckCircle,
                    globe: Globe,
                    zap: Zap,
                    'trending-up': TrendingUp,
                  };
                  const Icon = iconMap[step.icon] || CheckCircle;

                  return (
                    <div key={step.step} className="relative">
                      {/* Step Card */}
                      <div className={`p-4 rounded-lg border-2 transition-all ${
                        step.result
                          ? 'bg-white dark:bg-slate-900/50 border-green-300 dark:border-green-700'
                          : 'bg-white dark:bg-slate-900/50 border-yellow-300 dark:border-yellow-700'
                      }`}>
                        {/* Step Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${
                              step.result
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'bg-yellow-100 dark:bg-yellow-900/30'
                            }`}>
                              <Icon className={`h-4 w-4 ${
                                step.result
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-yellow-600 dark:text-yellow-400'
                              }`} />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Step {step.step}
                              </div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {step.check}
                              </div>
                            </div>
                          </div>

                          <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            step.signal === 'STRONG' || step.signal === 'HIGH' || step.signal === 'VERIFIED' || step.signal === 'CLEAR_MATCH'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : step.signal === 'MODERATE' || step.signal === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : step.signal === 'WEAK' || step.signal === 'LOW' || step.signal === 'MISMATCH' || step.signal === 'UNCLEAR'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                          }`}>
                            {step.signal}
                          </div>
                        </div>

                        {/* Question */}
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
                          "{step.question}"
                        </div>

                        {/* Result Icon and Details */}
                        <div className="flex items-start gap-2 mb-2">
                          <div className="mt-0.5">
                            {step.result ? (
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            )}
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {step.details}
                          </div>
                        </div>

                        {/* Impact */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <TrendingUp className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                            Impact: {step.impact}
                          </span>
                        </div>
                      </div>

                      {/* Arrow to next step */}
                      {!isLast && (
                        <div className="flex justify-center my-2">
                          <ArrowDown className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900/30 rounded-lg border border-slate-300 dark:border-slate-700">
                <div className="text-sm text-slate-800 dark:text-slate-200">
                  <strong>Decision Logic:</strong> The validation system checks each tier sequentially,
                  combining their signals to detect patterns. Strong agreement across multiple sources
                  increases confidence, while mismatches or low scores reduce it.
                </div>
              </div>
            </div>
          )}

          {/* Issues & Warnings */}
          {result.sources?.issues_detected && result.sources.issues_detected.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div className="font-semibold text-yellow-900 dark:text-yellow-200">
                  Issues Detected ({result.sources.issues_detected.length})
                </div>
              </div>

              <div className="space-y-3">
                {result.sources.issues_detected.map((issue: any, index: number) => {
                  // Icon map
                  const iconMap: Record<string, any> = {
                    'alert-triangle': AlertTriangle,
                    'alert-circle': AlertCircle,
                    'info': Info,
                  };
                  const Icon = iconMap[issue.icon] || AlertCircle;

                  // Severity colors
                  const severityConfig = {
                    high: {
                      bg: 'bg-red-50 dark:bg-red-900/20',
                      border: 'border-red-300 dark:border-red-700',
                      icon: 'text-red-600 dark:text-red-400',
                      badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                      text: 'text-red-900 dark:text-red-100',
                    },
                    medium: {
                      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                      border: 'border-yellow-300 dark:border-yellow-700',
                      icon: 'text-yellow-600 dark:text-yellow-400',
                      badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                      text: 'text-yellow-900 dark:text-yellow-100',
                    },
                    low: {
                      bg: 'bg-blue-50 dark:bg-blue-900/20',
                      border: 'border-blue-300 dark:border-blue-700',
                      icon: 'text-blue-600 dark:text-blue-400',
                      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                      text: 'text-blue-900 dark:text-blue-100',
                    },
                  };

                  const config = severityConfig[issue.severity as keyof typeof severityConfig] || severityConfig.low;

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${config.bg} ${config.border}`}
                    >
                      {/* Issue Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2 flex-1">
                          <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.icon}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-semibold ${config.text}`}>
                                {issue.title}
                              </h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${config.badge}`}>
                                {issue.severity}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Tier: {issue.tier.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Problem */}
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Problem:
                        </div>
                        <div className="text-sm text-gray-800 dark:text-gray-200">
                          {issue.problem}
                        </div>
                        {issue.expected && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {issue.expected}
                          </div>
                        )}
                      </div>

                      {/* Impact */}
                      {issue.impact && (
                        <div className="mb-2">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Impact:
                          </div>
                          <div className="text-sm text-gray-800 dark:text-gray-200">
                            {issue.impact}
                          </div>
                        </div>
                      )}

                      {/* Suggestion */}
                      {issue.suggestion && (
                        <div className="p-3 bg-white/50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Suggestion:
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {issue.suggestion}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700">
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>About Issues:</strong> These are potential problems detected during validation.
                  High severity issues may require manual review. Medium and low severity issues are informational
                  and may not affect the final result significantly.
                </div>
              </div>
            </div>
          )}

          {/* Matched Brand (if any) */}
          {result.brand && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="font-semibold text-green-900 dark:text-green-200">
                  Matched Brand
                </div>
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {result.brand}
              </div>
              {result.brand_id && (
                <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                  ID: {result.brand_id}
                </div>
              )}
            </div>
          )}

          {/* Category Error (if any) */}
          {result.type === 'category_error' && result.detected_entity && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div className="font-semibold text-red-900 dark:text-red-200">
                  Category Mismatch Detected
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-red-800 dark:text-red-300">Detected:</span>{' '}
                  <span className="text-red-900 dark:text-red-100">{result.detected_entity}</span>
                  {result.detected_category && (
                    <span className="text-red-700 dark:text-red-300"> ({result.detected_category})</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-red-800 dark:text-red-300">Expected:</span>{' '}
                  <span className="text-red-900 dark:text-red-100">{result.expected_category}</span>
                </div>
              </div>
            </div>
          )}

          {/* Candidates (for ambiguous) */}
          {result.candidates && result.candidates.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Disambiguation Candidates ({result.candidates.length})
              </h3>
              <div className="space-y-2">
                {result.candidates.map((candidate, idx) => (
                  <div
                    key={idx}
                    className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-yellow-900 dark:text-yellow-100 text-lg">
                          {candidate.brand}
                        </div>
                        {candidate.full_name !== candidate.brand && (
                          <div className="text-sm text-yellow-700 dark:text-yellow-300">
                            {candidate.full_name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                          {(candidate.score * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400">
                          Composite Score
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>Vision: {(candidate.vision_frequency * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        <span>Embedding: {(candidate.embedding_similarity * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>KG: {candidate.kg_verified ? '✓ Verified' : '✗ Not found'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        <span>Pinecone: {candidate.pinecone_match ? '✓ Match' : '✗ New'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources Breakdown */}
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
                      Tier 0: Pinecone Vector Search <span className="text-xs font-normal text-purple-700 dark:text-purple-300">(Existing Database)</span>
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
                        <div>Similarity: {((result.sources.pinecone.similarity || 0) * 100).toFixed(1)}%</div>
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
                      Tier 1: Dual Google Images Search <span className="text-xs font-normal text-blue-700 dark:text-blue-300">(Google Custom Search API)</span>
                    </div>
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    {result.sources.google_search_a && (
                      <div>Search A (no category): {result.sources.google_search_a.results_count} results{result.sources.google_search_a.pattern && ` (${result.sources.google_search_a.pattern})`}</div>
                    )}
                    {result.sources.google_search_b && (
                      <div>Search B (with category): {result.sources.google_search_b.results_count} results{result.sources.google_search_b.pattern && ` (${result.sources.google_search_b.pattern})`}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Tier 2: Vision AI Analysis */}
              {(result.sources.vision_ai_search_a || result.sources.vision_ai_search_b || result.sources.vision_ai) && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <div className="font-semibold text-indigo-900 dark:text-indigo-200">
                      Tier 2: Vision AI Analysis <span className="text-xs font-normal text-indigo-700 dark:text-indigo-300">(Google Gemini Vision)</span>
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
                                {result.sources.vision_ai_search_a.total_images ?? (result.sources.vision_ai_search_a.correct_matches + result.sources.vision_ai_search_a.mismatched_count)}
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
                                Accuracy: {Math.round((result.sources.vision_ai_search_a.correct_matches / (result.sources.vision_ai_search_a.total_images ?? (result.sources.vision_ai_search_a.correct_matches + result.sources.vision_ai_search_a.mismatched_count))) * 100)}%
                              </div>
                            </div>
                          </div>

                          {/* Show brands detected */}
                          {result.sources.vision_ai_search_a.brands && Object.keys(result.sources.vision_ai_search_a.brands).length > 0 && (
                            <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Brands Detected:
                              </div>
                              {Object.entries(result.sources.vision_ai_search_a.brands).map(([brand, data]: [string, any]) => (
                                <div key={brand} className="text-xs text-gray-700 dark:text-gray-300">
                                  • {brand}: {data.count} images ({Math.round(data.frequency * 100)}%)
                                  {data.avg_confidence && (
                                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                                      ({Math.round(data.avg_confidence)}% confident)
                                    </span>
                                  )}
                                </div>
                              ))}
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
                                {result.sources.vision_ai_search_b.total_images ?? (result.sources.vision_ai_search_b.correct_matches + result.sources.vision_ai_search_b.mismatched_count)}
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
                                Accuracy: {Math.round((result.sources.vision_ai_search_b.correct_matches / (result.sources.vision_ai_search_b.total_images ?? (result.sources.vision_ai_search_b.correct_matches + result.sources.vision_ai_search_b.mismatched_count))) * 100)}%
                              </div>
                            </div>
                          </div>

                          {/* Show brands detected */}
                          {result.sources.vision_ai_search_b.brands && Object.keys(result.sources.vision_ai_search_b.brands).length > 0 && (
                            <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                Brands Detected:
                              </div>
                              {Object.entries(result.sources.vision_ai_search_b.brands).map(([brand, data]: [string, any]) => (
                                <div key={brand} className="text-xs text-gray-700 dark:text-gray-300">
                                  • {brand}: {data.count} images ({Math.round(data.frequency * 100)}%)
                                  {data.avg_confidence && (
                                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                                      ({Math.round(data.avg_confidence)}% confident)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Perfect match badge */}
                          {result.sources.vision_ai_search_b.mismatched_count === 0 &&
                           (result.sources.vision_ai_search_b.total_images ?? (result.sources.vision_ai_search_b.correct_matches + result.sources.vision_ai_search_b.mismatched_count)) > 0 && (
                            <div className="mt-3 px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs text-green-800 dark:text-green-200 text-center font-medium">
                              ✅ Perfect Category Match!
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Comparison Note */}
                      {result.sources.vision_ai_search_a && result.sources.vision_ai_search_b &&
                       result.sources.vision_ai_search_b.correct_matches > result.sources.vision_ai_search_a.correct_matches && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="text-sm text-green-800 dark:text-green-200">
                            ✅ <strong>Category filtering improved results:</strong> Search B found{' '}
                            <strong>{result.sources.vision_ai_search_b.correct_matches - result.sources.vision_ai_search_a.correct_matches}</strong>{' '}
                            more correct products by adding "{categoryName}" to the search.
                          </div>
                        </div>
                      )}

                      {/* Warning if Search A had many mismatches */}
                      {result.sources.vision_ai_search_a &&
                       result.sources.vision_ai_search_a.mismatched_count > result.sources.vision_ai_search_a.correct_matches && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ <strong>Note:</strong> Search A found more incorrect product types than correct ones.
                            This brand may produce multiple product categories (e.g., both toothpaste and whitening strips).
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fallback: Show aggregated vision_ai if no search breakdown */}
                  {!result.sources.vision_ai_search_a && !result.sources.vision_ai_search_b && result.sources.vision_ai && (
                    <div className="text-sm text-indigo-800 dark:text-indigo-200 space-y-2">
                      <div>Images analyzed: {result.sources.vision_ai.images_analyzed}</div>
                      <div>Products identified: {result.sources.vision_ai.products_identified}</div>
                      {result.sources.vision_ai.dominant_brand && (
                        <div className="font-semibold text-indigo-900 dark:text-indigo-100 mt-2">
                          🎯 Dominant Brand: {result.sources.vision_ai.dominant_brand}
                        </div>
                      )}
                      {result.sources.vision_ai.brands_detected && Object.keys(result.sources.vision_ai.brands_detected).length > 0 && (
                        <div className="mt-3 p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                          <div className="text-sm font-semibold mb-2 text-indigo-900 dark:text-indigo-100">Brand Detection Results:</div>
                          <div className="space-y-2">
                            {Object.entries(result.sources.vision_ai.brands_detected).map(([brand, data]: [string, any]) => (
                              <div key={brand} className="flex items-center justify-between text-sm">
                                <span className="font-medium text-indigo-900 dark:text-indigo-100">{brand}</span>
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
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tier 1: Web Search Results */}
              {result.sources.tier_1_web_search && (
                <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <div className="font-semibold text-sky-900 dark:text-sky-200">
                      Tier 1: Web Search Results <span className="text-xs font-normal text-sky-700 dark:text-sky-300">(Google Custom Search)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search B (with category) */}
                    {result.sources.tier_1_web_search.search_b && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-sky-200 dark:border-sky-700">
                        <h4 className="text-sm font-semibold mb-2 text-sky-900 dark:text-sky-100">
                          🔍 Search B: "{result.sources.tier_1_web_search.search_b.query}"
                        </h4>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Total Results:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {result.sources.tier_1_web_search.search_b.analysis.total_results}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Brand Mentions:</span>
                            <span className={`font-semibold text-lg ${
                              result.sources.tier_1_web_search.search_b.analysis.brand_mention_rate === 100
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-sky-600 dark:text-sky-400'
                            }`}>
                              {result.sources.tier_1_web_search.search_b.analysis.brand_mention_rate}%
                            </span>
                          </div>

                          {result.sources.tier_1_web_search.search_b.analysis.brand_mention_rate === 100 && (
                            <div className="mt-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs text-green-800 dark:text-green-200">
                              ✅ Perfect category match!
                            </div>
                          )}
                        </div>

                        {result.sources.tier_1_web_search.search_b.analysis.top_domains.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Top Domains:</div>
                            <div className="space-y-1">
                              {result.sources.tier_1_web_search.search_b.analysis.top_domains.map((d: any) => (
                                <div key={d.domain} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{d.domain}</span>
                                  <span className="text-gray-500 dark:text-gray-400 font-medium">{d.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expandable: Show all URLs */}
                        <details className="mt-3">
                          <summary className="text-xs text-sky-600 dark:text-sky-400 cursor-pointer hover:underline">
                            View all {result.sources.tier_1_web_search.search_b.analysis.total_results} results
                          </summary>
                          <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                            {result.sources.tier_1_web_search.search_b.results.map((res: any, i: number) => (
                              <div key={i} className="text-xs border-l-2 border-sky-300 dark:border-sky-600 pl-2 py-1">
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-700 dark:text-sky-300 hover:underline"
                                >
                                  {res.title}
                                </a>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Search A (brand only) */}
                    {result.sources.tier_1_web_search.search_a && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-sky-200 dark:border-sky-700">
                        <h4 className="text-sm font-semibold mb-2 text-sky-900 dark:text-sky-100">
                          🔍 Search A: "{result.sources.tier_1_web_search.search_a.query}"
                        </h4>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Total Results:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {result.sources.tier_1_web_search.search_a.analysis.total_results}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Brand Mentions:</span>
                            <span className="font-semibold text-lg text-sky-600 dark:text-sky-400">
                              {result.sources.tier_1_web_search.search_a.analysis.brand_mention_rate}%
                            </span>
                          </div>
                        </div>

                        {result.sources.tier_1_web_search.search_a.analysis.top_domains.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Top Domains:</div>
                            <div className="space-y-1">
                              {result.sources.tier_1_web_search.search_a.analysis.top_domains.map((d: any) => (
                                <div key={d.domain} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{d.domain}</span>
                                  <span className="text-gray-500 dark:text-gray-400 font-medium">{d.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expandable: Show all URLs */}
                        <details className="mt-3">
                          <summary className="text-xs text-sky-600 dark:text-sky-400 cursor-pointer hover:underline">
                            View all {result.sources.tier_1_web_search.search_a.analysis.total_results} results
                          </summary>
                          <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                            {result.sources.tier_1_web_search.search_a.results.map((res: any, i: number) => (
                              <div key={i} className="text-xs border-l-2 border-sky-300 dark:border-sky-600 pl-2 py-1">
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-700 dark:text-sky-300 hover:underline"
                                >
                                  {res.title}
                                </a>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>

                  {/* Comparison Note */}
                  {result.sources.tier_1_web_search.search_a && result.sources.tier_1_web_search.search_b &&
                   result.sources.tier_1_web_search.search_b.analysis.brand_mention_rate >
                   result.sources.tier_1_web_search.search_a.analysis.brand_mention_rate && (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
                      ✅ Adding category improved results: {result.sources.tier_1_web_search.search_b.analysis.brand_mention_rate}% vs{' '}
                      {result.sources.tier_1_web_search.search_a.analysis.brand_mention_rate}%
                    </div>
                  )}
                </div>
              )}

              {/* Tier 1.5: Web Search AI */}
              {(result.sources.web_search_ai_a || result.sources.web_search_ai_b) && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <div className="font-semibold text-purple-900 dark:text-purple-200">
                      Tier 1.5: Web Search AI Analysis <span className="text-xs font-normal text-purple-700 dark:text-purple-300">(Claude Haiku 4.5)</span>
                    </div>
                  </div>
                  <div className="text-sm text-purple-800 dark:text-purple-200 space-y-3">

                    {/* Search B (with category) */}
                    {result.sources.web_search_ai_b?.brands && Object.keys(result.sources.web_search_ai_b.brands).length > 0 && (
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                        <div className="text-sm font-semibold mb-2 text-purple-900 dark:text-purple-100">
                          🔍 Search B: "{userResponse} {categoryName}"
                        </div>
                        <div className="space-y-2">
                          {Object.entries(result.sources.web_search_ai_b.brands).map(([brand, data]: [string, any]) => (
                            <div key={brand} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-purple-900 dark:text-purple-100">{brand}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-purple-700 dark:text-purple-300">
                                    {data.count}/{result.sources.web_search_ai_b.total_results} ({(data.percentage).toFixed(0)}%)
                                  </span>
                                  <span className="text-xs px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                                    {data.avg_confidence}% confident
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-2 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-600 dark:bg-purple-400"
                                  style={{ width: `${data.percentage}%` }}
                                />
                              </div>
                              {data.sources && data.sources.length > 0 && (
                                <div className="text-xs text-purple-600 dark:text-purple-400">
                                  Sources: {data.sources.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search A (without category) */}
                    {result.sources.web_search_ai_a?.brands && Object.keys(result.sources.web_search_ai_a.brands).length > 0 && (
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                        <div className="text-sm font-semibold mb-2 text-purple-900 dark:text-purple-100">
                          🔍 Search A: "{userResponse}"
                        </div>
                        <div className="space-y-2">
                          {Object.entries(result.sources.web_search_ai_a.brands).map(([brand, data]: [string, any]) => (
                            <div key={brand} className="flex items-center justify-between text-sm">
                              <span className="font-medium text-purple-900 dark:text-purple-100">{brand}</span>
                              <span className="text-purple-700 dark:text-purple-300">
                                {data.count}/{result.sources.web_search_ai_a.total_results} ({(data.percentage).toFixed(0)}%)
                              </span>
                            </div>
                          ))}
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
                      Tier 3: Knowledge Graph Verification <span className="text-xs font-normal text-green-700 dark:text-green-300">(Google Knowledge Graph API)</span>
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

                    {result.sources.knowledge_graph.entities && Object.keys(result.sources.knowledge_graph.entities).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {Object.entries(result.sources.knowledge_graph.entities).map(([entityName, data]: [string, any]) => (
                          <div
                            key={entityName}
                            className={`p-3 rounded-lg ${
                              data.verified
                                ? 'bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700'
                                : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-green-900 dark:text-green-100">
                                {entityName}
                              </span>
                              {data.verified ? (
                                <span className="text-xs px-2 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full">
                                  ✅ VERIFIED
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                                  ✗ Not found
                                </span>
                              )}
                            </div>
                            {data.entity_type && (
                              <div className="text-xs text-green-700 dark:text-green-300">
                                Type: <strong>{data.entity_type}</strong>
                                {data.category && ` • Category: ${data.category}`}
                              </div>
                            )}
                            {data.description && (
                              <div className="text-xs text-green-600 dark:text-green-400 mt-1 italic">
                                {data.description}
                              </div>
                            )}
                            {data.matches_category !== null && (
                              <div className="text-xs mt-1">
                                {data.matches_category ? (
                                  <span className="text-green-700 dark:text-green-300">✓ Matches category</span>
                                ) : (
                                  <span className="text-orange-600 dark:text-orange-400">⚠ Category mismatch</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tier 4: Embeddings */}
              {result.sources.embeddings && Object.keys(result.sources.embeddings).length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <div className="font-semibold text-orange-900 dark:text-orange-200">
                      Tier 4: Embedding Similarity <span className="text-xs font-normal text-orange-700 dark:text-orange-300">(OpenAI text-embedding-3-large)</span>
                    </div>
                  </div>
                  <div className="text-sm text-orange-800 dark:text-orange-200">
                    <div className="flex flex-wrap gap-2">
                      {result.sources.embeddings && Object.keys(result.sources.embeddings).length > 0 ? (
                        Object.entries(result.sources.embeddings)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([brand, similarity]) => (
                            <div
                              key={brand}
                              className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/40 px-3 py-1 rounded"
                            >
                              <span className="font-medium">{brand}:</span>
                              <span>{((similarity as number) * 100).toFixed(1)}%</span>
                            </div>
                          ))
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 text-xs">No embedding data available</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Image Gallery (RAW DATA) - Two Column Layout */}
          {result.image_urls && result.image_urls.length > 0 && (() => {
            const midpoint = Math.ceil(result.image_urls.length / 2);
            const searchAImages = result.image_urls.slice(0, midpoint);
            const searchBImages = result.image_urls.slice(midpoint);
            const searchQueryA = userResponse;
            const searchQueryB = `${userResponse} ${categoryName}`;

            return (
              <div>
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-blue-600" />
                  Image Gallery ({result.image_urls.length} images from Google Images)
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* Search A Column */}
                  <div>
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                      <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">Search A:</span>
                      <span className="text-gray-700 dark:text-gray-300">{searchQueryA}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchAImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                        >
                          <a
                            href={img.context_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={img.thumbnail_url || img.url}
                              alt={img.title}
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <div className="p-2">
                              <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 font-medium">
                                {img.title}
                              </div>
                              {img.snippet && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                                  {img.snippet}
                                </div>
                              )}
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Search B Column */}
                  <div>
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                      <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">Search B:</span>
                      <span className="text-gray-700 dark:text-gray-300">{searchQueryB}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchBImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                        >
                          <a
                            href={img.context_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={img.thumbnail_url || img.url}
                              alt={img.title}
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <div className="p-2">
                              <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 font-medium">
                                {img.title}
                              </div>
                              {img.snippet && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                                  {img.snippet}
                                </div>
                              )}
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Web Search Results (RAW DATA) - Two Column Layout */}
          {result.web_results && result.web_results.length > 0 && (() => {
            const midpoint = Math.ceil(result.web_results.length / 2);
            const searchAResults = result.web_results.slice(0, midpoint);
            const searchBResults = result.web_results.slice(midpoint);
            const searchQueryA = userResponse;
            const searchQueryB = `${userResponse} ${categoryName}`;

            return (
              <div>
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Web Search Results ({result.web_results.length} results)
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* Search A Column */}
                  <div>
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                      <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">Search A:</span>
                      <span className="text-gray-700 dark:text-gray-300">{searchQueryA}</span>
                    </div>
                    <div className="space-y-3">
                      {searchAResults.map((webResult, idx) => (
                        <div
                          key={idx}
                          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 hover:shadow-md transition-shadow"
                        >
                          <a
                            href={webResult.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="text-sm font-semibold text-blue-900 dark:text-blue-200 hover:underline mb-1">
                              {webResult.title}
                            </div>
                            <div className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                              {webResult.snippet}
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 break-all">
                              {webResult.url}
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Search B Column */}
                  <div>
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                      <span className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">Search B:</span>
                      <span className="text-gray-700 dark:text-gray-300">{searchQueryB}</span>
                    </div>
                    <div className="space-y-3">
                      {searchBResults.map((webResult, idx) => (
                        <div
                          key={idx}
                          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 hover:shadow-md transition-shadow"
                        >
                          <a
                            href={webResult.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="text-sm font-semibold text-green-900 dark:text-green-200 hover:underline mb-1">
                              {webResult.title}
                            </div>
                            <div className="text-xs text-green-700 dark:text-green-300 mb-2">
                              {webResult.snippet}
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400 break-all">
                              {webResult.url}
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Knowledge Graph Details (RAW DATA) */}
          {result.kg_details && Object.keys(result.kg_details).length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="font-semibold text-green-900 dark:text-green-200">
                  Tier 3: Knowledge Graph Verification{' '}
                  <span className="text-xs font-normal text-green-700 dark:text-green-300">
                    (Google Knowledge Graph API)
                  </span>
                </div>
              </div>

              <div className="text-sm text-green-800 dark:text-green-200">
                <div className="mb-2">
                  Entities found: {Object.keys(result.kg_details).length}
                </div>

                <div className="space-y-3 mt-3">
                  {Object.entries(result.kg_details).map(([entity, details]: [string, any]) => {
                    // Determine status
                    const isError = details.is_error;
                    const isWarning = details.is_warning;
                    const isVerified = details.verified && !isError && !isWarning;

                    return (
                      <div
                        key={entity}
                        className={`p-3 rounded-lg border-2 ${
                          isError
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                            : isWarning
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                            : isVerified
                            ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700'
                            : 'bg-gray-100 dark:bg-gray-900/40 border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        {/* Header with Status Badge */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {entity}
                          </div>

                          {isError && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-full">
                              <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                              <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                                ERROR
                              </span>
                            </div>
                          )}

                          {isWarning && !isError && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-full">
                              <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                              <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                                WARNING
                              </span>
                            </div>
                          )}

                          {isVerified && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full">
                              <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                              <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                                VERIFIED
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Error Message */}
                        {isError && details.expected_entity && (
                          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <div className="font-semibold text-red-900 dark:text-red-100">
                                  Wrong Entity Detected
                                </div>
                                <div className="text-red-700 dark:text-red-300 mt-1">
                                  Knowledge Graph returned "{details.name}" but expected "{details.expected_entity}"
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Warning Message */}
                        {isWarning && !isError && (
                          <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                Category mismatch: Entity is "{details.category}" but expected category context
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Entity Details */}
                        <div className="space-y-1 text-sm">
                          <div className={`flex justify-between ${
                            isError ? 'text-red-800 dark:text-red-200' :
                            isWarning ? 'text-yellow-800 dark:text-yellow-200' :
                            'text-gray-700 dark:text-gray-300'
                          }`}>
                            <span className="font-medium">Name:</span>
                            <span className={isError ? 'line-through' : ''}>
                              {details.name}
                            </span>
                          </div>

                          <div className={`flex justify-between ${
                            isError ? 'text-red-800 dark:text-red-200' :
                            isWarning ? 'text-yellow-800 dark:text-yellow-200' :
                            'text-gray-700 dark:text-gray-300'
                          }`}>
                            <span className="font-medium">Type:</span>
                            <span>{details.entity_type || 'Unknown'}</span>
                          </div>

                          <div className={`flex justify-between ${
                            isError ? 'text-red-800 dark:text-red-200' :
                            isWarning ? 'text-yellow-800 dark:text-yellow-200' :
                            'text-gray-700 dark:text-gray-300'
                          }`}>
                            <span className="font-medium">Category:</span>
                            <span className="flex items-center gap-1">
                              {details.category || 'Unknown'}
                              {(isError || isWarning) && (
                                <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                              )}
                            </span>
                          </div>

                          {details.description && (
                            <div className={`mt-2 pt-2 border-t ${
                              isError ? 'border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' :
                              isWarning ? 'border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300' :
                              'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                            } text-xs italic`}>
                              {details.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Cost
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                ${result.cost.toFixed(5)}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Time
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {(result.time_ms / 1000).toFixed(1)}s
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Tier Reached
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Tier {result.tier}
              </div>
            </div>
          </div>

          {/* Debug: Raw Result (collapsible) */}
          {/* Performance Metrics */}
          {result.sources?.performance_breakdown ? (
            <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <div className="font-semibold text-slate-900 dark:text-slate-200">
                  Performance Metrics
                </div>
              </div>

              {/* Total Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Time</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {result.sources.performance_breakdown.total_time_seconds}s
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    {result.sources.performance_breakdown.total_time_ms}ms
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Cost</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    ${result.sources.performance_breakdown.total_cost.toFixed(5)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Per validation
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Tiers Executed</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {result.sources.performance_breakdown.tiers.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Validation tiers
                  </div>
                </div>
              </div>

              {/* Per-Tier Breakdown */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Time & Cost per Tier:
                </div>

                {result.sources.performance_breakdown.tiers.map((tier: any, index: number) => {
                  // Color map for tiers
                  const colorMap: Record<string, string> = {
                    blue: 'bg-blue-500',
                    sky: 'bg-sky-500',
                    purple: 'bg-purple-500',
                    indigo: 'bg-indigo-500',
                    green: 'bg-green-500',
                    orange: 'bg-orange-500',
                    slate: 'bg-slate-500',
                  };
                  const barColor = colorMap[tier.color] || 'bg-gray-500';

                  return (
                    <div
                      key={index}
                      className="p-3 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <div className={`w-2 h-2 rounded-full ${barColor}`} />
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {tier.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {tier.time_seconds}s
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {tier.percentage}%
                            </div>
                          </div>

                          <div className="text-right min-w-[60px]">
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              ${tier.cost.toFixed(5)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              cost
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} transition-all`}
                          style={{ width: `${tier.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Insights */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  {(() => {
                    const slowestTier = result.sources.performance_breakdown.tiers.reduce(
                      (max: any, tier: any) => tier.time_ms > max.time_ms ? tier : max,
                      result.sources.performance_breakdown.tiers[0]
                    );

                    const mostExpensive = result.sources.performance_breakdown.tiers.reduce(
                      (max: any, tier: any) => tier.cost > max.cost ? tier : max,
                      result.sources.performance_breakdown.tiers[0]
                    );

                    return (
                      <>
                        <div className="font-semibold mb-1">Performance Insights:</div>
                        <div className="text-xs space-y-1">
                          <div>• Slowest tier: {slowestTier.name} ({slowestTier.time_seconds}s, {slowestTier.percentage}% of total)</div>
                          <div>• Most expensive: {mostExpensive.name} (${mostExpensive.cost.toFixed(5)})</div>
                          <div>
                            • Parallel execution saved ~
                            {Math.round(
                              result.sources.performance_breakdown.tiers.reduce((sum: number, t: any) => sum + t.time_ms, 0) -
                              result.sources.performance_breakdown.total_time_ms
                            )}ms
                            by running tiers concurrently
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (result.time_ms || result.cost) && (
            <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <div className="font-semibold text-slate-900 dark:text-slate-200">
                  Performance Metrics
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {result.time_ms && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-900/40 rounded-lg">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Time</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {(result.time_ms / 1000).toFixed(2)}s
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {result.time_ms}ms
                    </div>
                  </div>
                )}
                {result.cost && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-900/40 rounded-lg">
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Cost</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      ${result.cost.toFixed(4)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      Per validation
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(result, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `validation-${userResponse.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 p-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Export JSON</span>
            </button>
          </div>

          <details className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <summary className="p-3 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              🔍 Debug: View Raw Result
            </summary>
            <pre className="p-4 text-xs overflow-x-auto text-gray-800 dark:text-gray-200">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                hasPrevious
                  ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
              title="Previous answer (Left arrow key)"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Previous</span>
            </button>

            {currentIndex !== undefined && totalCount !== undefined && (
              <div className="text-sm text-gray-600 dark:text-gray-400 px-3">
                {currentIndex + 1} / {totalCount}
              </div>
            )}

            <button
              onClick={onNext}
              disabled={!hasNext}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                hasNext
                  ? 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
              title="Next answer (Right arrow key)"
            >
              <span className="text-sm font-medium">Next</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-base font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
