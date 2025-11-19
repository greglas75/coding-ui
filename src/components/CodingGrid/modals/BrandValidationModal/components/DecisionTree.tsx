import {
  GitBranch,
  Eye,
  Search,
  CheckCircle,
  Globe,
  Zap,
  TrendingUp,
  ArrowDown,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';

interface DecisionTreeProps {
  result: MultiSourceValidationResult;
}

interface DecisionStep {
  step: string;
  icon: string;
  label: string;
  result: boolean;
  details?: string;
  confidence?: number;
}

export function DecisionTree({ result }: DecisionTreeProps) {
  if (!result.sources?.decision_tree) return null;

  const decisionTree = result.sources.decision_tree as DecisionStep[];

  const iconMap: Record<string, LucideIcon> = {
    eye: Eye,
    search: Search,
    'check-circle': CheckCircle,
    globe: Globe,
    zap: Zap,
    'trending-up': TrendingUp,
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <div className="font-semibold text-slate-900 dark:text-slate-200">Decision Tree</div>
      </div>

      <div className="space-y-3">
        {decisionTree.map((step, index) => {
          const isLast = index === decisionTree.length - 1;
          const Icon = iconMap[step.icon] || CheckCircle;

          return (
            <div key={step.step} className="relative">
              {/* Step Card */}
              <div
                className={`p-4 rounded-lg border-2 transition-all ${
                  step.result
                    ? 'bg-white dark:bg-slate-900/50 border-green-300 dark:border-green-700'
                    : 'bg-white dark:bg-slate-900/50 border-yellow-300 dark:border-yellow-700'
                }`}
              >
                {/* Step Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-lg ${
                        step.result
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-yellow-100 dark:bg-yellow-900/30'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          step.result
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Step {step.step}</div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {step.check}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      step.signal === 'STRONG' ||
                      step.signal === 'HIGH' ||
                      step.signal === 'VERIFIED' ||
                      step.signal === 'CLEAR_MATCH'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : step.signal === 'MODERATE' || step.signal === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : step.signal === 'WEAK' ||
                          step.signal === 'LOW' ||
                          step.signal === 'MISMATCH' ||
                          step.signal === 'UNCLEAR'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}
                  >
                    {step.signal}
                  </div>
                </div>

                {/* Question */}
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
                  "{step.question}"
                </div>

                {/* Result Icon and Details */}
                <div className="flex items-start gap-2 mb-2">
                  <div className="mt-0.5">
                    {step.result ? (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{step.details}</div>
                </div>

                {/* Impact */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <TrendingUp className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Impact: {step.impact}
                  </span>
                </div>
              </div>

              {/* Arrow to next step */}
              {!isLast && (
                <div className="flex justify-center my-2">
                  <ArrowDown className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900/30 rounded-lg border border-slate-300 dark:border-slate-700">
        <div className="text-sm text-slate-800 dark:text-slate-200">
          <strong>Decision Logic:</strong> The validation system checks each tier sequentially,
          combining their signals to detect patterns. Strong agreement across multiple sources
          increases confidence, while mismatches or low scores reduce it.
        </div>
      </div>
    </div>
  );
}

