import { test } from '@playwright/test';
import { waitForPageLoad, waitForLoadingToFinish } from '../helpers/test-helpers';

/**
 * 🎯 WORKFLOW 1: Category and Code Management
 * 
 * This tests the complete workflow of:
 * 1. Adding a new category
 * 2. Adding codes to that category
 * 3. Editing category
 * 4. Managing category details
 * 
 * Based on manual testing workflow provided by product owner
 */

test.describe('Workflow 1: Category and Code Management', () => {
  const testCategoryName = `Fashion Brands ${Date.now()}`;
  const testCodeName = `Nike ${Date.now()}`;

  test('complete workflow - add category and codes', async ({ page }) => {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Navigate to Categories Page
    // ═══════════════════════════════════════════════════════════
    await page.goto('/');
    await waitForPageLoad(page);
    await waitForLoadingToFinish(page);
    
    // Verify we're on the categories page
    await expect(page.getByText(/categories/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /add category/i })).toBeVisible();

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Add New Category "Fashion Brands"
    // ═══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /add category/i }).click();
    
    // Modal should appear
    await expect(page.getByText(/add new category/i)).toBeVisible();
    
    // Fill in category name
    await page.getByPlaceholder(/enter category name/i).fill(testCategoryName);
    
    // Save the category
    await page.getByRole('button', { name: /save/i }).click();
    
    // Wait for modal to close
    await page.waitForTimeout(1000);
    
    // ═══════════════════════════════════════════════════════════
    // STEP 3: Verify "Fashion Brands" Appears in List
    // ═══════════════════════════════════════════════════════════
    await expect(page.getByText(testCategoryName)).toBeVisible();
    
    // Should show "0 codes assigned" initially
    const categoryRow = page.locator(`text=${testCategoryName}`).locator('..');
    await expect(categoryRow.getByText(/0 codes/i)).toBeVisible();

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Click on "Fashion Brands" to Open Details
    // ═══════════════════════════════════════════════════════════
    await page.getByText(testCategoryName).first().click();
    
    // Wait for category details to load
    await page.waitForTimeout(1000);
    await waitForLoadingToFinish(page);
    
    // Should see category details/codes section
    await expect(page.getByRole('button', { name: /add code/i })).toBeVisible();

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Add Code "Nike"
    // ═══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /add code/i }).click();
    
    // Modal should appear
    await expect(page.getByText(/add new code/i)).toBeVisible();
    
    // Enter code name
    await page.getByPlaceholder(/enter code name/i).fill(testCodeName);
    
    // Check the category checkbox (assign to current category)
    // Look for checkbox near the category name
    const checkbox = page.locator(`text=${testCategoryName}`).locator('..').locator('input[type="checkbox"]').first();
    await checkbox.check();
    
    // Save the code
    await page.getByRole('button', { name: /save/i }).click();
    
    // Wait for modal to close
    await page.waitForTimeout(1000);

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Verify "Nike" Appears in Code List
    // ═══════════════════════════════════════════════════════════
    await expect(page.getByText(testCodeName)).toBeVisible();
    
    // Verify the code is associated with the category
    const codeRow = page.locator(`text=${testCodeName}`).locator('..');
    await expect(codeRow.getByText(testCategoryName)).toBeVisible();
  });

  test('should edit category name', async ({ page }) => {
    const originalName = `Original ${Date.now()}`;
    const newName = `Updated ${Date.now()}`;

    // Go to categories page
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Add category
    await page.getByRole('button', { name: /add category/i }).click();
    await page.getByPlaceholder(/enter category name/i).fill(originalName);
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);
    
    // Verify created
    await expect(page.getByText(originalName)).toBeVisible();
    
    // Find and click edit button (look for edit icon near the category)
    const categoryRow = page.locator(`text=${originalName}`).locator('..');
    await categoryRow.getByRole('button', { name: /edit/i }).click();
    
    // Edit modal should appear
    await expect(page.getByText(/edit category/i)).toBeVisible();
    
    // Clear and enter new name
    await page.getByPlaceholder(/enter category name/i).clear();
    await page.getByPlaceholder(/enter category name/i).fill(newName);
    
    // Save
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);
    
    // Verify name updated
    await expect(page.getByText(newName)).toBeVisible();
    await expect(page.getByText(originalName)).not.toBeVisible();
  });

  test('should show error when adding category with empty name', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    
    // Open add modal
    await page.getByRole('button', { name: /add category/i }).click();
    
    // Try to save without entering name
    await page.getByRole('button', { name: /save/i }).click();
    
    // Should show error
    await expect(page.getByText(/required|cannot be empty/i)).toBeVisible();
    
    // Modal should still be open
    await expect(page.getByText(/add new category/i)).toBeVisible();
  });

  test('should prevent adding duplicate category name', async ({ page }) => {
    const duplicateName = `Duplicate ${Date.now()}`;

    await page.goto('/');
    await waitForPageLoad(page);
    
    // Add first category
    await page.getByRole('button', { name: /add category/i }).click();
    await page.getByPlaceholder(/enter category name/i).fill(duplicateName);
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);
    
    // Try to add same name again
    await page.getByRole('button', { name: /add category/i }).click();
    await page.getByPlaceholder(/enter category name/i).fill(duplicateName);
    await page.getByRole('button', { name: /save/i }).click();
    
    // Should show error about duplicate
    await expect(page.getByText(/already exists|duplicate/i)).toBeVisible();
  });
});

