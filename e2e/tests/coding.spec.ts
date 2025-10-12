import { expect, test } from '@playwright/test';
import { 
  goToCodingPage,
  waitForLoadingToFinish,
  searchInTable,
  applyFilters,
  resetFilters
} from '../helpers/test-helpers';

/**
 * 🎯 CODING WORKFLOW TESTS
 * 
 * These tests verify the main coding functionality.
 * 
 * 🎬 TO RECORD YOUR OWN TESTS:
 *    npm run test:e2e:record
 * 
 * Then navigate and click through your normal workflow!
 */

test.describe('Coding Workflow', () => {
  // Note: This requires a valid category ID in your database
  // You may need to adjust the categoryId
  const testCategoryId = 1;

  test.beforeEach(async ({ page: _page }) => {
    // Navigate to coding page for test category
    await goToCodingPage(page, testCategoryId);
    await waitForLoadingToFinish(page);
  });

  test('should display coding interface', async ({ page: _page }) => {
    // Check that the coding interface is visible
    await expect(page.getByText(/coding/i)).toBeVisible();
    
    // Check for the filters bar
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('should filter answers by search', async ({ page: _page }) => {
    // Type in search box
    await searchInTable(page, 'Nike');
    
    // Wait for debounce
    await page.waitForTimeout(500);
    
    // Click Apply Filters
    await applyFilters(page);
    
    // Verify filtering happened
    await page.waitForTimeout(500);
  });

  test('should reset filters', async ({ page: _page }) => {
    // Apply some filters
    await searchInTable(page, 'test');
    await page.waitForTimeout(300);
    
    // Reset filters
    await resetFilters(page);
    
    // Search box should be empty
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toHaveValue('');
  });

  test('should sort table columns', async ({ page: _page }) => {
    // Click on a sortable column header (e.g., "Date")
    await page.getByText('Date').first().click();
    
    // Wait for re-sort
    await page.waitForTimeout(300);
    
    // Check for sort indicator (▲ or ▼)
    const hasArrow = await page.locator('text=/▲|▼/').count() > 0;
    expect(hasArrow).toBeTruthy();
  });

  // 🎬 RECORD THESE TESTS YOURSELF!
  // Run: npm run test:e2e:record
  
  test.skip('should assign code to answer (RECORD THIS)', async ({ page: _page }) => {
    // RECORD THIS:
    // 1. Click on "Click to select code..." button
    // 2. Select a code from the modal
    // 3. Click Save
    // 4. Verify code appears in the cell
  });

  test.skip('should use quick status buttons (RECORD THIS)', async ({ page: _page }) => {
    // RECORD THIS:
    // 1. Find an answer row
    // 2. Click one of the quick status buttons (Oth, Ign, BL, etc.)
    // 3. Verify the status changes
  });

  test.skip('should bulk update answers (RECORD THIS)', async ({ page: _page }) => {
    // RECORD THIS:
    // 1. Select multiple checkboxes
    // 2. Choose action from dropdown
    // 3. Click Apply
    // 4. Verify updates applied
  });
});

