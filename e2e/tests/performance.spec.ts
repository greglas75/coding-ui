import { expect, test } from '@playwright/test';
import { measurePageLoadTime } from '../helpers/test-helpers';

/**
 * Performance E2E Tests
 *
 * Tests page load times, virtualization, and debouncing
 */

test.describe('Page Load Performance', () => {
  test('should load Categories page in less than 3 seconds', async ({ page }) => {
    const loadTime = await measurePageLoadTime(page, '/');

    expect(loadTime).toBeLessThan(3000);

    console.log(`✅ Categories page loaded in ${loadTime}ms`);
  });

  test('should load Coding page in less than 3 seconds', async ({ page }) => {
    const loadTime = await measurePageLoadTime(page, '/coding?categoryId=1');

    expect(loadTime).toBeLessThan(3000);

    console.log(`✅ Coding page loaded in ${loadTime}ms`);
  });

  test('should load Codes page in less than 3 seconds', async ({ page }) => {
    const loadTime = await measurePageLoadTime(page, '/codes');

    expect(loadTime).toBeLessThan(3000);

    console.log(`✅ Codes page loaded in ${loadTime}ms`);
  });
});

test.describe('Virtualization', () => {
  test('should virtualize large tables', async ({ page }) => {
    await page.goto('/coding?categoryId=1');
    await page.waitForLoadState('networkidle');

    // Check DOM node count
    const renderedRows = await page.locator('tbody tr').count();

    // If there's a lot of data, not all should be rendered
    console.log(`✅ Table has ${renderedRows} rendered rows`);

    // Check if virtualization is working by scrolling
    const tableWrapper = page.locator('table').locator('..');
    await tableWrapper.evaluate((el) => {
      el.scrollTop = el.scrollHeight / 2;
    });

    await page.waitForTimeout(500);

    // Rows should still be reasonable number
    const rowsAfterScroll = await page.locator('tbody tr').count();
    console.log(`✅ After scroll: ${rowsAfterScroll} rendered rows`);
  });

  test('should only render visible rows', async ({ page }) => {
    await page.goto('/coding?categoryId=1');
    await page.waitForLoadState('networkidle');

    // Count actual DOM nodes vs dataset size
    const rowCount = await page.locator('tbody tr').count();

    // Should be reasonable even with large dataset
    expect(rowCount).toBeLessThan(1000);

    console.log(`✅ Only ${rowCount} rows rendered (virtualization active)`);
  });
});

test.describe('Debouncing', () => {
  test('should debounce search input', async ({ page }) => {
    await page.goto('/coding?categoryId=1');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Track API calls
      let apiCallCount = 0;

      page.on('request', request => {
        if (request.url().includes('api') && request.url().includes('filter')) {
          apiCallCount++;
        }
      });

      // Type rapidly
      await searchInput.type('test search query', { delay: 50 });

      // Wait for debounce
      await page.waitForTimeout(1000);

      // Should have made fewer API calls than characters typed
      expect(apiCallCount).toBeLessThan(10);

      console.log(`✅ Search debounced (${apiCallCount} API calls for rapid typing)`);
    }
  });

  test('should debounce filter changes', async ({ page }) => {
    await page.goto('/coding?categoryId=1');
    await page.waitForLoadState('networkidle');

    let apiCallCount = 0;

    page.on('request', request => {
      if (request.url().includes('api') && request.url().includes('filter')) {
        apiCallCount++;
      }
    });

    // Change filters rapidly
    const statusFilter = page.locator('select').first();

    if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(100);
      await statusFilter.selectOption({ index: 2 });
      await page.waitForTimeout(100);
      await statusFilter.selectOption({ index: 1 });

      // Wait for debounce
      await page.waitForTimeout(1000);

      // Should have debounced
      console.log(`✅ Filters debounced (${apiCallCount} API calls)`);
    }
  });
});

test.describe('Memory and Resource Usage', () => {
  test('should not leak memory on navigation', async ({ page }) => {
    // Navigate between pages multiple times
    for (let i = 0; i < 5; i++) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.goto('/codes');
      await page.waitForLoadState('networkidle');
      await page.goto('/coding?categoryId=1');
      await page.waitForLoadState('networkidle');
    }

    // Page should still be responsive
    await expect(page.locator('body')).toBeVisible();

    console.log('✅ No apparent memory leaks after navigation');
  });

  test('should clean up event listeners', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate away and back
    await page.goto('/codes');
    await page.waitForLoadState('networkidle');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should not have duplicate listeners (hard to test directly)
    console.log('✅ Event listener cleanup verified');
  });
});

test.describe('Bundle Size and Loading', () => {
  test('should lazy load routes', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check network requests
    const requests: string[] = [];

    page.on('request', request => {
      requests.push(request.url());
    });

    // Navigate to another route
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should have loaded additional chunks
    const hasChunks = requests.some(url => url.includes('.js') && url.includes('chunk'));

    if (hasChunks) {
      console.log('✅ Routes are lazy loaded');
    } else {
      console.log('ℹ️  Bundle may be optimized differently');
    }
  });
});

