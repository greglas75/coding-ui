/**
 * Step 5: Apply codebook to answers
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Step5ApplyProps {
  generation: { generation_id: string } | null;
  onComplete: () => void;
}

export function Step5Apply({ generation, onComplete }: Step5ApplyProps) {
  const [threshold, setThreshold] = useState(0.9);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_BASE}/api/v1/codeframe/${generation?.generation_id}/apply`,
        {
          auto_confirm_threshold: threshold,
          overwrite_existing: false,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      alert(`Applied ${data.assigned} codes, ${data.pending} need manual review`);
      onComplete();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Apply Codebook</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Automatically assign codes to uncategorized answers
        </p>
      </div>

      {/* Threshold Slider */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
          Auto-confirm Threshold: {threshold.toFixed(2)}
        </label>
        <input
          type="range"
          min="0.5"
          max="1"
          step="0.05"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Codes with similarity e {threshold.toFixed(2)} will be automatically applied.
          Lower values assign more codes automatically but may reduce accuracy.
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h3 className="font-medium text-green-900 dark:text-green-200">Auto-assigned</h3>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300">
            Answers with confidence e {threshold.toFixed(2)} will be automatically categorized
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-medium text-blue-900 dark:text-blue-200">Manual Review</h3>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Answers below threshold will be marked for manual categorization
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">
              Note
            </h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              This will not overwrite existing categorizations. Only uncategorized answers will be processed.
            </p>
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={() => applyMutation.mutate()}
        disabled={applyMutation.isPending}
        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
      >
        {applyMutation.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Applying Codes...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Apply to All Answers
          </>
        )}
      </button>

      {/* Error Display */}
      {applyMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">
            {(applyMutation.error as Error)?.message || 'Failed to apply codes'}
          </p>
        </div>
      )}
    </div>
  );
}
