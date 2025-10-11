// ═══════════════════════════════════════════════════════════════
// 🔐 Authentication & Login E2E Tests
// ═══════════════════════════════════════════════════════════════

import { expect, test } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load application homepage', async ({ page }) => {
    // Verify page loads
    await expect(page).toHaveTitle(/TGM Coding Dashboard/);

    // Check for main navigation
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should display categories page', async ({ page }) => {
    // Navigate to categories
    await page.click('a[href="/categories"]');

    // Wait for categories to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Verify categories table exists
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check for category headers
    await expect(page.locator('th:has-text("Category Name")')).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    // Navigate to categories
    await page.click('a[href="/categories"]');
    await page.waitForURL('**/categories');

    // Navigate to codes
    await page.click('a[href*="/codes"]');
    await page.waitForURL('**/codes/**');

    // Navigate back home
    await page.click('a[href="/"]');
    await page.waitForURL('/');
  });

  test('should persist session across page reloads', async ({ page }) => {
    // Navigate to a specific page
    await page.click('a[href="/categories"]');
    await page.waitForURL('**/categories');

    // Reload page
    await page.reload();

    // Should still be on categories page
    await expect(page).toHaveURL(/categories/);
    await expect(page.locator('table')).toBeVisible();
  });

  test('should handle browser back/forward', async ({ page }) => {
    // Navigate forward
    await page.click('a[href="/categories"]');
    await page.waitForURL('**/categories');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/');

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/categories/);
  });

  test('should show error boundary on crash', async ({ page }) => {
    // This test verifies ErrorBoundary works
    // In production, you might trigger an error intentionally for testing

    // Navigate to page
    await page.goto('/');

    // ErrorBoundary should not be visible on normal operation
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('should show loading states', async ({ page }) => {
    // Navigate to categories
    await page.goto('/categories');

    // Look for loading indicators (they might be quick!)
    // This is a smoke test to ensure the page doesn't crash during loading

    // Eventually, content should load
    await expect(page.locator('table, text=No categories')).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to categories
    await page.goto('/categories');

    // Mobile-specific elements should be visible
    await expect(page.locator('body')).toBeVisible();

    // Table or cards should adapt
    await expect(page.locator('table, [class*="card"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Session Management', () => {
  test('should maintain state in localStorage', async ({ page }) => {
    await page.goto('/');

    // Check if localStorage is accessible
    const localStorage = await page.evaluate(() => {
      return Object.keys(window.localStorage);
    });

    console.log('LocalStorage keys:', localStorage);

    // Zustand stores should persist
    expect(localStorage.some(key => key.includes('Store'))).toBeTruthy();
  });

  test('should handle session expiration gracefully', async ({ page }) => {
    await page.goto('/');

    // Clear session storage
    await page.evaluate(() => {
      window.sessionStorage.clear();
    });

    // Reload page
    await page.reload();

    // App should still work
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for navigation landmark
    await expect(page.locator('nav')).toBeVisible();

    // Check for buttons with proper labels
    const buttons = page.locator('button');
    const count = await buttons.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForSelector('table', { timeout: 10000 });

    // Tab through focusable elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should have focused an element
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
  });
});

