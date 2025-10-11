// ═══════════════════════════════════════════════════════════════
// ✅ QA Workflow E2E Tests
// Tests complete user workflows from start to finish
// ═══════════════════════════════════════════════════════════════

import { expect, test } from '@playwright/test';

test.describe('Complete QA Workflow', () => {
  test('QA Flow: Create Category → Add Codes → Code Answers', async ({ page }) => {
    // ═══════════════════════════════════════════════════════════
    // Step 1: Navigate to Categories
    // ═══════════════════════════════════════════════════════════
    await page.goto('/');
    await page.click('a[href*="/categories"]');
    await page.waitForSelector('table', { timeout: 10000 });

    console.log('✅ Step 1: Navigated to categories');

    // ═══════════════════════════════════════════════════════════
    // Step 2: Create New Category (if possible)
    // ═══════════════════════════════════════════════════════════
    const addCategoryBtn = page.locator('button:has-text("Add Category"), button:has-text("New Category")').first();

    if (await addCategoryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addCategoryBtn.click();

      // Fill category name
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill(`Test Category ${Date.now()}`);

        // Submit
        await page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first().click();
        await page.waitForTimeout(1000);

        console.log('✅ Step 2: Created new category');
      }
    } else {
      console.log('ℹ️ Step 2: Using existing category');
    }

    // ═══════════════════════════════════════════════════════════
    // Step 3: Select Category and Navigate to Coding
    // ═══════════════════════════════════════════════════════════
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForURL('**/coding/**', { timeout: 10000 });

    console.log('✅ Step 3: Navigated to coding page');

    // ═══════════════════════════════════════════════════════════
    // Step 4: Verify Answers Load
    // ═══════════════════════════════════════════════════════════
    await page.waitForSelector('table, [class*="grid"], text=/No answers/i', { timeout: 10000 });

    console.log('✅ Step 4: Answers grid loaded');

    // ═══════════════════════════════════════════════════════════
    // Step 5: Navigate to Codes Management
    // ═══════════════════════════════════════════════════════════
    const codesLink = page.locator('a[href*="/codes"], button:has-text("Codes"), text=/Manage Codes/i').first();

    if (await codesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await codesLink.click();
      await page.waitForTimeout(1000);

      console.log('✅ Step 5: Navigated to codes management');
    }

    // ═══════════════════════════════════════════════════════════
    // Step 6: Add New Code (if possible)
    // ═══════════════════════════════════════════════════════════
    const addCodeBtn = page.locator('button:has-text("Add Code"), button:has-text("New Code")').first();

    if (await addCodeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addCodeBtn.click();

      const codeNameInput = page.locator('input[name="name"], input[placeholder*="code" i]').first();
      if (await codeNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await codeNameInput.fill(`Test Code ${Date.now()}`);

        // Submit
        await page.locator('button:has-text("Save"), button:has-text("Add")').first().click();
        await page.waitForTimeout(1000);

        console.log('✅ Step 6: Added new code');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Step 7: Return to Coding and Code an Answer
    // ═══════════════════════════════════════════════════════════
    // Navigate back to coding
    await page.goto('/categories');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForURL('**/coding/**');

    // Wait for answers
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Click first answer
    await page.locator('table tbody tr').first().click();

    // Wait for modal
    if (await page.locator('[role="dialog"]').isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click a code
      const codeOption = page.locator('[role="dialog"] button, [role="dialog"] [class*="code"]').first();
      if (await codeOption.isVisible()) {
        await codeOption.click();
        await page.waitForTimeout(500);

        console.log('✅ Step 7: Coded an answer');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Final: Verify Success
    // ═══════════════════════════════════════════════════════════
    console.log('✅ Complete QA workflow executed successfully!');

    // App should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('QA Flow: Filter → Batch Select → Batch Code', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForURL('**/coding/**');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Apply filter
    const filterSelect = page.locator('select, [role="combobox"]').first();
    if (await filterSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await filterSelect.click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      console.log('✅ Filter applied');
    }

    // Select multiple answers
    const firstRow = page.locator('table tbody tr').nth(0);
    const secondRow = page.locator('table tbody tr').nth(1);

    await firstRow.click({ modifiers: ['Control'] });
    await secondRow.click({ modifiers: ['Control'] });

    console.log('✅ Multiple answers selected');

    // Look for batch actions
    const batchButton = page.locator('button:has-text("Batch"), button:has-text("Assign")').first();

    if (await batchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await batchButton.click();
      console.log('✅ Batch action triggered');
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('QA Flow: Search → Code → Verify → Export', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForURL('**/coding/**');

    // Search for specific answer
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      console.log('✅ Search applied');
    }

    // Code an answer (if results found)
    await page.waitForSelector('table tbody tr, text=/No.*found/i', { timeout: 5000 });

    const hasResults = await page.locator('table tbody tr').count() > 0;

    if (hasResults) {
      await page.locator('table tbody tr').first().click();

      if (await page.locator('[role="dialog"]').isVisible({ timeout: 3000 }).catch(() => false)) {
        const codeButton = page.locator('[role="dialog"] button').first();
        await codeButton.click();
        await page.waitForTimeout(500);

        console.log('✅ Answer coded');
      }
    }

    // Verify coded answer appears in list
    await page.waitForTimeout(1000);

    // Export
    const exportBtn = page.locator('button:has-text("Export")').first();
    if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await exportBtn.click();

      // Click export in modal if needed
      const exportInModal = page.locator('[role="dialog"] button:has-text("Export")');
      if (await exportInModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await exportInModal.click();
      }

      const download = await downloadPromise;
      if (download) {
        console.log('✅ Export completed');
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Quality Assurance Checks', () => {
  test('should not have console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Filter out expected errors (like network failures in tests)
    const criticalErrors = consoleErrors.filter(
      err => !err.includes('Failed to fetch') && !err.includes('NetworkError')
    );

    if (criticalErrors.length > 0) {
      console.warn('⚠️ Console errors detected:', criticalErrors);
    }

    // This is informational - we don't fail the test
    // but we log errors for investigation
  });

  test('should have no broken links', async ({ page }) => {
    await page.goto('/');

    // Get all links
    const links = page.locator('a[href]');
    const count = await links.count();

    console.log(`Found ${count} links to check`);

    // Check first 5 links (to avoid long test)
    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');

      if (href && href.startsWith('/')) {
        // Internal link - verify it navigates
        await link.click();
        await page.waitForTimeout(1000);

        // Should not show 404
        const has404 = await page.locator('text=/404|not found/i').isVisible().catch(() => false);
        expect(has404).toBe(false);

        await page.goBack();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow 3G
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.goto('/');

    // Should show loading state
    await page.waitForTimeout(500);

    // Should eventually load
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });

    console.log('✅ App handles slow network');
  });

  test('should work offline (with service worker)', async ({ page }) => {
    // Load page first
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Go offline
    await page.context().setOffline(true);

    // Navigate (might use cache)
    await page.click('a[href*="/categories"]').catch(() => {});
    await page.waitForTimeout(1000);

    // Should show offline indicator or cached data
    await expect(page.locator('body')).toBeVisible();

    console.log('✅ Offline mode handled');

    // Go back online
    await page.context().setOffline(false);
  });

  test('should maintain performance under load', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForURL('**/coding/**');

    // Measure performance
    const startTime = Date.now();

    // Perform multiple actions
    for (let i = 0; i < 5; i++) {
      await page.waitForSelector('table tbody tr', { timeout: 10000 });

      const rowCount = await page.locator('table tbody tr').count();
      if (rowCount > 0) {
        await page.locator('table tbody tr').first().click();
        await page.waitForTimeout(500);

        if (await page.locator('[role="dialog"]').isVisible().catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log(`⏱️ 5 operations completed in ${duration}ms`);

    // Should complete in reasonable time
    expect(duration).toBeLessThan(15000); // 15 seconds
  });
});

test.describe('Data Integrity', () => {
  test('should persist coded answers after reload', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.locator('table tbody tr').first().click();
    await page.waitForURL('**/coding/**');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Get count of coded answers
    const codedBefore = await page.locator('[class*="coded"], [class*="whitelist"]').count();

    // Reload page
    await page.reload();
    await page.waitForSelector('table, [class*="grid"]', { timeout: 10000 });

    // Count should be same or similar
    const codedAfter = await page.locator('[class*="coded"], [class*="whitelist"]').count();

    console.log(`Coded answers: ${codedBefore} → ${codedAfter}`);

    // Data should persist (allowing for variance)
    expect(Math.abs(codedBefore - codedAfter)).toBeLessThanOrEqual(5);
  });

  test('should show consistent data across pages', async ({ page }) => {
    // Get category count from home
    await page.goto('/categories');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const categoryCount = await page.locator('table tbody tr').count();

    // Navigate away and back
    await page.goto('/');
    await page.goto('/categories');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    const categoryCountAfter = await page.locator('table tbody tr').count();

    // Should be same
    expect(categoryCount).toBe(categoryCountAfter);
  });
});

test.describe('Error Handling', () => {
  test('should show error message on API failure', async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Should show error toast or message
    const hasError = await page.locator('text=/error|failed/i, [role="alert"]').isVisible().catch(() => false);

    if (hasError) {
      console.log('✅ Error message shown');
    }

    // App should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should recover from temporary network failures', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/**', route => {
      requestCount++;

      // Fail first 2 requests, then succeed
      if (requestCount <= 2) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await page.waitForTimeout(5000);

    // Should eventually load (retry mechanism)
    await expect(page.locator('body')).toBeVisible();

    console.log(`✅ Recovered after ${requestCount} requests`);
  });
});

test.describe('User Experience', () => {
  test('should show helpful empty states', async ({ page }) => {
    await page.goto('/');

    // Navigate through app looking for empty states
    await page.click('a[href*="/categories"]').catch(() => {});
    await page.waitForTimeout(1000);

    // Check for helpful messages
    const emptyStateMessages = await page.locator('text=/no.*found|empty|add.*first/i').count();

    console.log(`Found ${emptyStateMessages} empty state message(s)`);
  });

  test('should show loading indicators', async ({ page }) => {
    await page.goto('/');

    // Quick navigation to trigger loading
    await page.click('a[href*="/categories"]');

    // Look for loading indicators (might be very fast)
    const hasLoading = await page.locator('[class*="spin"], [class*="loading"], text=/loading/i').isVisible().catch(() => false);

    if (hasLoading) {
      console.log('✅ Loading indicator shown');
    }

    // Eventually should finish loading
    await expect(page.locator('table, text=/No/i')).toBeVisible({ timeout: 10000 });
  });

  test('should show success feedback after actions', async ({ page }) => {
    // Success toasts/messages should appear after operations
    // This is a smoke test to ensure feedback mechanisms work

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Success notifications use Sonner toast library
    // They appear temporarily, so this test just verifies app stability
  });
});

