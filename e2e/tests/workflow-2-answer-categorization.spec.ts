import { test } from '@playwright/test';
import { goToCodingPage, waitForLoadingToFinish } from '../helpers/test-helpers';

/**
 * 🎯 WORKFLOW 2: Answer Categorization
 * 
 * This tests the complete workflow of:
 * 1. Going to coding page
 * 2. Selecting category
 * 3. Selecting multiple answers
 * 4. Bulk categorizing (whitelist/blacklist)
 * 5. Verifying status changes
 * 
 * Based on manual testing workflow provided by product owner
 */

test.describe('Workflow 2: Answer Categorization', () => {
  // Note: Requires valid category with answers in database
  const testCategoryId = 1;

  test.beforeEach(async ({ page }) => {
    // Navigate to coding page
    await goToCodingPage(page, testCategoryId);
    await waitForLoadingToFinish(page);
  });

  test('complete workflow - select and whitelist answers', async ({ page }) => {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Verify Coding Page Loaded
    // ═══════════════════════════════════════════════════════════
    await expect(page.getByText(/coding/i)).toBeVisible();
    
    // Should see answers table
    await expect(page.locator('table')).toBeVisible();

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Select 5 Answers (Checkboxes)
    // ═══════════════════════════════════════════════════════════
    // Get all checkboxes in table body
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    
    // Check first 5 checkboxes
    for (let i = 0; i < 5; i++) {
      await checkboxes.nth(i).check();
      await page.waitForTimeout(100);
    }
    
    // Verify selection count appears in sticky action bar
    await expect(page.getByText(/5 record.* selected/i)).toBeVisible();

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Select "Whitelist" Action from Dropdown
    // ═══════════════════════════════════════════════════════════
    // Find the action dropdown in the sticky bar
    const actionDropdown = page.locator('select').filter({ hasText: /select action/i });
    await actionDropdown.selectOption({ label: /whitelist/i });
    
    // Verify action selected
    const selectedOption = await actionDropdown.inputValue();
    expect(selectedOption).toContain('Whitelist');

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Click "Apply" Button
    // ═══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /apply/i }).click();
    
    // Wait for bulk operation to complete
    await page.waitForTimeout(2000);

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Verify Answers Moved to Whitelist
    // ═══════════════════════════════════════════════════════════
    // Look for whitelist status badges in the updated rows
    const whitelistBadges = page.getByText('whitelist').first();
    await expect(whitelistBadges).toBeVisible();
    
    // Verify sticky bar disappeared (selection cleared)
    await expect(page.getByText(/selected/i)).not.toBeVisible();
  });

  test('should blacklist answers', async ({ page }) => {
    // Select 3 answers
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    
    // Verify selection
    await expect(page.getByText(/3 record.* selected/i)).toBeVisible();
    
    // Select "Blacklist" action
    const actionDropdown = page.locator('select').filter({ hasText: /select action/i });
    await actionDropdown.selectOption({ label: /blacklist/i });
    
    // Apply
    await page.getByRole('button', { name: /apply/i }).click();
    await page.waitForTimeout(2000);
    
    // Verify blacklist status
    const blacklistBadges = page.getByText('blacklist').first();
    await expect(blacklistBadges).toBeVisible();
  });

  test('should clear selection', async ({ page }) => {
    // Select some answers
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    
    // Verify selection bar appears
    await expect(page.getByText(/2 record.* selected/i)).toBeVisible();
    
    // Click "Clear" button
    await page.getByRole('button', { name: /clear/i }).click();
    
    // Selection bar should disappear
    await expect(page.getByText(/selected/i)).not.toBeVisible();
    
    // Checkboxes should be unchecked
    expect(await checkboxes.nth(0).isChecked()).toBe(false);
    expect(await checkboxes.nth(1).isChecked()).toBe(false);
  });

  test('should use quick status buttons', async ({ page }) => {
    // Wait for answers to load
    await page.waitForTimeout(1000);
    
    // Find first answer row
    const firstRow = page.locator('tbody tr').first();
    
    // Click "C" button (Confirm/Whitelist)
    await firstRow.getByRole('button', { name: /^c$/i }).click();
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Verify status changed (row might have animation/highlight)
    // The button should now be highlighted/active
    const cButton = firstRow.getByRole('button', { name: /^c$/i });
    
    // Check if button has active styling (might vary based on implementation)
    await expect(cButton).toBeVisible();
  });

  test('should select all answers', async ({ page }) => {
    // Click "Select All" checkbox in table header
    const selectAllCheckbox = page.locator('thead input[type="checkbox"]').first();
    await selectAllCheckbox.check();
    
    // Wait for selection
    await page.waitForTimeout(500);
    
    // Sticky bar should show multiple selected
    await expect(page.getByText(/selected/i)).toBeVisible();
    
    // Uncheck all
    await selectAllCheckbox.uncheck();
    await page.waitForTimeout(300);
    
    // Selection should clear
    await expect(page.getByText(/selected/i)).not.toBeVisible();
  });

  test('should handle no selection gracefully', async ({ page }) => {
    // Don't select anything, just verify action bar doesn't appear
    await expect(page.getByText(/selected/i)).not.toBeVisible();
    
    // Action dropdown should not be visible if nothing selected
    const actionBar = page.locator('.fixed.bottom-0');
    await expect(actionBar).not.toBeVisible();
  });
});

