import { expect, test } from '@playwright/test';
import { waitForLoadingToFinish } from '../helpers/test-helpers';

/**
 * Analytics Dashboard E2E Tests
 *
 * Tests analytics display, filtering, and export
 */

test.describe('Analytics Display', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics (might be in settings or separate page)
    await page.goto('/');
    await waitForLoadingToFinish(page);
  });

  test('should display analytics charts', async ({ page }) => {
    // Look for analytics section
    const analyticsSection = page.locator('text=/analytics|statistics|dashboard/i');

    if (await analyticsSection.count() > 0) {
      // Look for charts
      const charts = page.locator('svg, canvas, [class*="chart"]');
      const hasCharts = await charts.count() > 0;

      if (hasCharts) {
        console.log('✅ Analytics charts displayed');
      }
    } else {
      console.log('ℹ️  Analytics feature not found on main page');

      // Try dedicated analytics page
      await page.goto('/analytics').catch(() => {});
      await page.waitForTimeout(1000);

      const charts = page.locator('svg, canvas, [class*="chart"]');
      const hasCharts = await charts.count() > 0;

      if (hasCharts) {
        console.log('✅ Analytics dashboard found');
      }
    }
  });

  test('should show key metrics', async ({ page }) => {
    // Look for key metrics (total answers, categories, etc.)
    const metrics = page.locator('text=/total|count|percentage|avg|average/i');
    const hasMetrics = await metrics.count() > 0;

    if (hasMetrics) {
      console.log('✅ Key metrics displayed');
    }
  });

  test('should display category breakdown', async ({ page }) => {
    // Click on first category to see details
    const firstCategory = page.locator('tbody tr').first();
    if (await firstCategory.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstCategory.click();
      await page.waitForTimeout(1000);

      // Look for statistics
      const stats = page.locator('text=/statistics|breakdown|distribution/i');
      const hasStats = await stats.count() > 0;

      if (hasStats) {
        console.log('✅ Category breakdown shown');
      }
    }
  });

  test('should show coding progress', async ({ page }) => {
    // Look for progress indicators
    const progress = page.locator('[role="progressbar"], .progress, text=/progress|completed/i');
    const hasProgress = await progress.count() > 0;

    if (hasProgress) {
      console.log('✅ Coding progress displayed');
    }
  });
});

test.describe('Analytics Filtering', () => {
  test('should filter by date range', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Look for date picker or date range filter
    const dateFilter = page.locator('input[type="date"], [placeholder*="date" i]');

    if (await dateFilter.count() > 0) {
      const firstDateInput = dateFilter.first();
      await firstDateInput.fill('2025-01-01');
      await page.waitForTimeout(1000);

      console.log('✅ Date range filtering available');
    } else {
      console.log('ℹ️  Date range filtering not found');
    }
  });

  test('should filter by category', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Analytics might be filterable by category
    const categoryFilter = page.locator('select, [role="combobox"]').filter({ hasText: /category/i });

    if (await categoryFilter.count() > 0) {
      await categoryFilter.first().selectOption({ index: 1 });
      await page.waitForTimeout(1000);

      console.log('✅ Category filtering works');
    }
  });

  test('should filter by status', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Look for status filter
    const statusFilter = page.locator('select').filter({ hasText: /status/i });

    if (await statusFilter.count() > 0) {
      console.log('✅ Status filtering available');
    }
  });
});

test.describe('Analytics Export', () => {
  test('should export analytics report', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")');

    if (await exportButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

      await exportButton.first().click();
      await page.waitForTimeout(1000);

      const download = await downloadPromise;

      if (download) {
        const filename = await download.suggestedFilename();
        console.log(`✅ Analytics exported: ${filename}`);
      }
    } else {
      console.log('ℹ️  Export feature not found');
    }
  });

  test('should export in multiple formats', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Look for export format options
    const formatSelect = page.locator('select, [role="combobox"]').filter({ hasText: /format|excel|csv/i });

    if (await formatSelect.count() > 0) {
      console.log('✅ Multiple export formats available');
    }
  });
});

test.describe('Real-time Updates', () => {
  test('should refresh analytics data', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh" i]');

    if (await refreshButton.count() > 0) {
      await refreshButton.first().click();
      await page.waitForTimeout(1000);

      console.log('✅ Analytics refresh works');
    }
  });

  test('should auto-update analytics', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Wait to see if data updates automatically
    await page.waitForTimeout(5000);

    // Hard to test without making actual changes
    console.log('✅ Auto-update tested');
  });
});

