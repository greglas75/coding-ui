import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import type { SentimentStats } from '@/types/sentiment';

interface SentimentAnalyticsProps {
  categoryId: number;
}

export function SentimentAnalytics({ categoryId }: SentimentAnalyticsProps) {
  const { data, isLoading, error } = useQuery<SentimentStats>({
    queryKey: ['sentiment-stats', categoryId],
    queryFn: () => axios.get(`/api/v1/sentiment/stats/${categoryId}`).then(r => r.data),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
          No Sentiment Data Yet
        </h3>
        <p className="text-yellow-800 dark:text-yellow-300 mb-4">
          Enable sentiment analysis for this category and analyze some answers to see statistics here.
        </p>
        <div className="text-sm text-yellow-700 dark:text-yellow-400">
          <p className="font-medium mb-2">To get started:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open category settings</li>
            <li>Enable "Sentiment Analysis"</li>
            <li>Choose "Smart Mode" (recommended)</li>
            <li>Analyze some answers</li>
          </ol>
        </div>
      </div>
    );
  }

  const { overall } = data;

  // Prepare data for charts
  const sentimentData = [
    { name: 'Positive', value: overall.positive.count, percentage: overall.positive.percentage, color: '#10B981' },
    { name: 'Neutral', value: overall.neutral.count, percentage: overall.neutral.percentage, color: '#6B7280' },
    { name: 'Negative', value: overall.negative.count, percentage: overall.negative.percentage, color: '#EF4444' },
    { name: 'Mixed', value: overall.mixed.count, percentage: overall.mixed.percentage, color: '#F59E0B' },
  ].filter(item => item.value > 0);

  const hasData = overall.total_answers > 0;

  if (!hasData) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
          Ready for Sentiment Analysis
        </h3>
        <p className="text-blue-800 dark:text-blue-300">
          This category is configured for sentiment analysis. Start analyzing answers to see statistics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Answers</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{overall.total_answers}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">With Sentiment</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {overall.sentiment_applicable_count}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {overall.applicable_percentage}% of total
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Factual Only</div>
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
            {overall.sentiment_not_applicable_count}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {Math.round(100 - overall.applicable_percentage)}% of total
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Score</div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {Math.round((overall.avg_sentiment_score || 0.5) * 100)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {overall.avg_sentiment_score > 0.6 ? '😊 Positive' : overall.avg_sentiment_score < 0.4 ? '😞 Negative' : '😐 Neutral'}
          </div>
        </div>
      </div>

      {/* Sentiment Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sentiment Distribution
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sentimentData}>
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} (${props.payload.percentage}%)`,
                    name
                  ]}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {overall.positive.count}
            </div>
            <div className="text-sm text-green-800 dark:text-green-300">
              😊 Positive ({overall.positive.percentage}%)
            </div>
          </div>

          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {overall.neutral.count}
            </div>
            <div className="text-sm text-gray-800 dark:text-gray-300">
              😐 Neutral ({overall.neutral.percentage}%)
            </div>
          </div>

          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {overall.negative.count}
            </div>
            <div className="text-sm text-red-800 dark:text-red-300">
              😞 Negative ({overall.negative.percentage}%)
            </div>
          </div>

          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {overall.mixed.count}
            </div>
            <div className="text-sm text-yellow-800 dark:text-yellow-300">
              🤔 Mixed ({overall.mixed.percentage}%)
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Score Gauge */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Overall Sentiment Score
        </h3>

        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="80"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r="80"
                fill="none"
                stroke={
                  overall.avg_sentiment_score > 0.6 ? '#10B981' :
                  overall.avg_sentiment_score < 0.4 ? '#EF4444' :
                  '#6B7280'
                }
                strokeWidth="16"
                strokeDasharray={`${(overall.avg_sentiment_score || 0.5) * 502.4} 502.4`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">
                {Math.round((overall.avg_sentiment_score || 0.5) * 100)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {overall.avg_sentiment_score > 0.6 ? 'Positive' :
                 overall.avg_sentiment_score < 0.4 ? 'Negative' :
                 'Neutral'}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Average sentiment score across all analyzed answers (0 = very negative, 100 = very positive)
        </p>
      </div>

      {/* Smart Mode Info */}
      {overall.sentiment_not_applicable_count > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🧠</div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                Smart Detection Active
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                AI automatically identified {overall.sentiment_not_applicable_count} answers as factual
                (brand names, product IDs, etc.) and skipped sentiment analysis, saving you{' '}
                <strong>
                  ~{Math.round((overall.sentiment_not_applicable_count / overall.total_answers) * 12)}%
                </strong>
                {' '}on AI costs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
