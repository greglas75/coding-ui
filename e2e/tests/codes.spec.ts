import { expect, test } from '@playwright/test';
import { goToCodes, waitForLoadingToFinish } from '../helpers/test-helpers';

/**
 * 🎯 CODES MANAGEMENT TESTS
 * 
 * Tests for the codes list page.
 * 
 * 🎬 TO RECORD YOUR OWN TESTS:
 *    npm run test:e2e:record
 */

test.describe('Codes Management', () => {
  test.beforeEach(async ({ page: _page }) => {
    await goToCodes(page);
    await waitForLoadingToFinish(page);
  });

  test('should display codes list', async ({ page: _page }) => {
    // Check that we're on the codes page
    await expect(page.getByText(/codes/i)).toBeVisible();
    
    // Check for Add Code button
    await expect(page.getByRole('button', { name: /add code/i })).toBeVisible();
  });

  test('should open add code modal', async ({ page: _page }) => {
    // Click Add Code button
    await page.getByRole('button', { name: /add code/i }).click();
    
    // Modal should appear
    await expect(page.getByText(/add new code/i)).toBeVisible();
    
    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Modal should disappear
    await expect(page.getByText(/add new code/i)).not.toBeVisible();
  });

  test('should add a new code', async ({ page: _page }) => {
    const codeName = `TestCode${Date.now()}`;
    
    // Click Add Code
    await page.getByRole('button', { name: /add code/i }).click();
    
    // Fill in code name
    await page.getByPlaceholder(/enter code name/i).fill(codeName);
    
    // Save
    await page.getByRole('button', { name: /save/i }).click();
    
    // Wait for modal to close
    await page.waitForTimeout(1000);
    
    // Verify code appears in list
    await expect(page.getByText(codeName)).toBeVisible();
  });

  // 🎬 RECORD THESE TESTS YOURSELF!
  
  test.skip('should edit code name (RECORD THIS)', async ({ page: _page }) => {
    // RECORD THIS:
    // 1. Click edit icon next to a code
    // 2. Change the name
    // 3. Click save
    // 4. Verify name updated
  });

  test.skip('should toggle whitelist status (RECORD THIS)', async ({ page: _page }) => {
    // RECORD THIS:
    // 1. Find a code row
    // 2. Click the whitelist checkbox
    // 3. Verify it toggles
  });

  test.skip('should delete a code (RECORD THIS)', async ({ page: _page }) => {
    // RECORD THIS:
    // 1. Click delete button
    // 2. Confirm deletion
    // 3. Verify code disappears
  });
});

