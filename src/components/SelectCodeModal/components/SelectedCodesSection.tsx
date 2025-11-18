/**
 * Selected Codes Section Component
 */

import { RotateCcw } from 'lucide-react';

interface SelectedCodesSectionProps {
  selectedCodes: string[];
  isResetting: boolean;
  onToggleCode: (codeName: string) => void;
  onResetCodes: () => void;
}

export function SelectedCodesSection({
  selectedCodes,
  isResetting,
  onToggleCode,
  onResetCodes,
}: SelectedCodesSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Codes</h3>
        {selectedCodes.length > 0 && (
          <button
            onClick={onResetCodes}
            className={`text-orange-500 hover:text-orange-600 transition-all flex items-center gap-1 text-sm ${
              isResetting ? 'animate-pulse' : ''
            }`}
            title="Reset selected codes"
          >
            <RotateCcw size={16} className={isResetting ? 'animate-spin' : ''} />
            Reset
          </button>
        )}
      </div>
      <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/10 min-h-[80px]">
        {selectedCodes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedCodes.map(code => (
              <span
                key={code}
                className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded-full text-sm flex items-center gap-1"
              >
                {code}
                <button
                  onClick={() => onToggleCode(code)}
                  className="text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="italic text-sm text-gray-400">No codes selected yet</p>
        )}
      </div>
    </div>
  );
}

