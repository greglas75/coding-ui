import { TrendingUp } from 'lucide-react';
import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';

interface ExportButtonProps {
  result: MultiSourceValidationResult;
  userResponse: string;
}

export function ExportButton({ result, userResponse }: ExportButtonProps) {
  const handleExport = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `validation-${userResponse.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleExport}
        className="flex-1 p-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <TrendingUp className="h-4 w-4" />
        <span className="font-medium">Export JSON</span>
      </button>
    </div>
  );
}

