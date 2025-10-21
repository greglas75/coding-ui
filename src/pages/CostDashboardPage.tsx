import { useState } from 'react';
import { useCostOverview } from '@/hooks/useCostOverview';
import { useCostTrend } from '@/hooks/useCostTrend';
import { OverviewCards } from '@/components/CostDashboard/OverviewCards';
import { BudgetStatus } from '@/components/CostDashboard/BudgetStatus';
import { PredictionCard } from '@/components/CostDashboard/PredictionCard';
import { BreakdownChart } from '@/components/CostDashboard/BreakdownChart';
import { TrendChart } from '@/components/CostDashboard/TrendChart';
import { DetailedTable } from '@/components/CostDashboard/DetailedTable';
import { DollarSign } from 'lucide-react';

export default function CostDashboardPage() {
  const [overviewPeriod, setOverviewPeriod] = useState('this_month');
  const [trendPeriod, setTrendPeriod] = useState<'daily' | 'monthly'>('daily');

  const { data: overview, isLoading: overviewLoading } = useCostOverview(overviewPeriod);
  const { data: trend, isLoading: trendLoading } = useCostTrend(trendPeriod);

  const isLoading = overviewLoading || trendLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Cost Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Monitor and analyze your AI feature usage costs
                </p>
              </div>
            </div>

            {/* Period selector */}
            <select
              value={overviewPeriod}
              onChange={(e) => setOverviewPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : overview && trend ? (
          <div className="space-y-8">
            {/* Overview Cards */}
            <OverviewCards overview={overview} />

            {/* Budget Status & Prediction */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BudgetStatus budget={overview.budget} />
              <PredictionCard />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BreakdownChart overview={overview} />
              <TrendChart
                trend={trend}
                period={trendPeriod}
                onPeriodChange={setTrendPeriod}
              />
            </div>

            {/* Detailed Table */}
            <DetailedTable />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                Unable to load cost dashboard
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Please check your connection and try again
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
