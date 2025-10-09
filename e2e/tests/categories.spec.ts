import { test } from '@playwright/test';
import { 
  goToCategories, 
  addCategory: _addCategory, 
  waitForPageLoad: _waitForPageLoad,
  waitForLoadingToFinish 
} from '../helpers/test-helpers';

/**
 * 🎯 CATEGORIES PAGE TESTS
 * 
 * These tests verify the category management functionality.
 * You can RECORD these tests by running:
 * 
 *   npm run test:e2e:record
 * 
 * Then click through the app and Playwright will write the code for you!
 */

test.describe('Categories Management', () => {
  test.beforeEach(async ({ page: _page }) => {
    // Navigate to categories page before each test
    await goToCategories(page);
  });

  test('should display categories list', async ({ page: _page }) => {
    // Wait for loading to finish
    await waitForLoadingToFinish(page);
    
    // Check that the page loaded
    await expect(page.getByText(/categories/i)).toBeVisible();
    
    // Check that we can see the add category button
    await expect(page.getByRole('button', { name: /add category/i })).toBeVisible();
  });

  test('should open and close add category modal', async ({ page: _page }) => {
    // Click Add Category button
    await page.getByRole('button', { name: /add category/i }).click();
    
    // Modal should be visible
    await expect(page.getByText(/add new category/i)).toBeVisible();
    
    // Close the modal (click Cancel or X)
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Modal should disappear
    await expect(page.getByText(/add new category/i)).not.toBeVisible();
  });

  test('should add a new category', async ({ page: _page }) => {
    const categoryName = `Test Category ${Date.now()}`;
    
    // Click Add Category button
    await page.getByRole('button', { name: /add category/i }).click();
    
    // Fill in category name
    await page.getByPlaceholder(/enter category name/i).fill(categoryName);
    
    // Click Save
    await page.getByRole('button', { name: /save/i }).click();
    
    // Wait for modal to close and list to update
    await page.waitForTimeout(1000);
    
    // Verify category appears in list
    await expect(page.getByText(categoryName)).toBeVisible();
  });

  test('should show error when adding category with empty name', async ({ page: _page }) => {
    // Click Add Category button
    await page.getByRole('button', { name: /add category/i }).click();
    
    // Try to save without entering name
    await page.getByRole('button', { name: /save/i }).click();
    
    // Should show error message
    await expect(page.getByText(/required|cannot be empty/i)).toBeVisible();
  });

  // 🎬 RECORD THIS TEST YOURSELF!
  // Run: npm run test:e2e:record
  // Then:
  // 1. Click on a category
  // 2. Click "Start Coding"
  // 3. Verify the coding page opens
  // 4. Playwright will generate the code for you!
  test.skip('should navigate to coding page when category clicked (RECORD THIS)', async ({ page: _page }) => {
    // This test is skipped - you will record it yourself!
    // Run: npm run test:e2e:record
  });
});

