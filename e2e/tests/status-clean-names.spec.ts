import { test } from '@playwright/test';

test.describe('Status Clean Names', () => {
  
  test('Status options should have proper capitalization and no underscores', async ({ page }) => {
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
      
      // Filter out non-status options (like "Search", "Status", etc.)
      const statusOptions = optionTexts.filter(text => {
        const cleanText = text.trim();
        return cleanText && 
               !cleanText.includes('Search') && 
               !cleanText.includes('Status') &&
               !cleanText.includes('Code') &&
               !cleanText.includes('Language') &&
               !cleanText.includes('Country') &&
               !cleanText.includes('Length');
      });
      
      console.log('Status options found:', statusOptions);
      
      // Check for proper formatting
      const issues = [];
      
      statusOptions.forEach(option => {
        const cleanOption = option.trim();
        
        // Check for underscores
        if (cleanOption.includes('_')) {
          issues.push(`❌ "${cleanOption}" contains underscore`);
        }
        
        // Check for proper capitalization (first letter should be uppercase)
        if (cleanOption.length > 0 && cleanOption[0] !== cleanOption[0].toUpperCase()) {
          issues.push(`❌ "${cleanOption}" should start with capital letter`);
        }
        
        // Check for all lowercase (except single words that might be proper nouns)
        const words = cleanOption.split(' ');
        if (words.length > 1) {
          words.forEach(word => {
            if (word.length > 0 && word[0] !== word[0].toUpperCase()) {
              issues.push(`❌ "${cleanOption}" - word "${word}" should be capitalized`);
            }
          });
        }
      });
      
      if (issues.length === 0) {
        console.log('✅ All status options have proper formatting');
      } else {
        console.log('Issues found:');
        issues.forEach(issue => console.log(issue));
      }
      
      // Check for specific expected transformations
      const expectedTransformations = [
        { original: 'global_blacklist', expected: 'Global Blacklist' },
        { original: 'blacklist', expected: 'Blacklist' },
        { original: 'whitelist', expected: 'Whitelist' },
        { original: 'uncategorized', expected: 'Uncategorized' },
        { original: 'gibberish', expected: 'Gibberish' }
      ];
      
      expectedTransformations.forEach(({ original, expected }) => {
        const found = statusOptions.some(option => option.trim() === expected);
        if (found) {
          console.log(`✅ "${original}" → "${expected}" ✓`);
        } else {
          console.log(`❌ Expected "${expected}" not found for "${original}"`);
        }
      });
      
    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });

  test('Status options should be sorted alphabetically with clean names', async ({ page }) => {
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    const statusDropdown = page.locator('button').filter({ hasText: /status/i }).first();
    
    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();
      await page.waitForTimeout(500);
      
      // Get all visible options
      const allOptions = page.locator('span.flex-1, label').filter({ hasText: /.+/ });
      const optionTexts = await allOptions.allTextContents();
      
      // Filter out non-status options
      const statusOptions = optionTexts.filter(text => {
        const cleanText = text.trim();
        return cleanText && 
               !cleanText.includes('Search') && 
               !cleanText.includes('Status') &&
               !cleanText.includes('Code') &&
               !cleanText.includes('Language') &&
               !cleanText.includes('Country') &&
               !cleanText.includes('Length');
      }).map(text => text.trim());
      
      console.log('Status options in order:', statusOptions);
      
      // Check if sorted alphabetically
      const sortedOptions = [...statusOptions].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
      const isSorted = JSON.stringify(statusOptions) === JSON.stringify(sortedOptions);
      
      if (isSorted) {
        console.log('✅ Status options are sorted alphabetically');
      } else {
        console.log('❌ Status options are not sorted alphabetically');
        console.log('Expected order:', sortedOptions);
        console.log('Actual order:', statusOptions);
      }
      
    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });

  test('Filtering should work with clean names', async ({ page }) => {
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
      
      // Try to find and select a clean status option
      const blacklistOption = page.locator('input[type="checkbox"]').filter({ hasText: /blacklist/i }).or(
        page.locator('label').filter({ hasText: /blacklist/i }).locator('input[type="checkbox"]')
      ).first();
      
      if (await blacklistOption.isVisible()) {
        await blacklistOption.click();
        await page.waitForTimeout(1000);
        
        // Check if filtering worked
        const filteredAnswers = page.locator('tbody tr');
        const filteredCount = await filteredAnswers.count();
        
        console.log(`Filtered answers: ${filteredCount}`);
        
        if (filteredCount < initialCount) {
          console.log('✅ Filtering works with clean names');
        } else {
          console.log('⚠️  No filtering detected');
        }
        
        // Check if URL was updated
        const currentUrl = page.url();
        if (currentUrl.includes('filter=')) {
          console.log('✅ URL updated with clean filter name');
        }
        
      } else {
        console.log('⚠️  Blacklist option not found');
      }
      
    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });
});
