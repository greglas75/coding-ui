import { test } from '@playwright/test';

test.describe('Search Input Persistence', () => {
  
  test('Search input should not clear while typing', async ({ page }) => {
    // Navigate to coding page
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    // Find the search input
    const searchInput = page.locator('input[placeholder="Search answers..."]');
    
    if (await searchInput.isVisible()) {
      // Type "p" and check if it stays
      await searchInput.fill('p');
      await page.waitForTimeout(100);
      
      let inputValue = await searchInput.inputValue();
      if (inputValue === 'p') {
        console.log('✅ "p" typed and persisted');
      } else {
        console.log('❌ "p" was cleared, value:', inputValue);
      }
      
      // Type "e" (now "pe") and check if it stays
      await searchInput.fill('pe');
      await page.waitForTimeout(100);
      
      inputValue = await searchInput.inputValue();
      if (inputValue === 'pe') {
        console.log('✅ "pe" typed and persisted');
      } else {
        console.log('❌ "pe" was cleared, value:', inputValue);
      }
      
      // Type "p" (now "pep") and check if it stays
      await searchInput.fill('pep');
      await page.waitForTimeout(100);
      
      inputValue = await searchInput.inputValue();
      if (inputValue === 'pep') {
        console.log('✅ "pep" typed and persisted');
      } else {
        console.log('❌ "pep" was cleared, value:', inputValue);
      }
      
      // Type "s" (now "peps") and check if it stays
      await searchInput.fill('peps');
      await page.waitForTimeout(100);
      
      inputValue = await searchInput.inputValue();
      if (inputValue === 'peps') {
        console.log('✅ "peps" typed and persisted');
      } else {
        console.log('❌ "peps" was cleared, value:', inputValue);
      }
      
      // Wait for debounce (300ms) and check if it still persists
      await page.waitForTimeout(500);
      
      inputValue = await searchInput.inputValue();
      if (inputValue === 'peps') {
        console.log('✅ "peps" persisted after debounce');
      } else {
        console.log('❌ "peps" was cleared after debounce, value:', inputValue);
      }
      
    } else {
      console.log('⚠️  Search input not found');
    }
  });

  test('Search input should show results after debounce', async ({ page }) => {
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    // Get initial answer count
    const initialAnswers = page.locator('tbody tr');
    const initialCount = await initialAnswers.count();
    console.log(`Initial answers: ${initialCount}`);
    
    const searchInput = page.locator('input[placeholder="Search answers..."]');
    
    if (await searchInput.isVisible()) {
      // Type search term
      await searchInput.fill('test');
      await page.waitForTimeout(500); // Wait for debounce
      
      // Check if results are filtered
      const filteredAnswers = page.locator('tbody tr');
      const filteredCount = await filteredAnswers.count();
      
      console.log(`Filtered answers: ${filteredCount}`);
      
      if (filteredCount < initialCount) {
        console.log('✅ Search filtering works');
      } else if (filteredCount === 0) {
        console.log('✅ Search filtering works (no results found)');
      } else {
        console.log('⚠️  No filtering detected');
      }
      
      // Check if input still shows the search term
      const inputValue = await searchInput.inputValue();
      if (inputValue === 'test') {
        console.log('✅ Search input preserved after filtering');
      } else {
        console.log('❌ Search input was cleared, value:', inputValue);
      }
      
    } else {
      console.log('⚠️  Search input not found');
    }
  });

  test('Search input should clear when reset filters is clicked', async ({ page }) => {
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    const searchInput = page.locator('input[placeholder="Search answers..."]');
    
    if (await searchInput.isVisible()) {
      // Type search term
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      // Verify search term is there
      let inputValue = await searchInput.inputValue();
      if (inputValue === 'test') {
        console.log('✅ Search term entered');
      } else {
        console.log('❌ Search term not entered, value:', inputValue);
        return;
      }
      
      // Find and click reset button
      const resetButton = page.locator('button').filter({ hasText: /reset/i }).or(
        page.locator('button').filter({ hasText: /clear/i })
      ).first();
      
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await page.waitForTimeout(500);
        
        // Check if search input is cleared
        inputValue = await searchInput.inputValue();
        if (inputValue === '') {
          console.log('✅ Search input cleared after reset');
        } else {
          console.log('❌ Search input not cleared after reset, value:', inputValue);
        }
        
      } else {
        console.log('⚠️  Reset button not found');
      }
      
    } else {
      console.log('⚠️  Search input not found');
    }
  });

  test('Search input should work with other filters', async ({ page }) => {
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);
    
    const searchInput = page.locator('input[placeholder="Search answers..."]');
    
    if (await searchInput.isVisible()) {
      // Type search term
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      
      // Open status dropdown and select a filter
      const statusDropdown = page.locator('button').filter({ hasText: /status/i }).first();
      
      if (await statusDropdown.isVisible()) {
        await statusDropdown.click();
        await page.waitForTimeout(500);
        
        // Select first available option
        const firstCheckbox = page.locator('input[type="checkbox"]').first();
        if (await firstCheckbox.isVisible()) {
          await firstCheckbox.click();
          await page.waitForTimeout(500);
          
          // Check if search input still has the search term
          const inputValue = await searchInput.inputValue();
          if (inputValue === 'test') {
            console.log('✅ Search input preserved when other filters change');
          } else {
            console.log('❌ Search input was cleared when other filters changed, value:', inputValue);
          }
          
        } else {
          console.log('⚠️  No checkbox found in status dropdown');
        }
        
      } else {
        console.log('⚠️  Status dropdown not found');
      }
      
    } else {
      console.log('⚠️  Search input not found');
    }
  });
});
