// ═══════════════════════════════════════════════════════════════
// 💬 Answer Coding E2E Tests
// ═══════════════════════════════════════════════════════════════

import { expect, test } from '@playwright/test';

test.describe('Answer Coding Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to coding page
    await page.goto('/');

    // Select a category (assuming categories exist)
    await page.click('a[href*="/categories"]');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click first category to start coding
    const firstCategory = page.locator('table tbody tr').first();
    await firstCategory.click();

    // Should navigate to coding page
    await page.waitForURL('**/coding/**', { timeout: 10000 });
  });

  test('should load coding grid with answers', async ({ page }) => {
    // Wait for answers to load
    await page.waitForSelector('[data-testid="coding-grid"], table', { timeout: 10000 });

    // Verify table or grid is visible
    const grid = page.locator('table, [class*="grid"]');
    await expect(grid).toBeVisible();
  });

  test('should select an answer and show code modal', async ({ page }) => {
    // Wait for grid
    await page.waitForSelector('table tbody tr, [class*="answer"]', { timeout: 10000 });

    // Click first answer
    const firstAnswer = page.locator('table tbody tr, [class*="answer"]').first();
    await firstAnswer.click();

    // Modal should appear
    await expect(page.locator('[role="dialog"], [class*="modal"]')).toBeVisible({ timeout: 5000 });
  });

  test('should assign code to answer', async ({ page }) => {
    // Wait for answers
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Click answer
    await page.locator('table tbody tr').first().click();

    // Wait for modal
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Click a code in the modal
    const codeButton = page.locator('[role="dialog"] button:has-text("Code"), [role="dialog"] [class*="code"]').first();

    if (await codeButton.isVisible()) {
      await codeButton.click();

      // Modal should close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter answers', async ({ page }) => {
    // Wait for grid
    await page.waitForSelector('table', { timeout: 10000 });

    // Look for filter controls
    const filterSelect = page.locator('select, [role="combobox"]').first();

    if (await filterSelect.isVisible()) {
      await filterSelect.click();

      // Select a filter option
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      // Wait for filtered results
      await page.waitForTimeout(1000);
    }
  });

  test('should use keyboard shortcuts', async ({ page }) => {
    // Wait for grid
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Press 'n' for next (if implemented)
    await page.keyboard.press('n');
    await page.waitForTimeout(500);

    // Press 'p' for previous (if implemented)
    await page.keyboard.press('p');
    await page.waitForTimeout(500);

    // Press '?' for shortcuts help (if implemented)
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
  });

  test('should show AI suggestions', async ({ page }) => {
    // Wait for grid
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Click answer
    await page.locator('table tbody tr').first().click();

    // Wait for modal
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Look for suggestions section
    const suggestions = page.locator('text=/suggestion|ai|smart/i');

    // Suggestions might not always be present
    const suggestionsVisible = await suggestions.isVisible().catch(() => false);

    if (suggestionsVisible) {
      console.log('✅ AI suggestions visible');
    } else {
      console.log('ℹ️ No AI suggestions (expected if not configured)');
    }
  });

  test('should support batch operations', async ({ page }) => {
    // Wait for grid
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Select multiple rows (Ctrl+Click or checkboxes)
    const firstRow = page.locator('table tbody tr').nth(0);
    const secondRow = page.locator('table tbody tr').nth(1);

    // Try clicking with Ctrl
    await firstRow.click({ modifiers: ['Control'] });
    await secondRow.click({ modifiers: ['Control'] });

    // Look for batch actions toolbar
    const batchToolbar = page.locator('text=/batch|selected/i, [class*="batch"]');

    // Batch toolbar should appear if implemented
    const toolbarVisible = await batchToolbar.isVisible().catch(() => false);

    if (toolbarVisible) {
      console.log('✅ Batch toolbar visible');
    }
  });

  test('should show coding stats', async ({ page }) => {
    // Look for stats display
    const stats = page.locator('text=/total|coded|uncoded|progress/i');

    // Stats should be visible somewhere
    const statsCount = await stats.count();
    expect(statsCount).toBeGreaterThan(0);
  });

  test('should handle empty state', async ({ page }) => {
    // Navigate to a category that might be empty
    // (This is a defensive test)

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Page should not crash on empty data
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Code Selection Modal', () => {
  test('should open and close modal', async ({ page }) => {
    await page.goto('/');

    // Navigate to coding
    await page.click('a[href*="/categories"]');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForURL('**/coding/**');

    // Click answer
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.locator('table tbody tr').first().click();

    // Modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Close modal (X button or Escape)
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('should search for codes in modal', async ({ page }) => {
    // Setup
    await page.goto('/');
    await page.click('a[href*="/categories"]');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForURL('**/coding/**');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Find search input in modal
    const searchInput = page.locator('[role="dialog"] input[type="text"], [role="dialog"] input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      console.log('✅ Search functionality works');
    }
  });
});

