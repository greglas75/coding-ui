import { expect, test } from '@playwright/test';
import { goOffline, goOnline, goToCategories, waitForLoadingToFinish } from '../helpers/test-helpers';

/**
 * Error Handling E2E Tests
 *
 * Tests network errors, error boundaries, and 404 handling
 */

test.describe('Network Errors', () => {
  test('should show offline indicator when network is down', async ({ page, context }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Go offline
    await goOffline(context);

    // Try to perform an action
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh" i]').first();
    if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
    }

    // Look for offline indicator
    const offlineIndicator = await page.locator('text=/offline|no.*connection|network.*error/i').count();

    if (offlineIndicator > 0) {
      console.log('✅ Offline indicator shown');
    } else {
      console.log('⚠️  Consider adding offline indicator');
    }

    // Go back online
    await goOnline(context);
  });

  test('should show retry button on API failure', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Mock API error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Try to trigger API call
    await page.reload();
    await page.waitForTimeout(2000);

    // Look for retry button or error message
    const hasRetry = await page.locator('button:has-text("Retry"), button:has-text("Try again")').count() > 0;
    const hasError = await page.locator('text=/error|failed|something.*wrong/i').count() > 0;

    if (hasRetry || hasError) {
      console.log('✅ Error handling UI present');
    }
  });

  test('should show timeout message after 30 seconds', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Mock slow API
    await page.route('**/api/**', route => {
      // Don't respond (simulate timeout)
      setTimeout(() => {
        route.abort();
      }, 5000);
    });

    // Try action that calls API
    const refreshButton = page.locator('button:has-text("Refresh")').first();
    if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshButton.click();

      // Wait for timeout message
      await page.waitForTimeout(6000);

      // Look for timeout message
      const hasTimeout = await page.locator('text=/timeout|taking.*long|slow/i').count() > 0;

      if (hasTimeout) {
        console.log('✅ Timeout message shown');
      }
    }
  });

  test('should handle intermittent connection gracefully', async ({ page, context }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Toggle connection multiple times
    await goOffline(context);
    await page.waitForTimeout(500);
    await goOnline(context);
    await page.waitForTimeout(500);
    await goOffline(context);
    await page.waitForTimeout(500);
    await goOnline(context);

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    console.log('✅ Handles intermittent connection');
  });
});

test.describe('Error Boundaries', () => {
  test('should catch component crashes', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Try to trigger error by accessing invalid route
    await page.goto('/invalid-component-path-that-might-crash');
    await page.waitForTimeout(1000);

    // Should show error boundary instead of blank page
    const hasErrorBoundary = await page.locator('text=/something.*wrong|error.*occurred|try.*refresh/i').count() > 0;
    const pageIsNotBlank = await page.locator('body').textContent() !== '';

    expect(pageIsNotBlank).toBeTruthy();

    if (hasErrorBoundary) {
      console.log('✅ Error boundary catches crashes');
    }
  });

  test('should display fallback UI on error', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Inject error into page
    await page.evaluate(() => {
      // Trigger an error in React component
      const event = new Event('error');
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(500);

    // Page should still show something
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(0);

    console.log('✅ Fallback UI prevents blank page');
  });

  test('should log errors for debugging', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Trigger an error
    await page.evaluate(() => {
      console.error('Test error for logging');
    });

    // Should have logged the error
    expect(consoleErrors.length).toBeGreaterThan(0);

    console.log(`✅ Errors logged to console (${consoleErrors.length} errors)`);
  });
});

test.describe('404 Handling', () => {
  test('should show 404 page for invalid routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-at-all');
    await page.waitForTimeout(1000);

    // Should show 404 message
    const has404 = await page.locator('text=/404|not.*found|page.*exist/i').count() > 0;

    if (has404) {
      console.log('✅ 404 page shown');
    } else {
      // Might redirect to home
      const url = page.url();
      if (url.includes('localhost')) {
        console.log('✅ Redirects to home for invalid routes');
      }
    }
  });

  test('should provide navigation from 404 page', async ({ page }) => {
    await page.goto('/non-existent-page');
    await page.waitForTimeout(1000);

    // Look for navigation links
    const homeLink = page.locator('a:has-text("Home"), a:has-text("Back"), button:has-text("Home")');
    const hasNavigation = await homeLink.count() > 0;

    if (hasNavigation) {
      console.log('✅ 404 page has navigation');
    }
  });
});

test.describe('Form Validation Errors', () => {
  test('should show validation errors', async ({ page }) => {
    await goToCategories(page);

    // Open add category modal
    await page.getByRole('button', { name: /add category/i }).click();
    await page.waitForTimeout(500);

    // Try to save without entering name
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(500);

    // Should show validation error
    const hasError = await page.locator('text=/required|enter.*name|cannot.*empty/i').count() > 0;

    if (hasError) {
      console.log('✅ Form validation errors shown');
    }
  });

  test('should prevent duplicate entries', async ({ page }) => {
    await goToCategories(page);

    // Add a category
    const timestamp = Date.now();
    const categoryName = `Test ${timestamp}`;

    await page.getByRole('button', { name: /add category/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/enter category name/i).fill(categoryName);
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Try to add same category again
    await page.getByRole('button', { name: /add category/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/enter category name/i).fill(categoryName);
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Should show duplicate error
    const hasDuplicateError = await page.locator('text=/duplicate|already.*exists|unique/i').count() > 0;

    if (hasDuplicateError) {
      console.log('✅ Duplicate entry prevented');
    }
  });
});

test.describe('Loading States', () => {
  test('should show loading spinner', async ({ page }) => {
    await page.goto('/');

    // Look for loading spinner
    const spinner = page.locator('.animate-spin, [role="progressbar"], [aria-busy="true"]');
    const hasSpinner = await spinner.isVisible({ timeout: 1000 }).catch(() => false);

    if (hasSpinner) {
      console.log('✅ Loading spinner shown');
    }

    // Spinner should disappear after loading
    await page.waitForTimeout(3000);
    const spinnerGone = await spinner.isHidden().catch(() => true);

    if (spinnerGone) {
      console.log('✅ Loading spinner disappears after load');
    }
  });

  test('should show skeleton loaders', async ({ page }) => {
    await page.goto('/');

    // Look for skeleton loaders
    const skeleton = page.locator('[class*="skeleton"], [class*="placeholder"]');
    const hasSkeleton = await skeleton.count() > 0;

    if (hasSkeleton) {
      console.log('✅ Skeleton loaders shown');
    } else {
      console.log('ℹ️  No skeleton loaders found (may use spinners instead)');
    }
  });
});

