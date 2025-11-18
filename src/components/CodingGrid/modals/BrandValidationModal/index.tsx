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

import { type FC } from 'react';
import { useModalNavigation } from './hooks/useModalNavigation';
import { getTypeBadge, getActionBadge } from './utils/badgeHelpers';
import { ModalHeader } from './components/ModalHeader';
import { UserResponseSection } from './components/UserResponseSection';
import { ValidationSummary } from './components/ValidationSummary';
import { ConfidenceBreakdown } from './components/ConfidenceBreakdown';
import { DecisionTree } from './components/DecisionTree';
import { IssuesWarnings } from './components/IssuesWarnings';
import { AdditionalInfo } from './components/AdditionalInfo';
import { SourcesBreakdown } from './components/SourcesBreakdown';
import { Tier2VisionAI } from './components/Tier2VisionAI';
import { ImageGallery } from './components/ImageGallery';
import { PerformanceMetrics } from './components/PerformanceMetrics';
import { ExportButton } from './components/ExportButton';
import { ModalFooter } from './components/ModalFooter';
import type { BrandValidationModalProps } from './types';

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
  // Handle keyboard navigation and auto-scroll
  useModalNavigation({
    isOpen,
    onClose,
    onPrevious,
    onNext,
    hasPrevious,
    hasNext,
  });

  if (!isOpen) return null;

  // Get badges
  const badge = getTypeBadge(result);
  const action = getActionBadge(result);

  // Higher z-index than other modals to ensure it's always on top
  const MODAL_Z_INDEX = 100;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: MODAL_Z_INDEX }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 flex flex-col max-w-6xl w-full max-h-[90vh]">
        {/* Header */}
        <ModalHeader
          categoryName={categoryName}
          onClose={onClose}
          onPrevious={onPrevious}
          onNext={onNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          currentIndex={currentIndex}
          totalCount={totalCount}
        />

        {/* Content */}
        <div className="brand-validation-modal-content flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Response */}
          <UserResponseSection userResponse={userResponse} translation={translation} />

          {/* Validation Summary */}
          <ValidationSummary result={result} badge={badge} action={action} />

          {/* Confidence Breakdown */}
          <ConfidenceBreakdown result={result} />

          {/* Decision Tree */}
          <DecisionTree result={result} />

          {/* Issues & Warnings */}
          <IssuesWarnings result={result} />

          {/* Additional Info (Matched Brand, Category Error, Candidates) */}
          <AdditionalInfo result={result} />

          {/* Sources Breakdown */}
          <SourcesBreakdown result={result} userResponse={userResponse} categoryName={categoryName} />

          {/* Tier 2: Vision AI (Detailed) */}
          <Tier2VisionAI result={result} userResponse={userResponse} categoryName={categoryName} />

          {/* Image Gallery */}
          <ImageGallery result={result} userResponse={userResponse} categoryName={categoryName} />

          {/* Performance Metrics */}
          <PerformanceMetrics result={result} />

          {/* Export Button */}
          <ExportButton result={result} userResponse={userResponse} />

          {/* Debug: View Raw Result */}
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
        <ModalFooter
          onPrevious={onPrevious}
          onNext={onNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          currentIndex={currentIndex}
          totalCount={totalCount}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

