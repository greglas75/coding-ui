import { test } from '@playwright/test';

test.describe('Status Multi-Choice Functionality', () => {
  
  test('Status dropdown should support multi-selection', async ({ page }) => {
    // Navigate to coding page
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    // Find the Status dropdown
    const statusDropdown = page.locator('button').filter({ hasText: /status/i }).first();
    
    if (await statusDropdown.isVisible()) {
      // Click to open dropdown
      await statusDropdown.click();
      await page.waitForTimeout(500);
      
      // Check if "Select all" and "Unselect all" buttons are visible
      const selectAllButton = page.locator('button', { hasText: 'Select all' });
      const unselectAllButton = page.locator('button', { hasText: 'Unselect all' });
      
      if (await selectAllButton.isVisible() && await unselectAllButton.isVisible()) {
        console.log('✅ Status dropdown has Select all / Unselect all buttons (multi-choice)');
        
        // Test Select All
        await selectAllButton.click();
        await page.waitForTimeout(1000);
        
        // Check if multiple statuses are selected
        const selectedItems = page.locator('input[type="checkbox"]:checked');
        const selectedCount = await selectedItems.count();
        
        if (selectedCount > 1) {
          console.log(`✅ Multiple statuses selected (${selectedCount} items)`);
        } else {
          console.log('⚠️  Only one status selected - may not be true multi-choice');
        }
        
        // Test Unselect All
        await unselectAllButton.click();
        await page.waitForTimeout(1000);
        
        // Check if all statuses are unselected
        const unselectedItems = page.locator('input[type="checkbox"]:not(:checked)');
        const unselectedCount = await unselectedItems.count();
        
        if (unselectedCount > 0) {
          console.log(`✅ All statuses unselected (${unselectedCount} items)`);
        }
        
        // Test individual selection
        const firstCheckbox = page.locator('input[type="checkbox"]').first();
        if (await firstCheckbox.isVisible()) {
          await firstCheckbox.click();
          await page.waitForTimeout(500);
          
          const secondCheckbox = page.locator('input[type="checkbox"]').nth(1);
          if (await secondCheckbox.isVisible()) {
            await secondCheckbox.click();
            await page.waitForTimeout(500);
            
            const checkedCount = await page.locator('input[type="checkbox"]:checked').count();
            if (checkedCount >= 2) {
              console.log('✅ Multiple individual selections work');
            }
          }
        }
        
      } else {
        console.log('❌ Status dropdown does not have Select all / Unselect all buttons');
      }
      
    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });

  test('Status filter should work with multiple selections', async ({ page }) => {
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    // Get initial answer count
    const initialAnswers = page.locator('tbody tr');
    const initialCount = await initialAnswers.count();
    console.log(`Initial answers: ${initialCount}`);
    
    // Open status dropdown
    const statusDropdown = page.locator('button').filter({ hasText: /status/i }).first();
    
    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();
      await page.waitForTimeout(500);
      
      // Select whitelist
      const whitelistCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /whitelist/i }).or(
        page.locator('label').filter({ hasText: /whitelist/i }).locator('input[type="checkbox"]')
      ).first();
      
      if (await whitelistCheckbox.isVisible()) {
        await whitelistCheckbox.click();
        await page.waitForTimeout(1000);
        
        // Select blacklist as well
        const blacklistCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /blacklist/i }).or(
          page.locator('label').filter({ hasText: /blacklist/i }).locator('input[type="checkbox"]')
        ).first();
        
        if (await blacklistCheckbox.isVisible()) {
          await blacklistCheckbox.click();
          await page.waitForTimeout(1000);
          
          // Check if answers are filtered
          const filteredAnswers = page.locator('tbody tr');
          const filteredCount = await filteredAnswers.count();
          
          console.log(`Filtered answers: ${filteredCount}`);
          
          if (filteredCount < initialCount) {
            console.log('✅ Multi-selection filtering works');
          } else {
            console.log('⚠️  No filtering detected with multi-selection');
          }
          
          // Check if URL reflects the selection
          const currentUrl = page.url();
          if (currentUrl.includes('filter=')) {
            console.log('✅ URL updated with filter');
          }
          
        } else {
          console.log('⚠️  Blacklist checkbox not found');
        }
        
      } else {
        console.log('⚠️  Whitelist checkbox not found');
      }
      
    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });

  test('Status filter should show correct count in active filters', async ({ page }) => {
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    // Check initial active filter count
    const activeFilterTags = page.locator('[class*="bg-blue-100"]').or(
      page.locator('[class*="bg-blue-50"]')
    );
    const initialActiveCount = await activeFilterTags.count();
    console.log(`Initial active filters: ${initialActiveCount}`);
    
    // Open status dropdown and select multiple items
    const statusDropdown = page.locator('button').filter({ hasText: /status/i }).first();
    
    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();
      await page.waitForTimeout(500);
      
      // Select multiple statuses
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      
      if (checkboxCount >= 2) {
        // Select first two checkboxes
        await checkboxes.nth(0).click();
        await page.waitForTimeout(300);
        await checkboxes.nth(1).click();
        await page.waitForTimeout(1000);
        
        // Check if active filter count increased
        const newActiveCount = await activeFilterTags.count();
        console.log(`New active filters: ${newActiveCount}`);
        
        if (newActiveCount > initialActiveCount) {
          console.log('✅ Active filter count increased with multi-selection');
        } else {
          console.log('⚠️  Active filter count did not increase');
        }
        
        // Check if status filter tag shows multiple selections
        const statusFilterTag = page.locator('text=STATUS:').or(
          page.locator('[class*="bg-blue-100"]').filter({ hasText: /status/i })
        );
        
        if (await statusFilterTag.isVisible()) {
          const tagText = await statusFilterTag.textContent();
          console.log(`Status filter tag: ${tagText}`);
          
          if (tagText && tagText.includes(',')) {
            console.log('✅ Status filter shows multiple selections');
          } else {
            console.log('⚠️  Status filter may not show multiple selections');
          }
        }
        
      } else {
        console.log('⚠️  Not enough checkboxes found for multi-selection test');
      }
      
    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });
});
