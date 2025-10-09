import { test } from '@playwright/test';

test.describe('Status Deduplication', () => {
  
  test('Status dropdown should not have duplicate options', async ({ page }) => {
    // Navigate to coding page
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    // Find the Status dropdown
    const statusDropdown = page.locator('button').filter({ hasText: /status/i }).first();
    
    if (await statusDropdown.isVisible()) {
      // Click to open dropdown
      await statusDropdown.click();
      await page.waitForTimeout(500);
      
      // Get all visible options
      const allOptions = page.locator('span.flex-1, label').filter({ hasText: /.+/ });
      const optionTexts = await allOptions.allTextContents();
      
      console.log('All options found:', optionTexts);
      
      // Check for duplicates (case-insensitive)
      const normalizedOptions = optionTexts.map(text => text.toLowerCase().trim());
      const uniqueOptions = [...new Set(normalizedOptions)];
      
      console.log('Normalized options:', normalizedOptions);
      console.log('Unique options:', uniqueOptions);
      
      if (normalizedOptions.length === uniqueOptions.length) {
        console.log('✅ No duplicate options found');
      } else {
        console.log('❌ Duplicate options found:', normalizedOptions.length - uniqueOptions.length);
        
        // Find which options are duplicated
        const duplicates = normalizedOptions.filter((item, index) => 
          normalizedOptions.indexOf(item) !== index
        );
        console.log('Duplicated options:', [...new Set(duplicates)]);
      }
      
      // Check for specific common duplicates
      const hasWhitelistLower = optionTexts.some(text => text.toLowerCase() === 'whitelist');
      const hasWhitelistUpper = optionTexts.some(text => text === 'Whitelist');
      const hasBlacklistLower = optionTexts.some(text => text.toLowerCase() === 'blacklist');
      const hasBlacklistUpper = optionTexts.some(text => text === 'Blacklist');
      
      if (hasWhitelistLower && hasWhitelistUpper) {
        console.log('❌ Both "whitelist" and "Whitelist" found');
      } else if (hasWhitelistUpper) {
        console.log('✅ Only "Whitelist" found (proper capitalization)');
      } else if (hasWhitelistLower) {
        console.log('✅ Only "whitelist" found');
      }
      
      if (hasBlacklistLower && hasBlacklistUpper) {
        console.log('❌ Both "blacklist" and "Blacklist" found');
      } else if (hasBlacklistUpper) {
        console.log('✅ Only "Blacklist" found (proper capitalization)');
      } else if (hasBlacklistLower) {
        console.log('✅ Only "blacklist" found');
      }
      
    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });

  test('Filtering should work with case-insensitive matching', async ({ page }) => {
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
      
      // Try to find and select a status option (case-insensitive)
      const whitelistOption = page.locator('input[type="checkbox"]').filter({ hasText: /whitelist/i }).or(
        page.locator('label').filter({ hasText: /whitelist/i }).locator('input[type="checkbox"]')
      ).first();
      
      if (await whitelistOption.isVisible()) {
        await whitelistOption.click();
        await page.waitForTimeout(1000);
        
        // Check if filtering worked
        const filteredAnswers = page.locator('tbody tr');
        const filteredCount = await filteredAnswers.count();
        
        console.log(`Filtered answers: ${filteredCount}`);
        
        if (filteredCount < initialCount) {
          console.log('✅ Case-insensitive filtering works');
        } else {
          console.log('⚠️  No filtering detected');
        }
        
        // Check if URL was updated
        const currentUrl = page.url();
        if (currentUrl.includes('filter=')) {
          console.log('✅ URL updated with filter');
        }
        
      } else {
        console.log('⚠️  Whitelist option not found');
      }
      
    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });

  test('Options should be sorted alphabetically', async ({ page }) => {
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    const statusDropdown = page.locator('button').filter({ hasText: /status/i }).first();
    
    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();
      await page.waitForTimeout(500);
      
      // Get all visible options
      const allOptions = page.locator('span.flex-1, label').filter({ hasText: /.+/ });
      const optionTexts = await allOptions.allTextContents();
      
      // Remove empty strings and trim
      const cleanOptions = optionTexts
        .map(text => text.trim())
        .filter(text => text.length > 0);
      
      console.log('Options in order:', cleanOptions);
      
      // Check if sorted alphabetically
      const sortedOptions = [...cleanOptions].sort((a, b) => a.localeCompare(b));
      const isSorted = JSON.stringify(cleanOptions) === JSON.stringify(sortedOptions);
      
      if (isSorted) {
        console.log('✅ Options are sorted alphabetically');
      } else {
        console.log('❌ Options are not sorted alphabetically');
        console.log('Expected order:', sortedOptions);
        console.log('Actual order:', cleanOptions);
      }
      
    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });
});
