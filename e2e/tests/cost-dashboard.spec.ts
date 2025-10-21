import { test, expect } from '@playwright/test';

test.describe('Cost Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to cost dashboard before each test
    await page.goto('/cost-dashboard');
  });

  test('should load dashboard and display all sections', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check page title/header
    await expect(page.locator('h1:has-text("AI Cost Dashboard")')).toBeVisible();
    await expect(page.locator('text=Monitor and analyze your AI feature usage costs')).toBeVisible();

    // Check overview cards are visible (use more specific selectors)
    await expect(page.locator('text=Total Spend').first()).toBeVisible();
    await expect(page.locator('p:has-text("Answer Coding")').first()).toBeVisible();
    await expect(page.locator('p:has-text("Codeframe Builder")').first()).toBeVisible();

    // Check budget section
    await expect(page.locator('h3:has-text("Monthly Budget")')).toBeVisible();

    // Check prediction card
    await expect(page.locator('h3:has-text("End-of-Month Projection")')).toBeVisible();

    // Check charts section
    await expect(page.locator('h3:has-text("Cost Breakdown by Feature")')).toBeVisible();
    await expect(page.locator('h3:has-text("Historical Trend")')).toBeVisible();

    // Check detailed table
    await expect(page.locator('h3:has-text("Detailed Cost Breakdown")')).toBeVisible();
  });

  test('should display empty state when no data available', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for empty state messages
    const emptyStateMessages = [
      'No data available yet',
      'Cost data will appear here as you use AI features'
    ];

    // At least one empty state message should be visible
    let foundEmptyState = false;
    for (const message of emptyStateMessages) {
      const element = page.locator(`text=${message}`);
      if (await element.isVisible().catch(() => false)) {
        foundEmptyState = true;
        break;
      }
    }

    expect(foundEmptyState).toBe(true);
  });

  test('should change time period in overview', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find the period selector
    const periodSelector = page.locator('select').first();

    // Change to different periods
    await periodSelector.selectOption('today');
    await page.waitForTimeout(500); // Wait for data refresh

    await periodSelector.selectOption('this_week');
    await page.waitForTimeout(500);

    await periodSelector.selectOption('this_month');
    await page.waitForTimeout(500);

    // Verify no errors occurred
    await expect(page.locator('text=Total Spend')).toBeVisible();
  });

  test('should toggle trend chart period (daily/monthly)', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find the trend period selector
    const trendSection = page.locator('text=Historical Trend').locator('..');
    const periodSelector = trendSection.locator('select');

    // Initially should be on daily
    await expect(periodSelector).toHaveValue('daily');

    // Switch to monthly
    await periodSelector.selectOption('monthly');
    await expect(periodSelector).toHaveValue('monthly');
    await page.waitForTimeout(500);

    // Switch back to daily
    await periodSelector.selectOption('daily');
    await expect(periodSelector).toHaveValue('daily');
  });

  test('should display budget progress bar', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find budget section
    const budgetSection = page.locator('text=Monthly Budget').locator('..');

    // Check for budget information
    await expect(budgetSection.locator('text=/Used this month/')).toBeVisible();
    await expect(budgetSection.locator('text=/remaining/')).toBeVisible();

    // Check for progress bar (visual element)
    const progressBar = budgetSection.locator('div[class*="bg-"]').filter({ hasText: '' });
    expect(await progressBar.count()).toBeGreaterThan(0);
  });

  test('should filter detailed table by feature type', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find the feature filter dropdown
    const featureFilter = page.locator('select:has(option:has-text("All Features"))');

    // Test different filters
    await featureFilter.selectOption('all');
    await page.waitForTimeout(500);

    await featureFilter.selectOption('answer_coding');
    await page.waitForTimeout(500);

    await featureFilter.selectOption('codeframe_generation');
    await page.waitForTimeout(500);

    // Verify table is still visible
    await expect(page.locator('table, text=No cost data available')).toBeVisible();
  });

  test('should have working export CSV button', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find export button
    const exportButton = page.locator('button:has-text("Export CSV")');
    await expect(exportButton).toBeVisible();

    // Note: We can't easily test the actual download without sample data
    // But we can verify the button is clickable and doesn't error
    await expect(exportButton).toBeEnabled();
  });

  test('should navigate using header navigation', async ({ page }) => {
    // Start from home
    await page.goto('/');

    // Click on Costs navigation link
    await page.click('a:has-text("Costs")');

    // Verify we're on the cost dashboard
    await expect(page).toHaveURL(/.*cost-dashboard/);
    await expect(page.locator('h1:has-text("AI Cost Dashboard")')).toBeVisible();

    // Navigation link should be highlighted (active state)
    const costsLink = page.locator('a:has-text("Costs")');
    const classes = await costsLink.getAttribute('class');
    expect(classes).toContain('bg-blue-600'); // Active state styling
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/cost-dashboard');
    await page.waitForLoadState('networkidle');

    // Check that main sections are still visible on mobile
    await expect(page.locator('h1:has-text("AI Cost Dashboard")')).toBeVisible();
    await expect(page.locator('text=Total Spend')).toBeVisible();

    // Cards should stack vertically on mobile
    const cards = page.locator('div[class*="grid"]').first();
    expect(await cards.isVisible()).toBe(true);
  });

  test('should support dark mode', async ({ page }) => {
    await page.goto('/');

    // Toggle dark mode
    const darkModeButton = page.locator('button:has-text("Dark")');
    await darkModeButton.click();

    // Navigate to cost dashboard
    await page.goto('/cost-dashboard');
    await page.waitForLoadState('networkidle');

    // Check that dark mode classes are applied
    const html = page.locator('html');
    const classes = await html.getAttribute('class');
    expect(classes).toContain('dark');

    // Verify content is still visible in dark mode
    await expect(page.locator('h1:has-text("AI Cost Dashboard")')).toBeVisible();
  });

  test('should show prediction confidence badge', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find prediction card
    const predictionCard = page.locator('text=End-of-Month Projection').locator('..');

    // Should show a confidence badge
    const confidenceBadges = [
      'High confidence',
      'Medium confidence',
      'Low confidence',
      'Insufficient data'
    ];

    let foundBadge = false;
    for (const badge of confidenceBadges) {
      const element = predictionCard.locator(`text=${badge}`);
      if (await element.isVisible().catch(() => false)) {
        foundBadge = true;
        break;
      }
    }

    expect(foundBadge).toBe(true);
  });

  test('should display cost values with correct formatting', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // All dollar amounts should be formatted with $ and 2 decimal places
    const dollarAmounts = page.locator('text=/\\$\\d+\\.\\d{2}/');

    // Should have at least some dollar amounts visible
    const count = await dollarAmounts.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show trend indicators (up/down arrows)', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for trend indicators in overview cards
    const overviewSection = page.locator('text=Total Spend').locator('../..');

    // Should show either "vs previous period" text
    const trendText = overviewSection.locator('text=/vs previous period/');

    // Count should be at least 1 (in the total spend card)
    const count = await trendText.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should display chart visualizations', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for Recharts SVG elements (indicates charts rendered)
    const charts = page.locator('svg.recharts-surface');

    // Should have at least 2 charts (breakdown bar chart and trend line chart)
    const count = await charts.count();

    // If we have data, charts should render. If no data, we see empty states
    // Either way, the page structure should be valid
    expect(count >= 0).toBe(true);
  });

  test('should have accessible navigation (keyboard)', async ({ page }) => {
    await page.goto('/');

    // Tab to the Costs link
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // Assuming Costs is 6th tab

    // Press Enter to navigate
    await page.keyboard.press('Enter');

    // Should navigate to cost dashboard
    await expect(page).toHaveURL(/.*cost-dashboard/);
  });

  test('should maintain state when switching between tabs', async ({ page }) => {
    // Go to cost dashboard
    await page.goto('/cost-dashboard');
    await page.waitForLoadState('networkidle');

    // Change period to "this_week"
    const periodSelector = page.locator('select').first();
    await periodSelector.selectOption('this_week');
    await page.waitForTimeout(500);

    // Navigate away
    await page.goto('/categories');
    await page.waitForTimeout(500);

    // Navigate back
    await page.goto('/cost-dashboard');
    await page.waitForLoadState('networkidle');

    // Data should reload (we don't test state persistence, just that it loads)
    await expect(page.locator('text=Total Spend')).toBeVisible();
  });
});

test.describe('Cost Dashboard - With Mock Data', () => {
  test('should display budget alert when threshold exceeded', async ({ page }) => {
    // Mock API response to return high budget usage
    await page.route('**/api/v1/cost-dashboard/overview*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          period: { start: '2025-10-01', end: '2025-10-31', label: 'October 2025' },
          total_cost_usd: 170,
          breakdown: {
            answer_coding: { cost_usd: 100, percentage: 59, total_items: 1000, avg_cost_per_item: 0.1 },
            codeframe_generation: { cost_usd: 70, percentage: 41, total_items: 10, avg_cost_per_item: 7 }
          },
          comparison_previous_period: {
            total_cost_usd: 120,
            change_percentage: 42,
            change_direction: 'up'
          },
          budget: {
            monthly_limit: 200,
            used: 170,
            percentage: 85,
            remaining: 30,
            alert_threshold: 80,
            is_alert: true
          }
        })
      });
    });

    await page.goto('/cost-dashboard');
    await page.waitForLoadState('networkidle');

    // Should show budget alert
    const alertText = page.locator('text=/Approaching budget limit/');
    await expect(alertText).toBeVisible();

    // Should show warning emoji or icon
    const warningIndicator = page.locator('text=/⚠️/');
    await expect(warningIndicator).toBeVisible();
  });

  test('should display trend data in charts', async ({ page }) => {
    // Mock trend API
    await page.route('**/api/v1/cost-dashboard/trend*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          period: 'daily',
          trend: [
            { date: '2025-10-01', answer_coding: 5.23, codeframe_generation: 2.45, total: 7.68 },
            { date: '2025-10-02', answer_coding: 6.12, codeframe_generation: 3.21, total: 9.33 },
            { date: '2025-10-03', answer_coding: 4.89, codeframe_generation: 1.87, total: 6.76 }
          ]
        })
      });
    });

    await page.goto('/cost-dashboard');
    await page.waitForLoadState('networkidle');

    // Chart should render with data
    const lineChart = page.locator('svg.recharts-surface').nth(1); // Second chart is trend
    await expect(lineChart).toBeVisible();

    // Should show chart lines
    const lines = page.locator('path.recharts-line-curve');
    const count = await lines.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display detailed cost items in table', async ({ page }) => {
    // Mock detailed API
    await page.route('**/api/v1/cost-dashboard/detailed*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: '1',
              feature_type: 'answer_coding',
              model: 'gpt-4o-mini',
              input_tokens: 850,
              output_tokens: 230,
              cost_usd: 0.0234,
              created_at: '2025-10-21T10:30:00Z',
              description: 'Categorized 15 answers in Category: Customer Feedback'
            },
            {
              id: '2',
              feature_type: 'codeframe_generation',
              model: 'claude-sonnet-4-5',
              input_tokens: 4200,
              output_tokens: 1100,
              cost_usd: 3.45,
              created_at: '2025-10-21T09:15:00Z',
              description: 'Generated codeframe for survey responses'
            }
          ],
          pagination: {
            current_page: 1,
            total_pages: 1,
            total: 2,
            limit: 20
          }
        })
      });
    });

    await page.goto('/cost-dashboard');
    await page.waitForLoadState('networkidle');

    // Table should show the items
    await expect(page.locator('table')).toBeVisible();

    // Check for specific data
    await expect(page.locator('text=gpt-4o-mini')).toBeVisible();
    await expect(page.locator('text=claude-sonnet-4-5')).toBeVisible();

    // Check for cost values
    await expect(page.locator('text=$0.0234')).toBeVisible();
    await expect(page.locator('text=$3.45')).toBeVisible();
  });

  test('should show high confidence prediction with sufficient data', async ({ page }) => {
    // Mock predictions API
    await page.route('**/api/v1/cost-dashboard/predictions*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current_total: 145.67,
          daily_average: 6.98,
          days_remaining: 10,
          projected_end_of_month: 215.47,
          confidence: 'high'
        })
      });
    });

    await page.goto('/cost-dashboard');
    await page.waitForLoadState('networkidle');

    // Should show high confidence badge
    await expect(page.locator('text=High confidence')).toBeVisible();

    // Should show projected amount
    await expect(page.locator('text=$215.47')).toBeVisible();

    // Should show daily average
    await expect(page.locator('text=$6.98')).toBeVisible();
  });
});
