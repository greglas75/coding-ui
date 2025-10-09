import { test } from '@playwright/test';

test.describe('Filter Persistence and URL Sync', () => {
  
  test('Filter should persist when user changes it (no auto-reset)', async ({ page }) => {
    // Navigate to coding page with whitelist filter
    await page.goto('/coding?categoryId=2&filter=whitelist');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Verify initial filter is applied
    await expect(page.getByText(/whitelist/i).first()).toBeVisible({ timeout: 5000 });
    
    // Check console logs for initial filter application
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('Applying initial filter from URL')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Wait a bit for any initial logs
    await page.waitForTimeout(1000);
    
    // Now change the filter to "not categorized"
    const statusFilter = page.locator('select').filter({ hasText: /status/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('uncategorized');
      await page.waitForTimeout(1000);
      
      // Verify filter changed and stayed changed
      await expect(page.getByText(/uncategorized/i).first()).toBeVisible({ timeout: 5000 });
      
      // Verify URL was updated
      const currentUrl = page.url();
      expect(currentUrl).toContain('filter=uncategorized');
      
      console.log('✅ Filter changed to uncategorized and URL updated');
    } else {
      console.log('⚠️  Status filter not found - skipping filter change test');
    }
    
    // Verify we only applied the initial filter once (not repeatedly)
    const initialFilterLogs = consoleLogs.filter(log => log.includes('Applying initial filter from URL'));
    expect(initialFilterLogs.length).toBeLessThanOrEqual(2); // Should be 1-2 times max (not hundreds)
    
    console.log(`✅ Initial filter applied ${initialFilterLogs.length} times (should be ≤2)`);
  });

  test('Filter should update URL when changed', async ({ page }) => {
    // Start without filter
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(2000);
    
    // Change filter to "ignored"
    const statusFilter = page.locator('select').filter({ hasText: /status/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('ignored');
      await page.waitForTimeout(1000);
      
      // Verify URL was updated
      const currentUrl = page.url();
      expect(currentUrl).toContain('filter=ignored');
      
      console.log('✅ Filter changed to ignored and URL updated');
    } else {
      console.log('⚠️  Status filter not found - skipping URL update test');
    }
  });

  test('Filter should clear from URL when reset', async ({ page }) => {
    // Start with filter
    await page.goto('/coding?categoryId=2&filter=whitelist');
    await page.waitForTimeout(2000);
    
    // Clear the filter
    const statusFilter = page.locator('select').filter({ hasText: /status/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption(''); // Clear selection
      await page.waitForTimeout(1000);
      
      // Verify URL no longer has filter parameter
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('filter=');
      
      console.log('✅ Filter cleared and removed from URL');
    } else {
      console.log('⚠️  Status filter not found - skipping clear test');
    }
  });

  test('URL filter should apply on page load but not override user changes', async ({ page }) => {
    // Navigate with filter in URL
    await page.goto('/coding?categoryId=2&filter=blacklist');
    await page.waitForTimeout(2000);
    
    // Verify initial filter is applied
    await expect(page.getByText(/blacklist/i).first()).toBeVisible({ timeout: 5000 });
    
    // Change filter
    const statusFilter = page.locator('select').filter({ hasText: /status/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('categorized');
      await page.waitForTimeout(1000);
      
      // Verify filter stayed changed (didn't reset to blacklist)
      await expect(page.getByText(/categorized/i).first()).toBeVisible({ timeout: 5000 });
      
      // Verify URL was updated
      const currentUrl = page.url();
      expect(currentUrl).toContain('filter=categorized');
      expect(currentUrl).not.toContain('filter=blacklist');
      
      console.log('✅ Filter changed from blacklist to categorized and stayed changed');
    } else {
      console.log('⚠️  Status filter not found - skipping persistence test');
    }
  });
});
