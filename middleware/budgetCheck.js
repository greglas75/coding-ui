/**
import logger from '../utils/logger.js';
 * Budget Check Middleware
 * Protects expensive AI operations by checking if user has exceeded budget
 */

import costDashboardService from '../services/costDashboardService.js';

/**
 * Middleware to check if user has exceeded budget
 * Use before expensive AI operations
 *
 * Usage:
 *   import { checkBudget } from '../middleware/budgetCheck.js';
 *   router.post('/api/expensive-operation', checkBudget, async (req, res) => { ... });
 */
export async function checkBudget(req, res, next) {
  try {
    const userId = req.user?.id || 'service-user';
    const budget = await costDashboardService.getBudgetStatus(userId);

    if (budget.percentage >= 100) {
      return res.status(429).json({
        error: 'Budget limit exceeded',
        message: `You have reached your monthly budget limit of $${budget.monthly_limit}. Please increase your budget or wait until next month.`,
        budget
      });
    }

    // Add budget info to request for logging
    req.budgetStatus = budget;

    // Log warning if approaching limit
    if (budget.percentage >= budget.alert_threshold) {
      logger.warn(`⚠️  User ${userId} approaching budget limit: ${budget.percentage}% used`);
    }

    next();
  } catch (error) {
    logger.error('Budget check failed:', error);
    // Don't block request on budget check failure
    // This ensures the system remains functional even if budget check breaks
    next();
  }
}

/**
 * Stricter version that also checks alert threshold
 * Blocks requests if alert threshold is exceeded
 */
export async function checkBudgetStrict(req, res, next) {
  try {
    const userId = req.user?.id || 'service-user';
    const budget = await costDashboardService.getBudgetStatus(userId);

    if (budget.percentage >= budget.alert_threshold) {
      return res.status(429).json({
        error: 'Budget alert threshold exceeded',
        message: `You have exceeded ${budget.alert_threshold}% of your monthly budget ($${budget.used}/${budget.monthly_limit}). Please review your usage.`,
        budget
      });
    }

    // Add budget info to request for logging
    req.budgetStatus = budget;

    next();
  } catch (error) {
    logger.error('Strict budget check failed:', error);
    // Don't block request on budget check failure
    next();
  }
}

export default { checkBudget, checkBudgetStrict };
