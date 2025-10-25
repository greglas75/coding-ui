/**
 * Step 4: Review & Edit Codebook Tree
 */
import { useState } from 'react';
import { useTreeEditor } from '@/hooks/useTreeEditor';
import { CodeframeTree } from '../TreeEditor/CodeframeTree';
import { MECEWarnings } from '../TreeEditor/MECEWarnings';
import { Save, ArrowLeft } from 'lucide-react';

interface Step4TreeEditorProps {
  generation: { generation_id: string; mece_score: number; n_themes: number; n_codes: number } | null;
  onSave: () => void;
  onBack: () => void;
}

export function Step4TreeEditor({ generation, onSave, onBack }: Step4TreeEditorProps) {
  const {
    hierarchy,
    meceIssues,
    isLoading,
    renameNode,
    mergeNodes,
    deleteNode,
    selectedNodes,
    setSelectedNodes,
  } = useTreeEditor(generation?.generation_id || null);

  if (isLoading) {
    return <div className="text-center py-12">Loading hierarchy...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review & Edit Codebook</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {generation?.n_themes} themes " {generation?.n_codes} codes
          </p>
        </div>

        {/* MECE Score */}
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">MECE Score</p>
          <p className={`text-3xl font-bold ${
            (generation?.mece_score || 0) >= 80 ? 'text-green-600' :
            (generation?.mece_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {generation?.mece_score || 0}/100
          </p>
        </div>
      </div>

      {/* MECE Warnings */}
      {meceIssues.length > 0 && <MECEWarnings issues={meceIssues} />}

      {/* Tree */}
      <div className="border rounded-lg bg-white dark:bg-gray-800 p-6">
        <CodeframeTree
          data={hierarchy}
          selectedNodes={selectedNodes}
          onSelect={setSelectedNodes}
          onRename={renameNode}
          onDelete={deleteNode}
        />
      </div>

      {/* Selected Actions */}
      {selectedNodes.length > 1 && (
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

      {/* Footer */}
      <div className="flex justify-between pt-6 border-t dark:border-gray-700">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <button
          onClick={onSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Apply to Answers
        </button>
      </div>
    </div>
  );
}
