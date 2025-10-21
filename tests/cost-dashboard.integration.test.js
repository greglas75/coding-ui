/**
 * Integration Tests for Cost Dashboard API
 * Tests the complete flow from database to API responses
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';
const API_PATH = '/api/v1/cost-dashboard';

describe('Cost Dashboard API Integration Tests', () => {
  let testData = {};

  beforeAll(() => {
    // Store test results for cross-test validation
    testData = {};
  });

  describe('GET /overview', () => {
    it('should return cost overview with correct structure', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/overview`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('period');
      expect(response.data).toHaveProperty('total_cost_usd');
      expect(response.data).toHaveProperty('breakdown');
      expect(response.data).toHaveProperty('comparison_previous_period');
      expect(response.data).toHaveProperty('budget');

      // Store for later tests
      testData.overview = response.data;
    });

    it('should have valid breakdown structure', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/overview`);
      const { breakdown } = response.data;

      expect(breakdown).toHaveProperty('answer_coding');
      expect(breakdown).toHaveProperty('codeframe_generation');

      // Validate answer_coding breakdown
      expect(breakdown.answer_coding).toHaveProperty('cost_usd');
      expect(breakdown.answer_coding).toHaveProperty('total_items');
      expect(breakdown.answer_coding).toHaveProperty('avg_cost_per_item');
      expect(breakdown.answer_coding).toHaveProperty('percentage');

      // Validate codeframe_generation breakdown
      expect(breakdown.codeframe_generation).toHaveProperty('cost_usd');
      expect(breakdown.codeframe_generation).toHaveProperty('total_items');
      expect(breakdown.codeframe_generation).toHaveProperty('avg_cost_per_item');
      expect(breakdown.codeframe_generation).toHaveProperty('percentage');
    });

    it('should calculate percentages correctly', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/overview`);
      const { breakdown, total_cost_usd } = response.data;

      const answerPct = breakdown.answer_coding.percentage;
      const codeframePct = breakdown.codeframe_generation.percentage;

      // Percentages should sum to 100 (or both 0 if no data)
      if (total_cost_usd > 0) {
        expect(answerPct + codeframePct).toBe(100);
      } else {
        expect(answerPct).toBe(0);
        expect(codeframePct).toBe(0);
      }
    });

    it('should support different time periods', async () => {
      const periods = ['today', 'yesterday', 'this_week', 'this_month'];

      for (const period of periods) {
        const response = await axios.get(`${API_BASE_URL}${API_PATH}/overview`, {
          params: { period }
        });

        expect(response.status).toBe(200);
        expect(response.data.period).toHaveProperty('start');
        expect(response.data.period).toHaveProperty('end');
        expect(response.data.period).toHaveProperty('label');
      }
    });
  });

  describe('GET /budget', () => {
    it('should return budget status with correct structure', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/budget`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('monthly_limit');
      expect(response.data).toHaveProperty('used');
      expect(response.data).toHaveProperty('percentage');
      expect(response.data).toHaveProperty('remaining');
      expect(response.data).toHaveProperty('alert_threshold');
      expect(response.data).toHaveProperty('is_alert');
    });

    it('should calculate budget percentage correctly', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/budget`);
      const { used, monthly_limit, percentage } = response.data;

      const expectedPercentage = monthly_limit > 0
        ? Math.round((used / monthly_limit) * 100)
        : 0;

      expect(percentage).toBe(expectedPercentage);
    });

    it('should calculate remaining budget correctly', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/budget`);
      const { used, monthly_limit, remaining } = response.data;

      expect(remaining).toBe(monthly_limit - used);
    });

    it('should set alert flag when threshold exceeded', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/budget`);
      const { percentage, alert_threshold, is_alert } = response.data;

      if (percentage >= alert_threshold) {
        expect(is_alert).toBe(true);
      } else {
        expect(is_alert).toBe(false);
      }
    });
  });

  describe('PUT /budget', () => {
    it('should update budget settings', async () => {
      const newSettings = {
        monthly_limit: 300,
        alert_threshold: 75
      };

      const response = await axios.put(
        `${API_BASE_URL}${API_PATH}/budget`,
        newSettings
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should validate budget limit is positive', async () => {
      try {
        await axios.put(`${API_BASE_URL}${API_PATH}/budget`, {
          monthly_limit: -100
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    it('should validate alert threshold is between 0-100', async () => {
      try {
        await axios.put(`${API_BASE_URL}${API_PATH}/budget`, {
          alert_threshold: 150
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('GET /trend', () => {
    it('should return daily trend data', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/trend`, {
        params: { period: 'daily' }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('period');
      expect(response.data.period).toBe('daily');
      expect(response.data).toHaveProperty('trend');
      expect(Array.isArray(response.data.trend)).toBe(true);
    });

    it('should return monthly trend data', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/trend`, {
        params: { period: 'monthly' }
      });

      expect(response.status).toBe(200);
      expect(response.data.period).toBe('monthly');
      expect(Array.isArray(response.data.trend)).toBe(true);
    });

    it('should have correct trend data structure', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/trend`, {
        params: { period: 'daily' }
      });

      if (response.data.trend.length > 0) {
        const firstItem = response.data.trend[0];
        expect(firstItem).toHaveProperty('date');
        expect(firstItem).toHaveProperty('answer_coding');
        expect(firstItem).toHaveProperty('codeframe_generation');
        expect(firstItem).toHaveProperty('total');
      }
    });
  });

  describe('GET /detailed', () => {
    it('should return paginated detailed data', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/detailed`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('items');
      expect(response.data).toHaveProperty('pagination');
      expect(Array.isArray(response.data.items)).toBe(true);
    });

    it('should have correct pagination structure', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/detailed`);
      const { pagination } = response.data;

      expect(pagination).toHaveProperty('current_page');
      expect(pagination).toHaveProperty('total_pages');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('limit');
    });

    it('should support pagination parameters', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/detailed`, {
        params: { page: 1, limit: 10 }
      });

      expect(response.status).toBe(200);
      expect(response.data.pagination.current_page).toBe(1);
      expect(response.data.pagination.limit).toBe(10);
    });

    it('should filter by feature type', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/detailed`, {
        params: { feature_type: 'answer_coding' }
      });

      expect(response.status).toBe(200);

      // All items should be answer_coding
      response.data.items.forEach(item => {
        expect(item.feature_type).toBe('answer_coding');
      });
    });

    it('should have correct item structure', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/detailed`);

      if (response.data.items.length > 0) {
        const firstItem = response.data.items[0];
        expect(firstItem).toHaveProperty('id');
        expect(firstItem).toHaveProperty('feature_type');
        expect(firstItem).toHaveProperty('model');
        expect(firstItem).toHaveProperty('input_tokens');
        expect(firstItem).toHaveProperty('output_tokens');
        expect(firstItem).toHaveProperty('cost_usd');
        expect(firstItem).toHaveProperty('created_at');
        expect(firstItem).toHaveProperty('description');
      }
    });
  });

  describe('GET /predictions', () => {
    it('should return end-of-month predictions', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/predictions`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('current_total');
      expect(response.data).toHaveProperty('daily_average');
      expect(response.data).toHaveProperty('days_remaining');
      expect(response.data).toHaveProperty('projected_end_of_month');
      expect(response.data).toHaveProperty('confidence');
    });

    it('should have valid confidence level', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/predictions`);
      const validLevels = ['high', 'medium', 'low', 'none'];

      expect(validLevels).toContain(response.data.confidence);
    });

    it('should calculate projection correctly', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/predictions`);
      const { current_total, daily_average, days_remaining, projected_end_of_month } = response.data;

      const expectedProjection = current_total + (daily_average * days_remaining);

      // Allow for small floating point differences
      expect(Math.abs(projected_end_of_month - expectedProjection)).toBeLessThan(0.01);
    });
  });

  describe('GET /export', () => {
    it('should export CSV data', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/export`, {
        responseType: 'text'
      });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should have correct CSV headers', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/export`, {
        responseType: 'text'
      });

      const firstLine = response.data.split('\n')[0];

      expect(firstLine).toContain('Date');
      expect(firstLine).toContain('Feature');
      expect(firstLine).toContain('Model');
      expect(firstLine).toContain('Input Tokens');
      expect(firstLine).toContain('Output Tokens');
      expect(firstLine).toContain('Cost (USD)');
    });
  });

  describe('Data Consistency', () => {
    it('overview total should match sum of breakdowns', async () => {
      const response = await axios.get(`${API_BASE_URL}${API_PATH}/overview`);
      const { total_cost_usd, breakdown } = response.data;

      const sum = breakdown.answer_coding.cost_usd + breakdown.codeframe_generation.cost_usd;

      // Allow for small floating point differences
      expect(Math.abs(total_cost_usd - sum)).toBeLessThan(0.01);
    });

    it('budget used should match overview total for current month', async () => {
      const [overviewRes, budgetRes] = await Promise.all([
        axios.get(`${API_BASE_URL}${API_PATH}/overview`, {
          params: { period: 'this_month' }
        }),
        axios.get(`${API_BASE_URL}${API_PATH}/budget`)
      ]);

      const overviewTotal = overviewRes.data.total_cost_usd;
      const budgetUsed = budgetRes.data.used;

      // Should be identical
      expect(Math.abs(overviewTotal - budgetUsed)).toBeLessThan(0.01);
    });
  });
});
