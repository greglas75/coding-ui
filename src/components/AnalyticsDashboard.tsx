import { Award, BarChart3, Clock, Download, Target, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { AnalyticsEngine, type AnalyticsData } from '../lib/analyticsEngine';
import { simpleLogger } from '../utils/logger';

interface Props {
  categoryId?: number;
}

export function AnalyticsDashboard({ categoryId }: Props) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });

  const analyticsEngine = new AnalyticsEngine();

  useEffect(() => {
    loadAnalytics();
  }, [categoryId, dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await analyticsEngine.generateAnalytics(categoryId, dateRange);
      setAnalytics(data);
      simpleLogger.info('✅ Analytics loaded:', data);
    } catch (error) {
      simpleLogger.error('❌ Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (analytics) {
      analyticsEngine.exportAsJSON(analytics);
      toast.success('Analytics exported as JSON');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const COLORS = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#84CC16',
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 size={32} className="text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Coding statistics and productivity insights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <select
            onChange={e => {
              const days = parseInt(e.target.value);
              setDateRange({
                from: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
                to: new Date(),
              });
            }}
            className="px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>

          <button
            onClick={handleExportJSON}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <Download size={16} />
            Export JSON
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-blue-600 dark:text-blue-400">
              <Target size={24} />
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
              {analytics.summary.codingRate.toFixed(1)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.summary.totalCoded}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Coded Answers</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-green-600 dark:text-green-400">
              <TrendingUp size={24} />
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
              {analytics.codingSpeed.answersPerHour.toFixed(1)}/hr
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.codingSpeed.totalTime.toFixed(0)}m
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Time Spent</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-purple-600 dark:text-purple-400">
              <Award size={24} />
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
              {analytics.aiAccuracy.accuracyRate.toFixed(1)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.aiVsManual.ai}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">AI Coded</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-orange-600 dark:text-orange-400">
              <Clock size={24} />
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
              {analytics.codingSpeed.averageTimePerAnswer.toFixed(0)}s
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics.topCodes.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Unique Codes</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coding Progress Over Time */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Coding Progress Over Time
          </h3>
          {analytics.codingProgress.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.codingProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  name="Answers Coded"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* AI vs Manual */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            AI vs Manual Coding
          </h3>
          {analytics.aiVsManual.ai + analytics.aiVsManual.manual > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'AI Coded', value: analytics.aiVsManual.ai },
                    { name: 'Manual Coded', value: analytics.aiVsManual.manual },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${((percent as number) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#8B5CF6" />
                  <Cell fill="#10B981" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6">
        {/* Top Codes */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top 10 Most Used Codes
          </h3>
          {analytics.topCodes.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={analytics.topCodes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis
                  dataKey="codeName"
                  type="category"
                  stroke="#9CA3AF"
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'count') return [value, 'Count'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="count" name="Usage Count">
                  {analytics.topCodes.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* AI Performance Section */}
      {analytics.aiAccuracy.accepted + analytics.aiAccuracy.rejected > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Accuracy */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              AI Suggestion Accuracy
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Accepted</span>
                <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {analytics.aiAccuracy.accepted}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${analytics.aiAccuracy.accuracyRate}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Rejected</span>
                <span className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {analytics.aiAccuracy.rejected}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all"
                  style={{ width: `${100 - analytics.aiAccuracy.accuracyRate}%` }}
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-neutral-800">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {analytics.aiAccuracy.accuracyRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Overall Accuracy Rate
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coding Speed Stats */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Productivity Metrics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Answers per Hour</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {analytics.codingSpeed.answersPerHour.toFixed(1)}
                  </div>
                </div>
                <TrendingUp size={32} className="text-blue-600 dark:text-blue-400" />
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Avg Time per Answer
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {analytics.codingSpeed.averageTimePerAnswer.toFixed(0)}s
                  </div>
                </div>
                <Clock size={32} className="text-green-600 dark:text-green-400" />
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Time Spent</div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {(analytics.codingSpeed.totalTime / 60).toFixed(1)}h
                  </div>
                </div>
                <Clock size={32} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Distribution */}
      {analytics.categoryDistribution.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Category Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ categoryName, percentage }) =>
                    `${categoryName}: ${(percentage as number).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.categoryDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              {analytics.categoryDistribution.map((cat, index) => (
                <div
                  key={cat.categoryId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {cat.categoryName}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {cat.count}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {cat.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
