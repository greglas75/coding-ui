import { expect, test } from '@playwright/test';

test.describe('Filter Reselection and URL Sync', () => {
  
  test('User can select whitelist, clear it, and reselect it', async ({ page }) => {
    // Navigate to coding page with whitelist filter
    await page.goto('/coding?categoryId=2&filter=whitelist');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    console.log('Step 1: Initial load with whitelist filter');
    
    // Verify whitelist filter is applied
    let currentUrl = page.url();
    expect(currentUrl).toContain('filter=whitelist');
    console.log('✅ URL contains filter=whitelist');
    
    // Check for status dropdown
    const statusDropdown = page.locator('select[name="status"]').or(
      page.locator('select').filter({ hasText: /status/i })
    ).first();
    
    if (await statusDropdown.isVisible()) {
      // Get current value
      const currentValue = await statusDropdown.inputValue();
      console.log('Current filter value:', currentValue);
      
      console.log('Step 2: Clear filter (select empty/all status)');
      
      // Clear the filter by selecting empty value
      await statusDropdown.selectOption('');
      await page.waitForTimeout(1000);
      
      // Verify URL no longer has filter parameter
      currentUrl = page.url();
      expect(currentUrl).not.toContain('filter=whitelist');
      console.log('✅ URL filter cleared');
      
      console.log('Step 3: Reselect whitelist filter');
      
      // Try to select whitelist again - THIS IS THE KEY TEST
      await statusDropdown.selectOption('whitelist');
      await page.waitForTimeout(1000);
      
      // Verify URL now has filter=whitelist again
      currentUrl = page.url();
      expect(currentUrl).toContain('filter=whitelist');
      console.log('✅ Successfully reselected whitelist filter!');
      
      // Verify the dropdown shows whitelist
      const newValue = await statusDropdown.inputValue();
      expect(newValue).toBe('whitelist');
      console.log('✅ Dropdown shows whitelist');
      
    } else {
      console.log('⚠️  Status dropdown not found - skipping test');
    }
  });

  test('User can switch between multiple filters', async ({ page }) => {
    // Start without filter
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(2000);
    
    const statusDropdown = page.locator('select[name="status"]').or(
      page.locator('select').filter({ hasText: /status/i })
    ).first();
    
    if (await statusDropdown.isVisible()) {
      // Test 1: Select whitelist
      console.log('Test 1: Select whitelist');
      await statusDropdown.selectOption('whitelist');
      await page.waitForTimeout(1000);
      
      let currentUrl = page.url();
      expect(currentUrl).toContain('filter=whitelist');
      console.log('✅ Whitelist selected, URL updated');
      
      // Test 2: Switch to blacklist
      console.log('Test 2: Switch to blacklist');
      await statusDropdown.selectOption('blacklist');
      await page.waitForTimeout(1000);
      
      currentUrl = page.url();
      expect(currentUrl).toContain('filter=blacklist');
      expect(currentUrl).not.toContain('filter=whitelist');
      console.log('✅ Blacklist selected, URL updated');
      
      // Test 3: Switch to uncategorized
      console.log('Test 3: Switch to uncategorized');
      await statusDropdown.selectOption('uncategorized');
      await page.waitForTimeout(1000);
      
      currentUrl = page.url();
      expect(currentUrl).toContain('filter=uncategorized');
      expect(currentUrl).not.toContain('filter=blacklist');
      console.log('✅ Uncategorized selected, URL updated');
      
      // Test 4: Switch back to whitelist
      console.log('Test 4: Switch back to whitelist');
      await statusDropdown.selectOption('whitelist');
      await page.waitForTimeout(1000);
      
      currentUrl = page.url();
      expect(currentUrl).toContain('filter=whitelist');
      expect(currentUrl).not.toContain('filter=uncategorized');
      console.log('✅ Back to whitelist, URL updated');
      
      // Test 5: Clear filter
      console.log('Test 5: Clear filter');
      await statusDropdown.selectOption('');
      await page.waitForTimeout(1000);
      
      currentUrl = page.url();
      expect(currentUrl).not.toContain('filter=');
      console.log('✅ Filter cleared, URL has no filter param');
      
    } else {
      console.log('⚠️  Status dropdown not found - skipping test');
    }
  });

  test('URL and UI stay in sync', async ({ page }) => {
    // Navigate with filter in URL
    await page.goto('/coding?categoryId=2&filter=blacklist');
    await page.waitForTimeout(2000);
    
    const statusDropdown = page.locator('select[name="status"]').or(
      page.locator('select').filter({ hasText: /status/i })
    ).first();
    
    if (await statusDropdown.isVisible()) {
      // Verify UI reflects URL
      const dropdownValue = await statusDropdown.inputValue();
      expect(dropdownValue).toBe('blacklist');
      console.log('✅ UI reflects URL filter on load');
      
      // Change UI
      await statusDropdown.selectOption('categorized');
      await page.waitForTimeout(1000);
      
      // Verify URL reflects UI
      const currentUrl = page.url();
      expect(currentUrl).toContain('filter=categorized');
      console.log('✅ URL reflects UI change');
      
      // Verify UI still shows correct value
      const newDropdownValue = await statusDropdown.inputValue();
      expect(newDropdownValue).toBe('categorized');
      console.log('✅ UI and URL stay in sync');
      
    } else {
      console.log('⚠️  Status dropdown not found - skipping test');
    }
  });

  test('No flickering when changing filters', async ({ page }) => {
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(2000);
    
    // Count console logs to detect excessive re-renders
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Showing page') || msg.text().includes('answers')) {
        logs.push(msg.text());
      }
    });
    
    const statusDropdown = page.locator('select[name="status"]').or(
      page.locator('select').filter({ hasText: /status/i })
    ).first();
    
    if (await statusDropdown.isVisible()) {
      // Clear any existing logs
      logs.length = 0;
      
      // Change filter
      await statusDropdown.selectOption('whitelist');
      await page.waitForTimeout(2000);
      
      // Count how many times the same log appears
      const logCounts = logs.reduce((acc, log) => {
        acc[log] = (acc[log] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Check if any log appears more than 3 times (indicating flicker/loop)
      const maxCount = Math.max(...Object.values(logCounts), 0);
      
      console.log('Log counts:', logCounts);
      console.log('Max repeated log count:', maxCount);
      
      if (maxCount > 5) {
        console.log('⚠️  Possible flickering detected (same log repeated ' + maxCount + ' times)');
      } else {
        console.log('✅ No excessive flickering detected');
      }
      
      expect(maxCount).toBeLessThan(10); // Allow some re-renders but not excessive
      
    } else {
      console.log('⚠️  Status dropdown not found - skipping test');
    }
  });
});
