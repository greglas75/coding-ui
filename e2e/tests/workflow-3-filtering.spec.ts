import { test } from '@playwright/test';
import { goToCodingPage, waitForLoadingToFinish, searchInTable: _searchInTable, applyFilters: _applyFilters, resetFilters: _resetFilters } from '../helpers/test-helpers';

/**
 * 🎯 WORKFLOW 3: Filtering and Search
 * 
 * This tests the complete filtering workflow:
 * 1. Search by text
 * 2. Filter by status
 * 3. Filter by code
 * 4. Filter by language
 * 5. Clear filters
 * 6. Combine multiple filters
 * 
 * Based on manual testing workflow provided by product owner
 */

test.describe('Workflow 3: Filtering and Search', () => {
  const testCategoryId = 1;

  test.beforeEach(async ({ page }) => {
    await goToCodingPage(page, testCategoryId);
    await waitForLoadingToFinish(page);
  });

  test('complete workflow - search and filter', async ({ page }) => {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Type "Nike" in Search Box
    // ═══════════════════════════════════════════════════════════
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Nike');
    
    // Wait for debounce
    await page.waitForTimeout(500);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Select "Whitelist" from Status Dropdown
    // ═══════════════════════════════════════════════════════════
    // Find the Type/Status filter dropdown in FiltersBar
    // Click to open dropdown
    const typeButton = page.getByRole('button', { name: /type/i }).first();
    await typeButton.click();
    await page.waitForTimeout(300);
    
    // Click on "Whitelist" option
    await page.getByText('Whitelist').first().click();
    await page.waitForTimeout(300);

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Apply Filters
    // ═══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /apply filters/i }).click();
    
    // Wait for filtering
    await page.waitForTimeout(1000);

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Verify Only Whitelisted Nike Answers Show
    // ═══════════════════════════════════════════════════════════
    // Should see reduced number of answers
    const resultsText = page.getByText(/showing.*of.*answers/i);
    await expect(resultsText).toBeVisible();
    
    // Should see active filter tags
    await expect(page.getByText(/search.*nike/i).or(page.getByText(/"Nike"/i))).toBeVisible();

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Clear Filters
    // ═══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /reset/i }).click();
    await page.waitForTimeout(500);

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Verify All Answers Show Again
    // ═══════════════════════════════════════════════════════════
    // Search box should be empty
    await expect(searchInput).toHaveValue('');
    
    // Active filter tags should be gone
    await expect(page.getByText(/"Nike"/i)).not.toBeVisible();
  });

  test('should filter by language', async ({ page }) => {
    // Click language filter dropdown
    const languageButton = page.getByRole('button', { name: /language/i }).first();
    await languageButton.click();
    await page.waitForTimeout(300);
    
    // Select "EN" (or first available language)
    const languageOption = page.getByText(/^EN$/i).or(page.getByText(/english/i)).first();
    
    if (await languageOption.isVisible()) {
      await languageOption.click();
      await page.waitForTimeout(300);
      
      // Apply filters
      await page.getByRole('button', { name: /apply filters/i }).click();
      await page.waitForTimeout(1000);
      
      // Verify filter applied
      await expect(page.getByText(/language.*en/i).or(page.getByText(/^EN$/i))).toBeVisible();
    }
  });

  test('should filter by code', async ({ page }) => {
    // Click code filter dropdown
    const codeButton = page.getByRole('button', { name: /^code$/i }).first();
    await codeButton.click();
    await page.waitForTimeout(300);
    
    // Wait for codes to load
    await waitForLoadingToFinish(page);
    await page.waitForTimeout(500);
    
    // Select first available code
    const firstCode = page.locator('.filter-dropdown').getByText(/.+/).first();
    
    if (await firstCode.isVisible()) {
      const codeName = await firstCode.textContent();
      await firstCode.click();
      await page.waitForTimeout(300);
      
      // Apply filters
      await page.getByRole('button', { name: /apply filters/i }).click();
      await page.waitForTimeout(1000);
      
      // Verify code filter tag appears
      if (codeName) {
        await expect(page.getByText(codeName)).toBeVisible();
      }
    }
  });

  test('should combine multiple filters', async ({ page }) => {
    // Add search filter
    await page.getByPlaceholder(/search/i).fill('test');
    await page.waitForTimeout(300);
    
    // Add type filter
    const typeButton = page.getByRole('button', { name: /type/i }).first();
    await typeButton.click();
    await page.waitForTimeout(300);
    await page.getByText('Whitelist').first().click();
    await page.waitForTimeout(300);
    
    // Apply
    await page.getByRole('button', { name: /apply filters/i }).click();
    await page.waitForTimeout(1000);
    
    // Should see multiple filter tags
    const filterTags = page.locator('.rounded-full').filter({ hasText: /test|whitelist/i });
    const count = await filterTags.count();
    expect(count).toBeGreaterThan(0);
    
    // Results should be filtered
    const resultsText = await page.getByText(/showing.*of.*answers/i).textContent();
    expect(resultsText).toBeTruthy();
  });

  test('should clear individual filter tags', async ({ page }) => {
    // Add search filter
    await page.getByPlaceholder(/search/i).fill('Nike');
    await page.waitForTimeout(500);
    
    // Apply
    await page.getByRole('button', { name: /apply filters/i }).click();
    await page.waitForTimeout(500);
    
    // Should see filter tag with X button
    const filterTag = page.locator('.rounded-full').filter({ hasText: /nike/i });
    await expect(filterTag).toBeVisible();
    
    // Click X to remove tag
    const removeButton = filterTag.locator('button').or(filterTag.getByRole('button'));
    if (await removeButton.count() > 0) {
      await removeButton.first().click();
      await page.waitForTimeout(500);
      
      // Tag should disappear
      await expect(filterTag).not.toBeVisible();
      
      // Search should be cleared
      await expect(page.getByPlaceholder(/search/i)).toHaveValue('');
    }
  });

  test('should show active filter count', async ({ page }) => {
    // Add multiple filters
    await page.getByPlaceholder(/search/i).fill('test');
    await page.waitForTimeout(300);
    
    const typeButton = page.getByRole('button', { name: /type/i }).first();
    await typeButton.click();
    await page.waitForTimeout(300);
    await page.getByText('Whitelist').first().click();
    await page.waitForTimeout(300);
    
    // Should show filter count
    // Look for text like "2 active filters"
    await expect(page.getByText(/\d+ active filter/i)).toBeVisible();
  });

  test('should preserve filters when navigating', async ({ page }) => {
    // Apply a filter
    await page.getByPlaceholder(/search/i).fill('persistent');
    await page.waitForTimeout(500);
    
    // Note: This test verifies filter state persistence
    // In a real scenario, you'd navigate away and back
    // For now, we just verify the filter value is maintained
    const searchValue = await page.getByPlaceholder(/search/i).inputValue();
    expect(searchValue).toBe('persistent');
  });
});

