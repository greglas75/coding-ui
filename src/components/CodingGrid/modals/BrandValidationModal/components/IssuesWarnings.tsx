import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';

interface IssuesWarningsProps {
  result: MultiSourceValidationResult;
}

export function IssuesWarnings({ result }: IssuesWarningsProps) {
  if (!result.sources?.issues_detected || result.sources.issues_detected.length === 0) {
    return null;
  }

  const issues = result.sources.issues_detected;

  const iconMap: Record<string, any> = {
    'alert-triangle': AlertTriangle,
    'alert-circle': AlertCircle,
    info: Info,
  };

  const severityConfig = {
    high: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-300 dark:border-red-700',
      icon: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      text: 'text-red-900 dark:text-red-100',
    },
    medium: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-300 dark:border-yellow-700',
      icon: 'text-yellow-600 dark:text-yellow-400',
      badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      text: 'text-yellow-900 dark:text-yellow-100',
    },
    low: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-300 dark:border-blue-700',
      icon: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      text: 'text-blue-900 dark:text-blue-100',
    },
  };

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <div className="font-semibold text-yellow-900 dark:text-yellow-200">
          Issues Detected ({issues.length})
        </div>
      </div>

      <div className="space-y-3">
        {issues.map((issue: any, index: number) => {
          const Icon = iconMap[issue.icon] || AlertCircle;
          const config =
            severityConfig[issue.severity as keyof typeof severityConfig] || severityConfig.low;

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${config.bg} ${config.border}`}
            >
              {/* Issue Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2 flex-1">
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.icon}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${config.text}`}>{issue.title}</h4>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${config.badge}`}
                      >
                        {issue.severity}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Tier: {issue.tier.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Problem */}
              <div className="mb-2">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Problem:
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-200">{issue.problem}</div>
                {issue.expected && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {issue.expected}
                  </div>
                )}
              </div>

              {/* Impact */}
              {issue.impact && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Impact:
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200">{issue.impact}</div>
                </div>
              )}

              {/* Suggestion */}
              {issue.suggestion && (
                <div className="p-3 bg-white/50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Suggestion:
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {issue.suggestion}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700">
        <div className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>About Issues:</strong> These are potential problems detected during validation.
          High severity issues may require manual review. Medium and low severity issues are
          informational and may not affect the final result significantly.
        </div>
      </div>
    </div>
  );
}

