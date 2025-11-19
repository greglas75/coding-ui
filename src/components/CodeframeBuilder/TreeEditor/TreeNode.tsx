/**
 * Individual Tree Node Component
 * Redesigned for better UX: larger buttons, expanded details, bulk selection
 */
import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Check,
  X,
  Info,
  CheckCircle2,
  AlertCircle,
  Image,
  Search,
  Database,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { HierarchyNode } from '@/types/codeframe';
import { StatBadge } from './StatBadge';

interface TreeNodeProps {
  node: HierarchyNode;
  isSelected: boolean;
  isExpanded?: boolean;
  isCheckboxSelected?: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onViewDetails?: () => void;
  onCheckboxToggle?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  depth: number;
}

export function TreeNode({
  node,
  isSelected,
  isExpanded: isExpandedProp,
  isCheckboxSelected = false,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  onViewDetails,
  onCheckboxToggle,
  onApprove,
  onReject,
  depth,
}: TreeNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpandedLocal, setIsExpandedLocal] = useState(false);

  // Use controlled expansion if provided, otherwise local state
  const isExpanded = isExpandedProp !== undefined ? isExpandedProp : isExpandedLocal;
  const toggleExpanded = () => {
    if (isExpandedProp === undefined) {
      setIsExpandedLocal(!isExpandedLocal);
    }
  };

  const hasChildren = node.children && node.children.length > 0;

  const handleRename = () => {
    if (editValue.trim() && editValue !== node.name) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(node.name);
    setIsEditing(false);
  };

  // Color based on node type
  const getNodeColor = () => {
    switch (node.node_type) {
      case 'theme':
        return 'text-blue-700 dark:text-blue-400';
      case 'code':
        return 'text-green-700 dark:text-green-400';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  // Badge for confidence
  const ConfidenceBadge = () => {
    if (!node.confidence) return null;

    const colors = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };

    return (
      <span className={`text-xs px-2 py-0.5 rounded ${colors[node.confidence]}`}>
        {node.confidence}
      </span>
    );
  };

  // Parse validation evidence for stats
  const getValidationStats = () => {
    if (!node.validation_evidence) return null;

    try {
      const evidence = typeof node.validation_evidence === 'string'
        ? JSON.parse(node.validation_evidence)
        : node.validation_evidence;

      // Support both old and new format
      const imageCount = evidence.image_search_count || evidence.vision_analysis?.total_products || evidence.image_urls?.length || 0;
      const searchCount = evidence.text_search_count || evidence.search_validation?.relevant_results || evidence.search_results?.length || 0;
      const hasKnowledgeGraph = evidence.knowledge_graph && Object.keys(evidence.knowledge_graph).length > 0;
      const aiVisionCount = evidence.vision_analysis?.products_identified || evidence.vision_analysis?.total_products || 0;

      return {
        imageCount,
        searchCount,
        hasKnowledgeGraph,
        aiVisionCount,
        isVerified: searchCount > 0 || imageCount > 0,
      };
    } catch (e) {
      console.error('Failed to parse validation_evidence:', e);
      return null;
    }
  };

  const stats = getValidationStats();

  return (
    <div
      className={`group ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer`}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onClick={onSelect}
      >
        {/* Checkbox for bulk selection (only for codes) */}
        {node.node_type === 'code' && onCheckboxToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCheckboxToggle();
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title={isCheckboxSelected ? "Deselect" : "Select for bulk action"}
          >
            {isCheckboxSelected ? (
              <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Square className="h-5 w-5 text-gray-400" />
            )}
          </button>
        )}

        {/* Toggle Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle();
          }}
          className={`p-0.5 ${hasChildren ? 'visible' : 'invisible'}`}
        >
          {hasChildren && (
            <ChevronRight className={`h-5 w-5 transition-transform ${hasChildren ? '' : 'opacity-0'}`} />
          )}
        </button>

        {/* Node Type Icon */}
        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
          node.node_type === 'theme' ? 'bg-blue-500' :
          node.node_type === 'code' ? 'bg-green-500' :
          'bg-gray-400'
        }`} />

        {/* Label or Edit Input */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') handleCancel();
              }}
              className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            <button
              onClick={handleRename}
              className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <span className={`flex-1 font-medium ${getNodeColor()}`}>
              {node.name}
            </span>

            {/* Confidence Badge */}
            <ConfidenceBadge />

            {/* Stats - Show if not expanded */}
            {!isExpanded && stats && (
              <div className="flex items-center gap-2">
                {stats.aiVisionCount > 0 && (
                  <StatBadge
                    icon={Image}
                    label="AI Vision"
                    value={stats.aiVisionCount}
                    detail={`${stats.aiVisionCount} products identified by AI`}
                    color="purple"
                  />
                )}
                {stats.imageCount > 0 && (
                  <StatBadge
                    icon={Image}
                    label="Images"
                    value={stats.imageCount}
                    detail={`${stats.imageCount} images analyzed`}
                    color="blue"
                  />
                )}
                {stats.searchCount > 0 && (
                  <StatBadge
                    icon={Search}
                    label="Web"
                    value={stats.searchCount}
                    detail={`${stats.searchCount} web search results`}
                    color="indigo"
                  />
                )}
              </div>
            )}

            {/* Cluster Size */}
            {node.cluster_size && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({node.cluster_size})
              </span>
            )}

            {/* Expand/Collapse Details Button */}
            {node.node_type === 'code' && stats && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded();
                }}
                className="
                  inline-flex items-center gap-1.5
                  px-3 py-2 min-h-[44px] min-w-[100px]
                  bg-gray-100 hover:bg-gray-200
                  dark:bg-gray-700 dark:hover:bg-gray-600
                  text-gray-700 dark:text-gray-200
                  rounded-lg font-medium text-sm
                  transition-all duration-200
                "
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-5 w-5" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-5 w-5" />
                    Details
                  </>
                )}
              </button>
            )}

            {/* Actions - Larger buttons (min 44x44px) */}
            {(isHovered || isSelected) && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {/* View Details (Info) */}
                {node.node_type === 'code' && onViewDetails && (
                  <button
                    onClick={onViewDetails}
                    className="
                      p-2.5 min-h-[44px] min-w-[44px]
                      hover:bg-blue-100 dark:hover:bg-blue-900/30
                      text-blue-600 dark:text-blue-400
                      rounded-lg
                      transition-all duration-200
                      hover:shadow-md
                    "
                    title="View full validation details"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                )}

                {/* Approve - Primary action */}
                {node.node_type === 'code' && onApprove && (
                  <button
                    onClick={onApprove}
                    className="
                      inline-flex items-center gap-2
                      px-4 py-2.5 min-h-[44px]
                      bg-green-600 hover:bg-green-700
                      text-white font-semibold text-sm
                      rounded-lg
                      transition-all duration-200
                      hover:shadow-lg hover:-translate-y-0.5
                    "
                    title="Approve this code"
                  >
                    <Check className="h-5 w-5" />
                    Approve
                  </button>
                )}

                {/* Reject - Secondary action */}
                {node.node_type === 'code' && onReject && (
                  <button
                    onClick={onReject}
                    className="
                      inline-flex items-center gap-2
                      px-4 py-2.5 min-h-[44px]
                      bg-white hover:bg-red-50
                      border-2 border-red-600 hover:bg-red-600
                      text-red-600 hover:text-white
                      font-semibold text-sm
                      rounded-lg
                      transition-all duration-200
                      hover:shadow-lg hover:-translate-y-0.5
                    "
                    title="Reject this code"
                  >
                    <X className="h-5 w-5" />
                    Reject
                  </button>
                )}

                {/* Edit */}
                <button
                  onClick={() => setIsEditing(true)}
                  className="
                    p-2.5 min-h-[44px] min-w-[44px]
                    hover:bg-gray-200 dark:hover:bg-gray-600
                    text-gray-600 dark:text-gray-400
                    rounded-lg
                    transition-all duration-200
                  "
                  title="Rename"
                >
                  <Edit2 className="h-5 w-5" />
                </button>

                {/* Delete */}
                <button
                  onClick={onDelete}
                  className="
                    p-2.5 min-h-[44px] min-w-[44px]
                    hover:bg-red-100 dark:hover:bg-red-900/30
                    text-red-600 dark:text-red-400
                    rounded-lg
                    transition-all duration-200
                  "
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Description */}
      {node.description && !isEditing && (
        <div
          className="text-xs text-gray-500 dark:text-gray-400 ml-2 mt-1 italic"
          style={{ paddingLeft: `${depth * 24 + 32}px` }}
        >
          {node.description}
        </div>
      )}

      {/* Brand Variants */}
      {node.variants && !isEditing && (() => {
        try {
          const variants = typeof node.variants === 'string'
            ? JSON.parse(node.variants)
            : node.variants;
          if (variants && Object.keys(variants).length > 1) {
            return (
              <div
                className="text-xs ml-2 mt-1"
                style={{ paddingLeft: `${depth * 24 + 32}px` }}
              >
                <div className="text-gray-600 dark:text-gray-400 font-medium mb-1">
                  Other Forms Found:
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(variants)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([variant, count]) => (
                      <span
                        key={variant}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                      >
                        {variant} ({count})
                      </span>
                    ))}
                </div>
              </div>
            );
          }
        } catch (e) {
          console.error('Failed to parse variants:', e);
        }
        return null;
      })()}

      {/* Example Texts */}
      {node.example_texts && !isEditing && (() => {
        try {
          const examples = typeof node.example_texts === 'string'
            ? JSON.parse(node.example_texts)
            : node.example_texts;
          if (examples && Array.isArray(examples) && examples.length > 0) {
            return (
              <div
                className="text-xs text-gray-400 dark:text-gray-500 ml-2 mt-1"
                style={{ paddingLeft: `${depth * 24 + 32}px` }}
              >
                Examples: {examples.slice(0, 2).map((ex: string | { text: string }) => typeof ex === 'string' ? `"${ex}"` : `"${ex.text}"`).join(', ')}
              </div>
            );
          }
        } catch (e) {
          console.error('Failed to parse example_texts:', e);
        }
        return null;
      })()}

      {/* Expanded Details View */}
      {isExpanded && node.node_type === 'code' && stats && (() => {
        try {
          const evidence = typeof node.validation_evidence === 'string'
            ? JSON.parse(node.validation_evidence)
            : node.validation_evidence;

          if (!evidence) return null;

          // Extract data from both old and new formats
          const visionAnalysis = evidence.vision_analysis || {};
          const searchValidation = evidence.search_validation || {};
          const imageValidation = evidence.image_validation || {};
          const knowledgeGraph = evidence.knowledge_graph || {};

          // AI Vision metrics
          const aiVisionCount = visionAnalysis.total_products || visionAnalysis.products_identified || 0;
          const aiVisionConfidence = visionAnalysis.confidence || visionAnalysis.average_confidence || 0;
          const aiVisionDetails = visionAnalysis.product_details || [];

          // Image validation metrics
          const imageMatchScore = imageValidation.match_score || imageValidation.visual_similarity || 0;
          const imageCount = evidence.image_search_count || evidence.image_urls?.length || 0;

          // Search validation metrics
          const searchCount = evidence.text_search_count || searchValidation.relevant_results || evidence.search_results?.length || 0;
          const topSources = searchValidation.top_sources || [];
          const searchTerms = searchValidation.search_terms || [];

          // Overall confidence
          const overallConfidence = evidence.overall_confidence || evidence.confidence || node.confidence || 0;

          return (
            <div
              className="mt-3 mx-2 p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10"
              style={{ marginLeft: `${depth * 24 + 32}px` }}
            >
              <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <Database className="h-5 w-5" />
                Validation Evidence Breakdown
              </div>

              <div className="space-y-4">
                {/* AI Vision Analysis Section */}
                {aiVisionCount > 0 && (
                  <div className="border-l-4 border-purple-400 pl-3">
                    <div className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-1 flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      AI Vision Analysis
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                      <div>• {aiVisionCount} products identified by AI vision</div>
                      {aiVisionConfidence > 0 && (
                        <div>• Confidence: {Math.round(aiVisionConfidence * 100)}%</div>
                      )}
                      {aiVisionDetails.length > 0 && (
                        <div>• Details: {aiVisionDetails.slice(0, 2).map((d: { brand?: string; name?: string }) => d.brand || d.name).filter(Boolean).join(', ')}</div>
                      )}
                      {visionAnalysis.distinctive_features && (
                        <div className="text-gray-600 dark:text-gray-400 italic">
                          • Features: {visionAnalysis.distinctive_features}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Image Validation Section */}
                {imageCount > 0 && (
                  <div className="border-l-4 border-blue-400 pl-3">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1 flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Image Validation
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                      {imageMatchScore > 0 && (
                        <div>• Match Score: {Math.round(imageMatchScore * 100)}%</div>
                      )}
                      <div>• {imageCount} images analyzed</div>
                      {imageValidation.visual_similarity_level && (
                        <div>• Visual Similarity: {imageValidation.visual_similarity_level}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Web Search Section */}
                {searchCount > 0 && (
                  <div className="border-l-4 border-indigo-400 pl-3">
                    <div className="text-sm font-medium text-indigo-900 dark:text-indigo-200 mb-1 flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Web Search Validation
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                      <div>• {searchCount} relevant search results found</div>
                      {topSources.length > 0 && (
                        <div>• Top sources: {topSources.slice(0, 3).join(', ')}</div>
                      )}
                      {searchTerms.length > 0 && (
                        <div className="text-gray-600 dark:text-gray-400 italic">
                          • Search terms: {searchTerms.slice(0, 2).map((t: string) => `"${t}"`).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Knowledge Graph Section */}
                {knowledgeGraph && Object.keys(knowledgeGraph).length > 0 && (
                  <div className="border-l-4 border-green-400 pl-3">
                    <div className="text-sm font-medium text-green-900 dark:text-green-200 mb-1 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Knowledge Graph
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                      {knowledgeGraph.verified && <div>• Brand verified in knowledge database</div>}
                      {knowledgeGraph.entity_type && (
                        <div>• Type: {knowledgeGraph.entity_type}</div>
                      )}
                      {knowledgeGraph.category && (
                        <div>• Category: {knowledgeGraph.category}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Overall Confidence Score */}
                <div className="pt-3 border-t border-blue-300 dark:border-blue-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Overall Confidence:
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            overallConfidence >= 80 ? 'bg-green-500' :
                            overallConfidence >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${overallConfidence}%` }}
                        />
                      </div>
                      <span className={`text-lg font-bold ${
                        overallConfidence >= 80 ? 'text-green-600 dark:text-green-400' :
                        overallConfidence >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {overallConfidence}/100
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        } catch (e) {
          console.error('Failed to parse validation details:', e);
          return null;
        }
      })()}
    </div>
  );
}
