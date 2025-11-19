import { Zap } from 'lucide-react';
import type { MultiSourceValidationResult } from '../../../../../services/multiSourceValidator';

interface PerformanceMetricsProps {
  result: MultiSourceValidationResult;
}

interface PerformanceTier {
  name: string;
  time_ms: number;
  time_seconds: string;
  percentage: number;
  cost: number;
  color: string;
}

interface PerformanceBreakdown {
  total_time_ms: number;
  total_time_seconds: string;
  total_cost: number;
  tiers: PerformanceTier[];
}

export function PerformanceMetrics({ result }: PerformanceMetricsProps) {
  // Detailed performance breakdown
  if (result.sources?.performance_breakdown) {
    const breakdown = result.sources.performance_breakdown as PerformanceBreakdown;

    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500',
      sky: 'bg-sky-500',
      purple: 'bg-purple-500',
      indigo: 'bg-indigo-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      slate: 'bg-slate-500',
    };

    const slowestTier = breakdown.tiers.reduce(
      (max, tier) => (tier.time_ms > max.time_ms ? tier : max),
      breakdown.tiers[0]
    );

    const mostExpensive = breakdown.tiers.reduce(
      (max, tier) => (tier.cost > max.cost ? tier : max),
      breakdown.tiers[0]
    );

    return (
      <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <div className="font-semibold text-slate-900 dark:text-slate-200">
            Performance Metrics
          </div>
        </div>

        {/* Total Summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Time</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {breakdown.total_time_seconds}s
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              {breakdown.total_time_ms}ms
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              ${breakdown.total_cost.toFixed(5)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              Per validation
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Tiers Executed</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {breakdown.tiers.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              Validation tiers
            </div>
          </div>
        </div>

        {/* Per-Tier Breakdown */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Time & Cost per Tier:
          </div>

          {breakdown.tiers.map((tier, index) => {
            const barColor = colorMap[tier.color] || 'bg-gray-500';

            return (
              <div
                key={index}
                className="p-3 bg-white dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-2 h-2 rounded-full ${barColor}`} />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {tier.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {tier.time_seconds}s
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {tier.percentage}%
                      </div>
                    </div>

                    <div className="text-right min-w-[60px]">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        ${tier.cost.toFixed(5)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">cost</div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all`}
                    style={{ width: `${tier.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Insights */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <div className="font-semibold mb-1">Performance Insights:</div>
            <div className="text-xs space-y-1">
              <div>
                • Slowest tier: {slowestTier.name} ({slowestTier.time_seconds}s,{' '}
                {slowestTier.percentage}% of total)
              </div>
              <div>• Most expensive: {mostExpensive.name} (${mostExpensive.cost.toFixed(5)})</div>
              <div>
                • Parallel execution saved ~
                {Math.round(
                  breakdown.tiers.reduce((sum, t) => sum + t.time_ms, 0) -
                    breakdown.total_time_ms
                )}
                ms by running tiers concurrently
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Simple performance metrics (fallback)
  if (result.time_ms || result.cost) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <div className="font-semibold text-slate-900 dark:text-slate-200">
            Performance Metrics
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {result.time_ms && (
            <div className="p-3 bg-slate-100 dark:bg-slate-900/40 rounded-lg">
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Time</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {(result.time_ms / 1000).toFixed(2)}s
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {result.time_ms}ms
              </div>
            </div>
          )}
          {result.cost && (
            <div className="p-3 bg-slate-100 dark:bg-slate-900/40 rounded-lg">
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Cost</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ${result.cost.toFixed(4)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Per validation
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

