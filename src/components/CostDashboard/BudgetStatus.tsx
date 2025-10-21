import type { BudgetStatus as BudgetStatusType } from '@/types/cost-dashboard';

interface Props {
  budget: BudgetStatusType;
}

export function BudgetStatus({ budget }: Props) {
  const getColorClass = () => {
    if (budget.percentage >= 90) return 'bg-red-600';
    if (budget.percentage >= 80) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Monthly Budget</h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Used this month</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${budget.used.toFixed(2)} / ${budget.monthly_limit.toFixed(2)}
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${getColorClass()}`}
              style={{ width: `${Math.min(budget.percentage, 100)}%` }}
            />
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {budget.percentage}% used • ${budget.remaining.toFixed(2)} remaining
          </p>
        </div>

        {budget.is_alert && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              ⚠️ Approaching budget limit
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Consider optimizing AI usage or increasing your budget
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
