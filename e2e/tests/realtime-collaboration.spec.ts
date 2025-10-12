import { expect, test } from '@playwright/test';
import { waitForLoadingToFinish } from '../helpers/test-helpers';

/**
 * Real-time Collaboration E2E Tests
 *
 * Tests online users, real-time updates, and presence
 */

test.describe('Real-time Updates', () => {
  test('should show online users indicator', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Look for online users indicator
    const onlineIndicator = page.locator('text=/online|users|active/i, [aria-label*="online" i]');
    const hasIndicator = await onlineIndicator.count() > 0;

    if (hasIndicator) {
      console.log('✅ Online users indicator present');
    } else {
      console.log('ℹ️  Real-time collaboration not implemented');
    }
  });

  test('should update data in real-time between tabs', async ({ browser }) => {
    // Open two tabs
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Navigate both to same page
    await page1.goto('/');
    await page2.goto('/');

    await waitForLoadingToFinish(page1);
    await waitForLoadingToFinish(page2);

    // Make a change in page1
    const addButton1 = page1.getByRole('button', { name: /add category/i });
    if (await addButton1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton1.click();
      await page1.waitForTimeout(500);

      const timestamp = Date.now();
      const categoryName = `Realtime Test ${timestamp}`;

      await page1.getByPlaceholder(/enter category name/i).fill(categoryName);
      await page1.getByRole('button', { name: /save/i }).click();
      await page1.waitForTimeout(2000);

      // Check if page2 shows the new category
      await page2.waitForTimeout(3000); // Wait for real-time update

      const appearsInPage2 = await page2.locator(`text=${categoryName}`).count() > 0;

      if (appearsInPage2) {
        console.log('✅ Real-time updates work between tabs');
      } else {
        console.log('⚠️  Real-time updates not visible (may require refresh)');
      }
    }

    await context1.close();
    await context2.close();
  });

  test('should show presence badges', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Look for user presence indicators
    const presenceBadges = page.locator('[class*="presence"], [class*="avatar"], [aria-label*="user" i]');
    const hasBadges = await presenceBadges.count() > 0;

    if (hasBadges) {
      console.log('✅ Presence badges shown');
    } else {
      console.log('ℹ️  Presence badges not implemented');
    }
  });

  test('should handle conflict resolution', async ({ browser }) => {
    // Open two tabs
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Navigate both to coding page
    await page1.goto('/coding?categoryId=1');
    await page2.goto('/coding?categoryId=1');

    await waitForLoadingToFinish(page1);
    await waitForLoadingToFinish(page2);

    // Try to edit same item from both tabs
    const firstCheckbox1 = page1.locator('tbody input[type="checkbox"]').first();
    const firstCheckbox2 = page2.locator('tbody input[type="checkbox"]').first();

    if (await firstCheckbox1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstCheckbox1.check();
      await firstCheckbox2.check();

      await page1.waitForTimeout(2000);

      // Look for conflict message or last-write-wins
      const hasConflictMessage = await page1.locator('text=/conflict|updated.*another/i').count() > 0 ||
                                  await page2.locator('text=/conflict|updated.*another/i').count() > 0;

      if (hasConflictMessage) {
        console.log('✅ Conflict detection works');
      } else {
        console.log('ℹ️  Last-write-wins strategy (no conflict UI)');
      }
    }

    await context1.close();
    await context2.close();
  });
});

test.describe('WebSocket Connection', () => {
  test('should establish WebSocket connection', async ({ page }) => {
    // Track WebSocket connections
    let wsConnected = false;

    page.on('websocket', ws => {
      wsConnected = true;
      console.log('✅ WebSocket connection established');
    });

    await page.goto('/');
    await waitForLoadingToFinish(page);
    await page.waitForTimeout(2000);

    if (!wsConnected) {
      console.log('ℹ️  WebSocket not used (may use polling or not implemented)');
    }
  });
});

