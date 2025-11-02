/**
 * Step 4: Review & Edit Codebook Tree
 */
import { useState, useEffect } from 'react';
import { useTreeEditor } from '@/hooks/useTreeEditor';
import { CodeframeTree } from '../TreeEditor/CodeframeTree';
import { BrandCodeframeReview } from '../BrandCodeframeReview';
import { MECEWarnings } from '../TreeEditor/MECEWarnings';
import { Save, ArrowLeft, Download, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { CodingType, BrandCodeframeData } from '@/types/codeframe';

interface Step4TreeEditorProps {
  generation: { generation_id: string; mece_score: number; n_themes: number; n_codes: number } | null;
  codingType?: CodingType;
  brandCodeframeData?: BrandCodeframeData | null; // Brand codeframe data passed directly
  onSave: () => void;
  onBack: () => void;
}

export function Step4TreeEditor({ generation, codingType, brandCodeframeData, onSave, onBack }: Step4TreeEditorProps) {
  const isBrandCoding = codingType === 'brand';

  // Only use useTreeEditor for non-brand codeframes
  const treeEditorData = useTreeEditor(!isBrandCoding ? (generation?.generation_id || null) : null);

  const {
    hierarchy,
    meceIssues,
    isLoading,
    renameNode,
    mergeNodes,
    deleteNode,
    selectedNodes,
    setSelectedNodes,
  } = treeEditorData;

  const [isSaving, setIsSaving] = useState(false);

  // Local state for brand codeframe data (for client-side manipulation)
  const [localBrandData, setLocalBrandData] = useState(brandCodeframeData);

  // Sync local data when brandCodeframeData changes
  useEffect(() => {
    if (brandCodeframeData) {
      setLocalBrandData(brandCodeframeData);
    }
  }, [brandCodeframeData]);

  const handleSaveProgress = () => {
    setIsSaving(true);
    // Hierarchy is already saved in real-time by useTreeEditor
    toast.success('Progress saved! You can return to edit this codeframe later.', {
      duration: 4000,
    });
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(hierarchy, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `codeframe-${generation?.generation_id}-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success('Codeframe exported as JSON');
  };

  // Handlers for brand actions (client-side state manipulation)
  const handleApproveBrands = (brandIds: string[]) => {
    if (!localBrandData) return;

    const brandIdSet = new Set(brandIds);

    // Move brands from needs_review or spam_invalid to verified_brands
    const brandsFromReview = localBrandData.needs_review?.filter(b => brandIdSet.has(b.id)) || [];
    const brandsFromSpam = localBrandData.spam_invalid?.filter(b => brandIdSet.has(b.id)) || [];

    const brandsToApprove = [...brandsFromReview, ...brandsFromSpam];

    setLocalBrandData({
      ...localBrandData,
      verified_brands: [...(localBrandData.verified_brands || []), ...brandsToApprove],
      needs_review: localBrandData.needs_review?.filter(b => !brandIdSet.has(b.id)) || [],
      spam_invalid: localBrandData.spam_invalid?.filter(b => !brandIdSet.has(b.id)) || [],
    });

    toast.success(`Moved ${brandIds.length} brand(s) to Verified`);
  };

  const handleRejectBrands = (brandIds: string[]) => {
    if (!localBrandData) return;

    const brandIdSet = new Set(brandIds);

    // Remove brands from all groups (delete them)
    setLocalBrandData({
      ...localBrandData,
      verified_brands: localBrandData.verified_brands?.filter(b => !brandIdSet.has(b.id)) || [],
      needs_review: localBrandData.needs_review?.filter(b => !brandIdSet.has(b.id)) || [],
      spam_invalid: localBrandData.spam_invalid?.filter(b => !brandIdSet.has(b.id)) || [],
    });

    toast.success(`Deleted ${brandIds.length} brand(s)`);
  };

  const handleMoveBrandsToReview = (brandIds: string[]) => {
    if (!localBrandData) return;

    const brandIdSet = new Set(brandIds);

    // Move brands from spam_invalid to needs_review
    const brandsToMove = localBrandData.spam_invalid?.filter(b => brandIdSet.has(b.id)) || [];

    setLocalBrandData({
      ...localBrandData,
      needs_review: [...(localBrandData.needs_review || []), ...brandsToMove],
      spam_invalid: localBrandData.spam_invalid?.filter(b => !brandIdSet.has(b.id)) || [],
    });

    toast.success(`Moved ${brandIds.length} brand(s) to Review`);
  };

  // Use localBrandData for brands (includes any user edits), otherwise check loading state
  const effectiveLoading = isBrandCoding ? !localBrandData : isLoading;

  if (effectiveLoading) {
    return <div className="text-center py-12">Loading {isBrandCoding ? 'brands' : 'hierarchy'}...</div>;
  }

  // For brand codeframes, use the local data (includes user edits)
  const verifiedBrands = isBrandCoding ? (localBrandData?.verified_brands || []) : [];
  const needsReview = isBrandCoding ? (localBrandData?.needs_review || []) : [];
  const spamInvalid = isBrandCoding ? (localBrandData?.spam_invalid || []) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isBrandCoding ? 'Review Brand Codes' : 'Review & Edit Codebook'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isBrandCoding
              ? `${verifiedBrands.length + needsReview.length + spamInvalid.length} unique brands found`
              : `${generation?.n_themes} themes • ${generation?.n_codes} codes`
            }
          </p>
        </div>

        {/* MECE Score */}
        {!isBrandCoding && (
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">MECE Score</p>
            <p className={`text-3xl font-bold ${
              (generation?.mece_score || 0) >= 80 ? 'text-green-600' :
              (generation?.mece_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {generation?.mece_score || 0}/100
            </p>
          </div>
        )}
      </div>

      {/* MECE Warnings (only for non-brand) */}
      {!isBrandCoding && meceIssues.length > 0 && <MECEWarnings issues={meceIssues} />}

      {/* Content - Brand Review OR Tree */}
      <div className="border rounded-lg bg-white dark:bg-gray-800 p-6">
        {isBrandCoding ? (
          <BrandCodeframeReview
            verifiedBrands={verifiedBrands}
            needsReview={needsReview}
            spamInvalid={spamInvalid}
            onApprove={handleApproveBrands}
            onReject={handleRejectBrands}
            onMoveToReview={handleMoveBrandsToReview}
          />
        ) : (
          <CodeframeTree
            data={hierarchy}
            selectedNodes={selectedNodes}
            onSelect={setSelectedNodes}
            onRename={renameNode}
            onDelete={deleteNode}
          />
        )}
      </div>

      {/* Selected Actions (only for non-brand tree editing) */}
      {!isBrandCoding && selectedNodes.length > 1 && (
        <div className="flex gap-2 items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <span className="text-sm text-blue-900 dark:text-blue-200">
            {selectedNodes.length} nodes selected
          </span>
          <button
            onClick={() => {
              const name = prompt('Enter merged node name:');
              if (name) mergeNodes(selectedNodes, name);
            }}
            className="ml-auto px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Merge Selected
          </button>
        </div>
      )}

      {/* Footer - Sticky at bottom */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex justify-between items-center pt-6 pb-4 border-t dark:border-gray-700 shadow-lg z-10">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex gap-3">
          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2"
            title="Export codeframe as JSON file"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>

          {/* Save Progress */}
          <button
            onClick={handleSaveProgress}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50"
            title="Save your progress and continue later"
          >
            {isSaving ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saved!' : 'Save Progress'}
          </button>

          {/* Apply to Answers */}
          <button
            onClick={onSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
            title="Apply codes to all answers and finish"
          >
            <CheckCircle className="h-4 w-4" />
            Apply to Answers
          </button>
        </div>
      </div>
    </div>
  );
}
