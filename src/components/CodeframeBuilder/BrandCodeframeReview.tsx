/**
 * Brand Codeframe Review - 3-Group Manual Review Interface
 *
 * Displays brands categorized into:
 * 1. Verified Brands (high confidence + Google verified)
 * 2. Needs Review (medium confidence or not verified)
 * 3. Spam/Invalid (low confidence or gibberish)
 */
import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Check,
  Trash2,
  Info
} from 'lucide-react';
import { BrandInsightsModal } from './modals/BrandInsightsModal';
import type { HierarchyNode } from '@/types/codeframe';

interface BrandGroup {
  title: string;
  description: string;
  brands: HierarchyNode[];
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface BrandCodeframeReviewProps {
  verifiedBrands: HierarchyNode[];
  needsReview: HierarchyNode[];
  spamInvalid: HierarchyNode[];
  onApprove: (brandIds: string[]) => void;
  onReject: (brandIds: string[]) => void;
  onMoveToReview: (brandIds: string[]) => void;
}

export function BrandCodeframeReview({
  verifiedBrands,
  needsReview,
  spamInvalid,
  onApprove,
  onReject,
  onMoveToReview,
}: BrandCodeframeReviewProps) {
  // Collapse state for each group
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({
    verified: true,
    review: true,
    spam: false,
  });

  // Selection state
  const [selectedVerified, setSelectedVerified] = useState<Set<string>>(new Set());
  const [selectedReview, setSelectedReview] = useState<Set<string>>(new Set());
  const [selectedSpam, setSelectedSpam] = useState<Set<string>>(new Set());

  // Modal state
  const [insightsNode, setInsightsNode] = useState<HierarchyNode | null>(null);

  const groups: BrandGroup[] = [
    {
      title: 'Verified Brands',
      description: 'High confidence + Google verified. Ready to approve.',
      brands: verifiedBrands,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-300 dark:border-green-700',
    },
    {
      title: 'Needs Review',
      description: 'Medium confidence or not verified. Please review manually.',
      brands: needsReview,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-300 dark:border-yellow-700',
    },
    {
      title: 'Spam/Invalid',
      description: 'Low confidence or gibberish. Likely spam.',
      brands: spamInvalid,
      icon: <XCircle className="h-5 w-5" />,
      color: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-300 dark:border-red-700',
    },
  ];

  const getSelection = (groupIndex: number) => {
    switch (groupIndex) {
      case 0: return selectedVerified;
      case 1: return selectedReview;
      case 2: return selectedSpam;
      default: return new Set<string>();
    }
  };

  const setSelection = (groupIndex: number, selection: Set<string>) => {
    switch (groupIndex) {
      case 0: setSelectedVerified(selection); break;
      case 1: setSelectedReview(selection); break;
      case 2: setSelectedSpam(selection); break;
    }
  };

  const toggleBrandSelection = (groupIndex: number, brandId: string) => {
    const selection = getSelection(groupIndex);
    const newSelection = new Set(selection);
    if (newSelection.has(brandId)) {
      newSelection.delete(brandId);
    } else {
      newSelection.add(brandId);
    }
    setSelection(groupIndex, newSelection);
  };

  const toggleSelectAll = (groupIndex: number) => {
    const group = groups[groupIndex];
    const selection = getSelection(groupIndex);

    if (selection.size === group.brands.length) {
      // Deselect all
      setSelection(groupIndex, new Set());
    } else {
      // Select all
      setSelection(groupIndex, new Set(group.brands.map(b => b.id)));
    }
  };

  const toggleGroupExpanded = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-gray-900 dark:text-white">Verified</span>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {verifiedBrands.length}
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <span className="font-medium text-gray-900 dark:text-white">Review</span>
          </div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {needsReview.length}
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="font-medium text-gray-900 dark:text-white">Spam</span>
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {spamInvalid.length}
          </div>
        </div>
      </div>

      {/* 3 Groups */}
      {groups.map((group, groupIndex) => {
        const groupKey = ['verified', 'review', 'spam'][groupIndex];
        const isExpanded = expandedGroups[groupKey];
        const selection = getSelection(groupIndex);
        const allSelected = selection.size === group.brands.length && group.brands.length > 0;

        return (
          <div key={groupKey} className={`border rounded-lg ${group.borderColor}`}>
            {/* Group Header */}
            <div className={`${group.bgColor} p-4 flex items-center justify-between cursor-pointer`}
                 onClick={() => toggleGroupExpanded(groupKey)}>
              <div className="flex items-center gap-3">
                <div className={group.color}>
                  {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
                <div className={group.color}>{group.icon}</div>
                <div>
                  <h3 className={`font-semibold ${group.color}`}>
                    {group.title} ({group.brands.length})
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{group.description}</p>
                </div>
              </div>

              {/* Bulk Actions */}
              {group.brands.length > 0 && (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => toggleSelectAll(groupIndex)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Select All</span>
                  </label>

                  {selection.size > 0 && (
                    <div className="flex gap-2 ml-4">
                      {groupIndex !== 0 && (
                        <button
                          onClick={() => {
                            onApprove(Array.from(selection));
                            setSelection(groupIndex, new Set());
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve ({selection.size})
                        </button>
                      )}

                      {groupIndex === 2 && (
                        <button
                          onClick={() => {
                            onMoveToReview(Array.from(selection));
                            setSelection(groupIndex, new Set());
                          }}
                          className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                        >
                          Move to Review
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onReject(Array.from(selection));
                          setSelection(groupIndex, new Set());
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete ({selection.size})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Group Content */}
            {isExpanded && (
              <div className="p-4 bg-white dark:bg-gray-800">
                {group.brands.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No brands in this category
                  </div>
                ) : (
                  <div className="space-y-2">
                    {group.brands.map(brand => (
                      <div
                        key={brand.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          selection.has(brand.id)
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selection.has(brand.id)}
                          onChange={() => toggleBrandSelection(groupIndex, brand.id)}
                          className="rounded"
                        />

                        {/* Brand Info */}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {brand.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {brand.mention_count || 0} mentions
                            {brand.confidence && (
                              <span className="ml-2">
                                • Confidence: {brand.confidence}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* View Details */}
                        <button
                          onClick={() => setInsightsNode(brand)}
                          className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded flex items-center gap-1"
                        >
                          <Info className="h-3.5 w-3.5" />
                          Details
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* AI Insights Modal */}
      {insightsNode && (
        <BrandInsightsModal
          node={insightsNode}
          onClose={() => setInsightsNode(null)}
        />
      )}
    </div>
  );
}
