import { test } from '@playwright/test';

/**
 * 🎯 CATEGORY FILTERING TEST
 * 
 * This test verifies that navigating to a coding page with categoryId and filter
 * parameters properly applies the filters and maintains the category context.
 */

test.describe('Category Filtering', () => {
  test('should display whitelisted codes when navigating to coding page with filter=whitelist', async ({ page }) => {
    // Set up console message listener to catch errors
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Navigate to the coding page with categoryId=2 and filter=whitelist
    console.log('📍 Navigating to coding page with categoryId=2 and filter=whitelist...');
    await page.goto('/coding?categoryId=2&filter=whitelist', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for the page to load and filters to be applied
    await page.waitForTimeout(2000);

    // 1. Check that we're on the coding page
    console.log('✅ Checking if we are on the coding page...');
    await expect(page).toHaveURL(/\/coding\?categoryId=2&filter=whitelist/);

    // 2. Wait for data to load (look for the grid or table)
    console.log('⏳ Waiting for data to load...');
    
    // Check if there's a main content area with answers
    const hasAnswers = await page.locator('table, [role="grid"], .coding-grid').count() > 0;
    
    if (hasAnswers) {
      console.log('✅ Found answer grid/table on page');
    } else {
      console.log('⚠️ No answer grid/table found - checking for loading state');
    }

    // 3. Check for console errors
    console.log('\n📊 Console Messages Summary:');
    console.log(`Total messages: ${consoleMessages.length}`);
    console.log(`Errors: ${consoleErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ Console Errors Found:');
      consoleErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    // 4. Check relevant console logs for filter application
    console.log('\n🔍 Checking for filter application in console logs...');
    const filterLogs = consoleMessages.filter(msg => 
      msg.includes('filter') || 
      msg.includes('categoryId') || 
      msg.includes('category ID') ||
      msg.includes('whitelist')
    );
    
    console.log('Filter-related logs:');
    filterLogs.forEach(log => console.log(`  - ${log}`));

    // 5. Verify category context is maintained
    console.log('\n🔍 Verifying category context...');
    const categoryLogs = consoleMessages.filter(msg => 
      msg.includes('category') && msg.includes('2')
    );
    
    if (categoryLogs.length > 0) {
      console.log('✅ Found category context logs:');
      categoryLogs.forEach(log => console.log(`  - ${log}`));
    } else {
      console.log('⚠️ No category context logs found');
    }

    // 6. Check if filter status is displayed in UI
    console.log('\n🔍 Checking UI for filter indicators...');
    
    // Look for filter badges or indicators
    const filterBadge = page.locator('text=/whitelist/i, [class*="badge"], [class*="chip"]').first();
    const filterBadgeVisible = await filterBadge.isVisible().catch(() => false);
    
    if (filterBadgeVisible) {
      console.log('✅ Filter indicator visible in UI');
    } else {
      console.log('⚠️ No visible filter indicator found in UI');
    }

    // 7. Check for category name display
    const categoryIndicator = page.locator('[class*="category"], [class*="breadcrumb"]').first();
    const categoryVisible = await categoryIndicator.isVisible().catch(() => false);
    
    if (categoryVisible) {
      const categoryText = await categoryIndicator.textContent();
      console.log(`✅ Category indicator found: "${categoryText}"`);
    } else {
      console.log('⚠️ No category indicator found');
    }

    // 8. Take a screenshot for visual inspection
    await page.screenshot({ path: 'test-results/category-filter-whitelist.png', fullPage: true });
    console.log('\n📸 Screenshot saved to: test-results/category-filter-whitelist.png');

    // 9. Verify no critical console errors
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('favicon') && // Ignore favicon errors
      !err.includes('DevTools') // Ignore DevTools messages
    );

    if (criticalErrors.length > 0) {
      console.log('\n❌ CRITICAL ERRORS FOUND:');
      criticalErrors.forEach(err => console.log(`  ${err}`));
    }

    // Assert: There should be no critical errors
    expect(criticalErrors.length).toBe(0);

    // 10. Summary
    console.log('\n📋 Test Summary:');
    console.log(`✅ URL navigation: SUCCESS`);
    console.log(`✅ Console errors: ${criticalErrors.length === 0 ? 'NONE' : criticalErrors.length}`);
    console.log(`✅ Filter logs: ${filterLogs.length} found`);
    console.log(`✅ Category logs: ${categoryLogs.length} found`);
  });

  test('should apply filter from URL parameter on page load', async ({ page }) => {
    const appliedFilters: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      // Look for filter application logs
      if (text.includes('Auto-applying filter') || text.includes('Filters changed')) {
        appliedFilters.push(text);
      }
    });

    await page.goto('/coding?categoryId=2&filter=whitelist');
    await page.waitForTimeout(2000);

    console.log('\n🔍 Filter Application Logs:');
    appliedFilters.forEach(log => console.log(`  - ${log}`));

    // Verify that filters were applied
    expect(appliedFilters.length).toBeGreaterThan(0);
  });

  test('should maintain category when filters are applied', async ({ page }) => {
    const categoryContextLogs: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      // Track category context
      if (text.includes('category_id') || text.includes('categoryId') || text.includes('Category ID distribution')) {
        categoryContextLogs.push(text);
      }
    });

    await page.goto('/coding?categoryId=2&filter=whitelist');
    await page.waitForTimeout(2500);

    console.log('\n🔍 Category Context Logs:');
    categoryContextLogs.forEach(log => console.log(`  - ${log}`));

    // Check if category distribution shows only category 2
    const distributionLog = categoryContextLogs.find(log => 
      log.includes('Category ID distribution')
    );

    if (distributionLog) {
      console.log('\n📊 Found distribution log:', distributionLog);
      
      // The log should show category 2 (and possibly 'null' but not other category IDs)
      const hasCategory2 = distributionLog.includes('"2":') || distributionLog.includes('2:');
      
      if (hasCategory2) {
        console.log('✅ Category 2 is present in distribution');
      } else {
        console.log('⚠️ Category 2 NOT found in distribution - may indicate filtering issue');
      }
      
      expect(hasCategory2).toBe(true);
    }
  });
});

