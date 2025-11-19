/**
import logger from '../utils/logger.js';
 * Cost Dashboard API Routes
 * Endpoints for AI cost tracking, budgeting, and analytics
 */

import express from 'express';
import costDashboardService from '../services/costDashboardService.js';

const router = express.Router();

// Note: Authentication middleware will be applied in api-server.js

/**
 * GET /api/v1/cost-dashboard/overview
 *
 * Get cost overview for a time period
 * Query params:
 *   - period: 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom'
 *   - start_date: ISO date (for custom period)
 *   - end_date: ISO date (for custom period)
 *   - user_id: UUID (admin only, optional)
 */
router.get('/overview', async (req, res) => {
  try {
    const { period = 'this_month', start_date, end_date, user_id } = req.query;

    // Get date range based on period
    const dateRange = costDashboardService.getDateRange(period, start_date, end_date);

    // Get overview data
    const overview = await costDashboardService.getOverview({
      userId: user_id || req.user?.id || null,
      startDate: dateRange.start,
      endDate: dateRange.end
    });

    res.json(overview);
  } catch (error) {
    logger.error('Error fetching cost overview:', error);
    res.status(500).json({
      error: 'Failed to fetch cost overview',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/cost-dashboard/trend
 *
 * Get cost trend over time
 * Query params:
 *   - period: 'daily' | 'weekly' | 'monthly'
 *   - days: number of days (for daily)
 *   - weeks: number of weeks (for weekly)
 *   - months: number of months (for monthly, default 6)
 */
router.get('/trend', async (req, res) => {
  try {
    const {
      period = 'monthly',
      days = 30,
      weeks = 12,
      months = 6
    } = req.query;

    const userId = req.user?.id || null;
    let trend;

    switch (period) {
      case 'daily':
        trend = await costDashboardService.getDailyTrend(userId, parseInt(days));
        break;
      case 'weekly':
        trend = await costDashboardService.getWeeklyTrend(userId, parseInt(weeks));
        break;
      case 'monthly':
      default:
        trend = await costDashboardService.getMonthlyTrend(userId, parseInt(months));
        break;
    }

    res.json({ period, trend });
  } catch (error) {
    logger.error('Error fetching cost trend:', error);
    res.status(500).json({
      error: 'Failed to fetch cost trend',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/cost-dashboard/detailed
 *
 * Get detailed cost breakdown (paginated)
 * Query params:
 *   - feature_type: 'all' | 'answer_coding' | 'codeframe_generation'
 *   - start_date: ISO date
 *   - end_date: ISO date
 *   - limit: number (default 50, max 200)
 *   - offset: number (default 0)
 *   - sort: 'date_desc' | 'date_asc' | 'cost_desc' | 'cost_asc'
 */
router.get('/detailed', async (req, res) => {
  try {
    const {
      feature_type = 'all',
      start_date,
      end_date,
      limit = 50,
      offset = 0,
      sort = 'date_desc'
    } = req.query;

    const result = await costDashboardService.getDetailedBreakdown({
      userId: req.user?.id || null,
      featureType: feature_type,
      startDate: start_date,
      endDate: end_date,
      limit: Math.min(parseInt(limit), 200),
      offset: parseInt(offset),
      sort
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching detailed breakdown:', error);
    res.status(500).json({
      error: 'Failed to fetch detailed breakdown',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/cost-dashboard/budget
 *
 * Get current budget status and alerts
 */
router.get('/budget', async (req, res) => {
  try {
    const budget = await costDashboardService.getBudgetStatus(req.user?.id || null);
    res.json(budget);
  } catch (error) {
    logger.error('Error fetching budget status:', error);
    res.status(500).json({
      error: 'Failed to fetch budget status',
      message: error.message
    });
  }
});

/**
 * PUT /api/v1/cost-dashboard/budget
 *
 * Update budget settings
 * Body:
 *   - monthly_limit: number
 *   - alert_threshold: number (0-100, percentage)
 *   - auto_pause: boolean
 */
router.put('/budget', async (req, res) => {
  try {
    const { monthly_limit, alert_threshold, auto_pause } = req.body;

    // Validation
    if (monthly_limit !== undefined && (monthly_limit < 0 || monthly_limit > 100000)) {
      return res.status(400).json({ error: 'Invalid monthly_limit (must be 0-100000)' });
    }

    if (alert_threshold !== undefined && (alert_threshold < 0 || alert_threshold > 100)) {
      return res.status(400).json({ error: 'Invalid alert_threshold (must be 0-100)' });
    }

    const updated = await costDashboardService.updateBudgetSettings({
      userId: req.user?.id || null,
      monthlyLimit: monthly_limit,
      alertThreshold: alert_threshold,
      autoPause: auto_pause
    });

    res.json(updated);
  } catch (error) {
    logger.error('Error updating budget settings:', error);
    res.status(500).json({
      error: 'Failed to update budget settings',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/cost-dashboard/export
 *
 * Export cost data as CSV
 * Query params: same as /detailed
 */
router.get('/export', async (req, res) => {
  try {
    const {
      feature_type = 'all',
      start_date,
      end_date
    } = req.query;

    const csvData = await costDashboardService.exportToCSV({
      userId: req.user?.id || null,
      featureType: feature_type,
      startDate: start_date,
      endDate: end_date
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ai-costs-${Date.now()}.csv"`);
    res.send(csvData);
  } catch (error) {
    logger.error('Error exporting cost data:', error);
    res.status(500).json({
      error: 'Failed to export cost data',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/cost-dashboard/predictions
 *
 * Get cost predictions for end of month
 */
router.get('/predictions', async (req, res) => {
  try {
    const predictions = await costDashboardService.getPredictions(req.user?.id || null);
    res.json(predictions);
  } catch (error) {
    logger.error('Error fetching predictions:', error);
    res.status(500).json({
      error: 'Failed to fetch predictions',
      message: error.message
    });
  }
});

export default router;
