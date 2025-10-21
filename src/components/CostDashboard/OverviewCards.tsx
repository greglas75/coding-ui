import type { CostOverview } from '@/types/cost-dashboard';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  overview: CostOverview;
}

export function OverviewCards({ overview }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Spend */}
      <Card>
        <CardLabel>Total Spend ({overview.period.label})</CardLabel>
        <CardValue>${overview.total_cost_usd.toFixed(2)}</CardValue>
        <CardSubtitle>
          <div className="flex items-center gap-1">
            {overview.comparison_previous_period.change_direction === 'up' ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
            <span className={
              overview.comparison_previous_period.change_direction === 'up'
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }>
              {overview.comparison_previous_period.change_percentage}%
            </span>
            <span className="text-gray-500 dark:text-gray-400">vs previous period</span>
          </div>
        </CardSubtitle>
      </Card>

      {/* Answer Coding */}
      <Card>
        <CardLabel>Answer Coding</CardLabel>
        <CardValue>${overview.breakdown.answer_coding.cost_usd.toFixed(2)}</CardValue>
        <CardSubtitle>
          {overview.breakdown.answer_coding.total_items.toLocaleString()} answers •
          {' '}GPT-4o-mini
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Avg ${overview.breakdown.answer_coding.avg_cost_per_item.toFixed(3)}/answer
          </div>
        </CardSubtitle>
      </Card>

      {/* Codeframe Builder */}
      <Card>
        <CardLabel>Codeframe Builder</CardLabel>
        <CardValue>${overview.breakdown.codeframe_generation.cost_usd.toFixed(2)}</CardValue>
        <CardSubtitle>
          {overview.breakdown.codeframe_generation.total_items} codeframes •
          {' '}Claude Sonnet 4.5
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Avg ${overview.breakdown.codeframe_generation.avg_cost_per_item.toFixed(2)}/codeframe
          </div>
        </CardSubtitle>
      </Card>
    </div>
  );
}

// Helper components
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
      {children}
    </p>
  );
}

function CardValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      {children}
    </p>
  );
}

function CardSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-gray-600 dark:text-gray-400">
      {children}
    </div>
  );
}
