/**
 * TypeScript types for AI Cost Dashboard
 */

export interface CostOverview {
  period: {
    start: string;
    end: string;
    label: string;
  };
  total_cost_usd: number;
  breakdown: {
    answer_coding: {
      cost_usd: number;
      percentage: number;
      total_items: number;
      avg_cost_per_item: number;
    };
    codeframe_generation: {
      cost_usd: number;
      percentage: number;
      total_items: number;
      avg_cost_per_item: number;
    };
  };
  comparison_previous_period: {
    total_cost_usd: number;
    change_percentage: number;
    change_direction: 'up' | 'down';
  };
  budget: BudgetStatus;
}

export interface BudgetStatus {
  monthly_limit: number;
  used: number;
  percentage: number;
  remaining: number;
  alert_threshold: number;
  is_alert: boolean;
}

export interface CostTrend {
  period: 'daily' | 'weekly' | 'monthly';
  trend: Array<{
    month?: string;
    date?: string;
    week?: string;
    answer_coding: number;
    codeframe_generation: number;
    total: number;
  }>;
}

export interface DetailedCostItem {
  id: string;
  date: string;
  time: string;
  feature_type: 'answer_coding' | 'codeframe_generation';
  description: string;
  model: string;
  tokens: {
    input: number;
    output: number;
  };
  cost_usd: number;
  category_name: string;
}

export interface DetailedCosts {
  items: DetailedCostItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface CostPrediction {
  current_total: number;
  daily_average: number;
  days_remaining: number;
  projected_end_of_month: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
}
