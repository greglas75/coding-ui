import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';
import type { TypeBadge, ActionBadge } from '../types';

interface ValidationSummaryProps {
  result: MultiSourceValidationResult;
  badge: TypeBadge;
  action: ActionBadge;
}

export function ValidationSummary({ result, badge, action }: ValidationSummaryProps) {
  return (
    <>
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
    </>
  );
}

