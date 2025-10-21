import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CostTrend } from '@/types/cost-dashboard';

interface Props {
  trend: CostTrend;
  period: 'daily' | 'monthly';
  onPeriodChange: (period: 'daily' | 'monthly') => void;
}

export function TrendChart({ trend, period, onPeriodChange }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Historical Trend</h3>

        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as 'daily' | 'monthly')}
          className="px-3 py-1.5 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="daily">Last 30 Days</option>
          <option value="monthly">Last 6 Months</option>
        </select>
      </div>

      {trend.trend.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <p className="text-lg mb-2">No data available yet</p>
            <p className="text-sm">Cost data will appear here as you use AI features</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend.trend}>
            <XAxis
              dataKey={period === 'monthly' ? 'month' : 'date'}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              formatter={(value: number) => `$${value.toFixed(2)}`}
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: 'none',
                borderRadius: '4px',
                color: 'white'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="answer_coding"
              stroke="#3B82F6"
              name="Answer Coding"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="codeframe_generation"
              stroke="#A855F7"
              name="Codeframe Builder"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#10B981"
              name="Total"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
