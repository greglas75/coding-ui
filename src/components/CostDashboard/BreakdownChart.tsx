import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { CostOverview } from '@/types/cost-dashboard';

interface Props {
  overview: CostOverview;
}

export function BreakdownChart({ overview }: Props) {
  const data = [
    {
      name: 'Answer Coding',
      cost: overview.breakdown.answer_coding.cost_usd,
      percentage: overview.breakdown.answer_coding.percentage
    },
    {
      name: 'Codeframe Builder',
      cost: overview.breakdown.codeframe_generation.cost_usd,
      percentage: overview.breakdown.codeframe_generation.percentage
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Cost Breakdown by Feature</h3>

      {/* Horizontal bar visualization */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700 dark:text-gray-300">Answer Coding (GPT-4o-mini)</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${overview.breakdown.answer_coding.cost_usd.toFixed(2)} ({overview.breakdown.answer_coding.percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6">
            <div
              className="bg-blue-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${Math.max(overview.breakdown.answer_coding.percentage, 5)}%` }}
            >
              {overview.breakdown.answer_coding.percentage > 10 && (
                <span className="text-xs text-white font-medium">
                  {overview.breakdown.answer_coding.percentage}%
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            • {overview.breakdown.answer_coding.total_items.toLocaleString()} answers categorized
            • Avg ${overview.breakdown.answer_coding.avg_cost_per_item.toFixed(3)} per answer
          </p>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700 dark:text-gray-300">Codeframe Builder (Claude Sonnet 4.5)</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${overview.breakdown.codeframe_generation.cost_usd.toFixed(2)} ({overview.breakdown.codeframe_generation.percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6">
            <div
              className="bg-purple-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${Math.max(overview.breakdown.codeframe_generation.percentage, 5)}%` }}
            >
              {overview.breakdown.codeframe_generation.percentage > 10 && (
                <span className="text-xs text-white font-medium">
                  {overview.breakdown.codeframe_generation.percentage}%
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            • {overview.breakdown.codeframe_generation.total_items} codeframes generated
            • Avg ${overview.breakdown.codeframe_generation.avg_cost_per_item.toFixed(2)} per codeframe
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
          <YAxis tick={{ fill: '#9CA3AF' }} />
          <Tooltip
            formatter={(value: number) => `$${value.toFixed(2)}`}
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '4px',
              color: 'white'
            }}
          />
          <Bar dataKey="cost" fill="#3B82F6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
