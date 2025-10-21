import { useCostPredictions } from '@/hooks/useCostPredictions';
import { TrendingUp } from 'lucide-react';

export function PredictionCard() {
  const { data: prediction, isLoading } = useCostPredictions();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (!prediction) return null;

  const getConfidenceBadge = () => {
    switch (prediction.confidence) {
      case 'high':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">High confidence</span>;
      case 'medium':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">Medium confidence</span>;
      case 'low':
        return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded">Low confidence</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded">Insufficient data</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">End-of-Month Projection</h3>
        <TrendingUp className="w-5 h-5 text-blue-600" />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${prediction.projected_end_of_month.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Projected total by month end
          </p>
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Current total</span>
            <span className="font-medium text-gray-900 dark:text-white">${prediction.current_total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Daily average</span>
            <span className="font-medium text-gray-900 dark:text-white">${prediction.daily_average.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Days remaining</span>
            <span className="font-medium text-gray-900 dark:text-white">{prediction.days_remaining}</span>
          </div>
        </div>

        <div className="pt-2">
          {getConfidenceBadge()}
        </div>
      </div>
    </div>
  );
}
