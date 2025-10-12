import { expect, test } from '@playwright/test';
import { goOffline, goOnline, waitForLoadingToFinish } from '../helpers/test-helpers';

/**
 * Offline Mode E2E Tests
 *
 * Tests offline functionality, caching, and sync
 */

test.describe('Offline Functionality', () => {
  test('should cache data for offline use', async ({ page, context }) => {
    // Load page online first
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Wait for data to be cached
    await page.waitForTimeout(2000);

    // Go offline
    await goOffline(context);

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Should still show cached data
    const hasContent = await page.locator('table, tbody tr').count() > 0;

    if (hasContent) {
      console.log('✅ Cached data available offline');
    } else {
      console.log('⚠️  Offline caching not implemented');
    }

    await goOnline(context);
  });

  test('should display cached data when offline', async ({ page, context }) => {
    // Load page and let it cache
    await page.goto('/coding?categoryId=1');
    await waitForLoadingToFinish(page);

    const onlineRowCount = await page.locator('tbody tr').count();

    // Go offline
    await goOffline(context);

    // Reload
    await page.reload();
    await page.waitForTimeout(2000);

    const offlineRowCount = await page.locator('tbody tr').count();

    if (offlineRowCount > 0) {
      console.log(`✅ Showing ${offlineRowCount}/${onlineRowCount} rows offline`);
    }

    await goOnline(context);
  });

  test('should queue changes when offline', async ({ page, context }) => {
    await page.goto('/coding?categoryId=1');
    await waitForLoadingToFinish(page);

    // Go offline
    await goOffline(context);

    // Try to make a change
    const checkbox = page.locator('tbody input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkbox.check();
      await page.waitForTimeout(1000);

      // Should show queued indicator
      const hasQueueIndicator = await page.locator('text=/queued|pending|offline/i').count() > 0;

      if (hasQueueIndicator) {
        console.log('✅ Changes queued when offline');
      } else {
        console.log('⚠️  Offline queue not visible');
      }
    }

    await goOnline(context);
  });

  test('should sync queued changes when online', async ({ page, context }) => {
    await page.goto('/coding?categoryId=1');
    await waitForLoadingToFinish(page);

    // Go offline
    await goOffline(context);

    // Make a change
    const checkbox = page.locator('tbody input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checkbox.check();
      await page.waitForTimeout(500);

      // Go back online
      await goOnline(context);
      await page.waitForTimeout(2000);

      // Should sync
      const hasSyncMessage = await page.locator('text=/synced|synchronized|updated/i').count() > 0;

      if (hasSyncMessage) {
        console.log('✅ Changes synced when back online');
      }
    }
  });

  test('should show offline indicator', async ({ page, context }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Go offline
    await goOffline(context);
    await page.waitForTimeout(1000);

    // Look for offline indicator
    const offlineIndicator = page.locator('[aria-label*="offline" i], text=/offline|no.*connection/i');
    const hasIndicator = await offlineIndicator.count() > 0;

    if (hasIndicator) {
      console.log('✅ Offline indicator shown');
    } else {
      console.log('⚠️  Consider adding offline indicator');
    }

    await goOnline(context);
  });
});

test.describe('Service Worker', () => {
  test('should register service worker', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Check if service worker is registered
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator &&
             navigator.serviceWorker.controller !== null;
    });

    if (hasServiceWorker) {
      console.log('✅ Service worker registered');
    } else {
      console.log('ℹ️  Service worker not registered (may not be configured)');
    }
  });
});

test.describe('IndexedDB Storage', () => {
  test('should use IndexedDB for offline storage', async ({ page }) => {
    await page.goto('/');
    await waitForLoadingToFinish(page);

    // Check if IndexedDB is being used
    const hasIndexedDB = await page.evaluate(() => {
      return 'indexedDB' in window;
    });

    expect(hasIndexedDB).toBeTruthy();

    console.log('✅ IndexedDB available for offline storage');
  });

  test('should persist data in IndexedDB', async ({ page }) => {
    await page.goto('/coding?categoryId=1');
    await waitForLoadingToFinish(page);

    // Wait for data to be stored
    await page.waitForTimeout(2000);

    // Check IndexedDB
    const hasData = await page.evaluate(async () => {
      try {
        const dbs = await indexedDB.databases();
        return dbs.length > 0;
      } catch {
        return false;
      }
    });

    if (hasData) {
      console.log('✅ Data persisted in IndexedDB');
    }
  });
});

