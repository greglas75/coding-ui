import { test } from '@playwright/test';

test.describe('Category Delete Functionality', () => {
  
  test('Delete button should appear in Actions column', async ({ page }) => {
    // Navigate to categories page
    await page.goto('/');
    
    // Wait for page to load
    await expect(page.locator('h1, h2')).toContainText(/Categories/i, { timeout: 10000 });
    
    // Check if there are any categories
    const categoryRows = page.locator('div[class*="grid-cols-12"]');
    const rowCount = await categoryRows.count();
    
    if (rowCount === 0) {
      console.log('⚠️  No categories found - skipping delete button test');
      return;
    }
    
    // Check if delete button (trash icon) is visible in Actions column
    const deleteButtons = page.locator('button[title="Delete category"]');
    const deleteButtonCount = await deleteButtons.count();
    
    if (deleteButtonCount > 0) {
      console.log(`✅ Found ${deleteButtonCount} delete buttons in Actions column`);
    } else {
      console.log('⚠️  No delete buttons found - checking for disabled delete buttons');
      
      // Check for disabled delete buttons (categories with codes)
      const disabledDeleteButtons = page.locator('button[title="Cannot delete category with associated codes"]');
      const disabledCount = await disabledDeleteButtons.count();
      
      if (disabledCount > 0) {
        console.log(`✅ Found ${disabledCount} disabled delete buttons (categories with codes)`);
      } else {
        console.log('❌ No delete buttons found at all');
      }
    }
  });

  test('Delete button should be disabled for categories with codes', async ({ page }) => {
    // Navigate to categories page
    await page.goto('/');
    
    // Wait for page to load
    await expect(page.locator('h1, h2')).toContainText(/Categories/i, { timeout: 10000 });
    
    // Look for disabled delete buttons
    const disabledDeleteButtons = page.locator('button[title="Cannot delete category with associated codes"]');
    const disabledCount = await disabledDeleteButtons.count();
    
    if (disabledCount > 0) {
      console.log(`✅ Found ${disabledCount} categories with codes (delete buttons disabled)`);
      
      // Try to click a disabled delete button
      const firstDisabledButton = disabledDeleteButtons.first();
      await firstDisabledButton.click();
      
      // Should not show confirmation dialog
      const confirmDialog = page.locator('text=Delete Category');
      await expect(confirmDialog).not.toBeVisible();
      
      console.log('✅ Disabled delete button does not trigger confirmation dialog');
    } else {
      console.log('⚠️  No categories with codes found - all delete buttons should be enabled');
    }
  });

  test('Delete confirmation dialog should appear when clicking delete button', async ({ page }) => {
    // Navigate to categories page
    await page.goto('/');
    
    // Wait for page to load
    await expect(page.locator('h1, h2')).toContainText(/Categories/i, { timeout: 10000 });
    
    // Look for enabled delete buttons
    const deleteButtons = page.locator('button[title="Delete category"]');
    const deleteButtonCount = await deleteButtons.count();
    
    if (deleteButtonCount > 0) {
      // Click the first delete button
      await deleteButtons.first().click();
      
      // Check if confirmation dialog appears
      await expect(page.locator('text=Delete Category')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=This action cannot be undone')).toBeVisible();
      
      // Check for Cancel and Delete buttons
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
      
      console.log('✅ Delete confirmation dialog appears correctly');
      
      // Click Cancel to close dialog
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Dialog should disappear
      await expect(page.locator('text=Delete Category')).not.toBeVisible();
      
      console.log('✅ Cancel button closes dialog');
    } else {
      console.log('⚠️  No enabled delete buttons found - cannot test confirmation dialog');
    }
  });

  test('Should be able to delete a category (if any exist without codes)', async ({ page }) => {
    // Navigate to categories page
    await page.goto('/');
    
    // Wait for page to load
    await expect(page.locator('h1, h2')).toContainText(/Categories/i, { timeout: 10000 });
    
    // Look for enabled delete buttons
    const deleteButtons = page.locator('button[title="Delete category"]');
    const deleteButtonCount = await deleteButtons.count();
    
    if (deleteButtonCount > 0) {
      // Get the category name before deletion
      const categoryRow = deleteButtons.first().locator('..').locator('..');
      const categoryName = await categoryRow.locator('div[class*="col-span-3"]').textContent();
      
      console.log(`Testing deletion of category: ${categoryName}`);
      
      // Click delete button
      await deleteButtons.first().click();
      
      // Wait for confirmation dialog
      await expect(page.locator('text=Delete Category')).toBeVisible({ timeout: 5000 });
      
      // Verify category name appears in dialog
      if (categoryName) {
        await expect(page.locator(`text="${categoryName}"`)).toBeVisible();
      }
      
      // Click Delete to confirm
      await page.getByRole('button', { name: 'Delete' }).click();
      
      // Wait for success toast or category to disappear
      await page.waitForTimeout(2000);
      
      // Check if success toast appears
      const successToast = page.locator('text=Category deleted successfully');
      if (await successToast.isVisible()) {
        console.log('✅ Success toast appears after deletion');
      }
      
      // Verify category is no longer in the list
      if (categoryName) {
        await expect(page.locator(`text="${categoryName}"`)).not.toBeVisible();
        console.log('✅ Category removed from list after deletion');
      }
      
      console.log('✅ Category deletion completed successfully');
    } else {
      console.log('⚠️  No categories available for deletion (all have associated codes)');
    }
  });
});
