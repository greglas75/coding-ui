/**
 * Cost Dashboard Service
 * Business logic for AI cost tracking, budgeting, and analytics
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class CostDashboardService {

  /**
   * Get date range based on period string
   */
  getDateRange(period, customStart, customEnd) {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;

      case 'this_week':
        const dayOfWeek = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        break;

      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;

      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;

      case 'custom':
        start = new Date(customStart);
        end = new Date(customEnd);
        break;

      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  }

  /**
   * Get cost overview
   */
  async getOverview({ userId, startDate, endDate }) {
    // Query ai_usage_logs directly (SQL function would be better but not required)
    let query = supabase
      .from('ai_usage_logs')
      .select('feature_type, cost_usd, metadata')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Only filter by user_id if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    // Calculate totals
    const totalCost = logs.reduce((sum, row) => sum + parseFloat(row.cost_usd || 0), 0);

    // Breakdown by feature
    const answerCodingLogs = logs.filter(l => l.feature_type === 'answer_coding');
    const codeframeLogs = logs.filter(l => l.feature_type === 'codeframe_generation');

    const answerCodingCost = answerCodingLogs.reduce((sum, row) => sum + parseFloat(row.cost_usd || 0), 0);
    const codeframeCost = codeframeLogs.reduce((sum, row) => sum + parseFloat(row.cost_usd || 0), 0);

    const breakdown = {
      answer_coding: {
        cost_usd: parseFloat(answerCodingCost.toFixed(4)),
        total_items: answerCodingLogs.length,
        avg_cost_per_item: answerCodingLogs.length > 0
          ? parseFloat((answerCodingCost / answerCodingLogs.length).toFixed(4))
          : 0,
        percentage: totalCost > 0
          ? Math.round((answerCodingCost / totalCost) * 100)
          : 0
      },
      codeframe_generation: {
        cost_usd: parseFloat(codeframeCost.toFixed(4)),
        total_items: codeframeLogs.length,
        avg_cost_per_item: codeframeLogs.length > 0
          ? parseFloat((codeframeCost / codeframeLogs.length).toFixed(4))
          : 0,
        percentage: totalCost > 0
          ? Math.round((codeframeCost / totalCost) * 100)
          : 0
      }
    };

    // Get previous period for comparison
    const periodLength = new Date(endDate) - new Date(startDate);
    const prevStart = new Date(new Date(startDate) - periodLength).toISOString();
    const prevEnd = startDate;

    let prevQuery = supabase
      .from('ai_usage_logs')
      .select('cost_usd')
      .gte('created_at', prevStart)
      .lte('created_at', prevEnd);

    if (userId) {
      prevQuery = prevQuery.eq('user_id', userId);
    }

    const { data: prevLogs } = await prevQuery;

    const prevTotalCost = prevLogs?.reduce((sum, row) => sum + parseFloat(row.cost_usd || 0), 0) || 0;
    const changePercentage = prevTotalCost > 0
      ? Math.round(((totalCost - prevTotalCost) / prevTotalCost) * 100)
      : 0;

    // Get budget info
    const budget = await this.getBudgetStatus(userId);

    return {
      period: {
        start: startDate,
        end: endDate,
        label: this._formatPeriodLabel(startDate, endDate)
      },
      total_cost_usd: parseFloat(totalCost.toFixed(4)),
      breakdown,
      comparison_previous_period: {
        total_cost_usd: parseFloat(prevTotalCost.toFixed(4)),
        change_percentage: Math.abs(changePercentage),
        change_direction: changePercentage >= 0 ? 'up' : 'down'
      },
      budget
    };
  }

  /**
   * Get monthly trend (last N months)
   */
  async getMonthlyTrend(userId, months = 6) {
    let query = supabase
      .from('ai_usage_logs')
      .select('created_at, feature_type, cost_usd')
      .gte('created_at', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by month and feature_type
    const monthlyData = {};

    data.forEach(item => {
      const month = item.created_at.substring(0, 7); // YYYY-MM

      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          answer_coding: 0,
          codeframe_generation: 0,
          total: 0
        };
      }

      const cost = parseFloat(item.cost_usd || 0);
      monthlyData[month][item.feature_type] = (monthlyData[month][item.feature_type] || 0) + cost;
      monthlyData[month].total += cost;
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get daily trend
   */
  async getDailyTrend(userId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('ai_usage_logs')
      .select('created_at, feature_type, cost_usd')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by day
    const dailyData = {};

    data.forEach(item => {
      const day = item.created_at.substring(0, 10); // YYYY-MM-DD

      if (!dailyData[day]) {
        dailyData[day] = {
          date: day,
          answer_coding: 0,
          codeframe_generation: 0,
          total: 0
        };
      }

      const cost = parseFloat(item.cost_usd || 0);
      dailyData[day][item.feature_type] = (dailyData[day][item.feature_type] || 0) + cost;
      dailyData[day].total += cost;
    });

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get weekly trend
   */
  async getWeeklyTrend(userId, weeks = 12) {
    const startDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('created_at, feature_type, cost_usd')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by week (ISO week number)
    const weeklyData = {};

    data.forEach(item => {
      const date = new Date(item.created_at);
      const weekNum = this._getWeekNumber(date);
      const year = date.getFullYear();
      const weekKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekKey,
          answer_coding: 0,
          codeframe_generation: 0,
          total: 0
        };
      }

      const cost = parseFloat(item.cost_usd || 0);
      weeklyData[weekKey][item.feature_type] = (weeklyData[weekKey][item.feature_type] || 0) + cost;
      weeklyData[weekKey].total += cost;
    });

    return Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week));
  }

  /**
   * Get detailed breakdown (paginated)
   */
  async getDetailedBreakdown({ userId, featureType, startDate, endDate, limit, offset, sort }) {
    let query = supabase
      .from('ai_usage_logs')
      .select(`
        id,
        created_at,
        feature_type,
        model,
        input_tokens,
        output_tokens,
        cost_usd,
        metadata,
        category_id,
        categories (name)
      `, { count: 'exact' });

    // Filters
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (featureType && featureType !== 'all') {
      query = query.eq('feature_type', featureType);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Sorting
    switch (sort) {
      case 'date_asc':
        query = query.order('created_at', { ascending: true });
        break;
      case 'cost_desc':
        query = query.order('cost_usd', { ascending: false });
        break;
      case 'cost_asc':
        query = query.order('cost_usd', { ascending: true });
        break;
      case 'date_desc':
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Format items
    const items = data.map(item => ({
      id: item.id,
      date: item.created_at.split('T')[0],
      time: item.created_at.split('T')[1]?.split('.')[0] || '00:00:00',
      feature_type: item.feature_type,
      description: this._generateDescription(item),
      model: item.model,
      tokens: {
        input: item.input_tokens,
        output: item.output_tokens
      },
      cost_usd: parseFloat(item.cost_usd),
      category_name: item.categories?.name || 'N/A'
    }));

    return {
      items,
      pagination: {
        total: count,
        limit,
        offset,
        has_more: offset + limit < count
      }
    };
  }

  /**
   * Get budget status
   */
  async getBudgetStatus(userId) {
    // For now, use defaults (in future, query user_settings table)
    const monthlyLimit = 200.00;  // Default $200/month
    const alertThreshold = 80;     // Alert at 80%

    // Get current month costs
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    let query = supabase
      .from('ai_usage_logs')
      .select('cost_usd')
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const used = data.reduce((sum, item) => sum + parseFloat(item.cost_usd || 0), 0);
    const percentage = Math.round((used / monthlyLimit) * 100);
    const remaining = monthlyLimit - used;

    return {
      monthly_limit: monthlyLimit,
      used: parseFloat(used.toFixed(2)),
      percentage,
      remaining: parseFloat(remaining.toFixed(2)),
      alert_threshold: alertThreshold,
      is_alert: percentage >= alertThreshold
    };
  }

  /**
   * Update budget settings
   */
  async updateBudgetSettings({ userId, monthlyLimit, alertThreshold, autoPause }) {
    // TODO: Implement user_settings table
    // For now, return mock
    return {
      monthly_limit: monthlyLimit,
      alert_threshold: alertThreshold,
      auto_pause: autoPause,
      message: 'Budget settings saved (feature in development)'
    };
  }

  /**
   * Export to CSV
   */
  async exportToCSV({ userId, featureType, startDate, endDate }) {
    const { items } = await this.getDetailedBreakdown({
      userId,
      featureType,
      startDate,
      endDate,
      limit: 10000,
      offset: 0,
      sort: 'date_desc'
    });

    // Build CSV
    const headers = 'Date,Time,Feature,Description,Model,Input Tokens,Output Tokens,Cost USD,Category\n';
    const rows = items.map(item =>
      `${item.date},${item.time},"${item.feature_type}","${item.description}","${item.model}",${item.tokens.input},${item.tokens.output},${item.cost_usd},"${item.category_name}"`
    ).join('\n');

    return headers + rows;
  }

  /**
   * Get cost predictions
   */
  async getPredictions(userId) {
    // Get current month data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let query = supabase
      .from('ai_usage_logs')
      .select('created_at, cost_usd')
      .gte('created_at', startOfMonth)
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data.length === 0) {
      return {
        current_total: 0,
        daily_average: 0,
        days_remaining: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate(),
        projected_end_of_month: 0,
        confidence: 'none'
      };
    }

    // Calculate daily average
    const currentDay = now.getDate();
    const totalCost = data.reduce((sum, item) => sum + parseFloat(item.cost_usd || 0), 0);
    const dailyAvg = totalCost / currentDay;

    // Project to end of month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - currentDay;
    const projectedTotal = totalCost + (dailyAvg * daysRemaining);

    return {
      current_total: parseFloat(totalCost.toFixed(2)),
      daily_average: parseFloat(dailyAvg.toFixed(2)),
      days_remaining: daysRemaining,
      projected_end_of_month: parseFloat(projectedTotal.toFixed(2)),
      confidence: currentDay >= 7 ? 'high' : (currentDay >= 3 ? 'medium' : 'low')
    };
  }

  // Helper methods

  _formatPeriodLabel(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }

  _generateDescription(item) {
    if (item.feature_type === 'answer_coding') {
      return `Categorized answer in ${item.categories?.name || 'category'}`;
    } else if (item.feature_type === 'codeframe_generation') {
      const meta = item.metadata || {};
      return `Codeframe: ${item.categories?.name || 'category'} (${meta.n_clusters || 0} clusters, ${meta.n_codes || 0} codes)`;
    }
    return 'AI operation';
  }

  _getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
}

export default new CostDashboardService();
