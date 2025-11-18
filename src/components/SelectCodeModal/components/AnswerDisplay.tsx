/**
 * Answer Display Component (Original + Translation)
 */

interface AnswerDisplayProps {
  answer?: string;
  translation?: string;
}

export function AnswerDisplay({ answer, translation }: AnswerDisplayProps) {
  if (!answer && !translation) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left: Original Answer */}
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Answer</h3>
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10 flex-1">
          <p className="text-sm text-gray-900 dark:text-gray-100" dir="auto">
            {answer || '—'}
          </p>
        </div>
      </div>

      {/* Right: Translation */}
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Translation
        </h3>
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10 flex-1">
          <p className="text-sm text-gray-900 dark:text-gray-100">{translation || '—'}</p>
        </div>
      </div>
    </div>
  );
}

