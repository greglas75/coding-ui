/**
 * MECE Validation Warnings Component
 */
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { MECEIssue } from '@/types/codeframe';

interface MECEWarningsProps {
  issues: MECEIssue[];
}

export function MECEWarnings({ issues }: MECEWarningsProps) {
  if (issues.length === 0) return null;

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  return (
    <div className="space-y-3">
      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">
                MECE Errors ({errors.length})
              </h4>
              <ul className="space-y-2 text-sm text-red-800 dark:text-red-300">
                {errors.map((issue, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{issue.type === 'overlap' ? 'Overlap' : 'Gap'}:</span>{' '}
                    {issue.message}
                    {issue.details.similarity && (
                      <span className="ml-2 text-red-600 dark:text-red-400">
                        (similarity: {(issue.details.similarity * 100).toFixed(1)}%)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                MECE Warnings ({warnings.length})
              </h4>
              <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
                {warnings.map((issue, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{issue.type === 'overlap' ? 'Overlap' : 'Gap'}:</span>{' '}
                    {issue.message}
                    {issue.details.similarity && (
                      <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                        (similarity: {(issue.details.similarity * 100).toFixed(1)}%)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      {infos.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                Information ({infos.length})
              </h4>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                {infos.map((issue, idx) => (
                  <li key={idx}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
