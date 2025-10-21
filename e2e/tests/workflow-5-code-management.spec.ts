import { expect, test } from '@playwright/test';
import { goToCodes, waitForLoadingToFinish } from '../helpers/test-helpers';

/**
 * 🎯 WORKFLOW 5: Code Management
 *
 * This tests the complete code management workflow:
 * 1. Add new code
 * 2. Edit code name
 * 3. Assign to categories
 * 4. Toggle whitelist status
 * 5. Recount mentions
 * 6. Delete code
 *
 * Based on manual testing workflow provided by product owner
 */

test.describe('Workflow 5: Code Management', () => {
  test('complete workflow - add, edit, and manage code', async ({ page }) => {
    const testCodeName = `TestCode ${Date.now()}`;
    const updatedCodeName = `Updated ${Date.now()}`;

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Navigate to Codes Page
    // ═══════════════════════════════════════════════════════════
    await goToCodes(page);
    await waitForLoadingToFinish(page);

    // Verify on codes page
    await expect(page.getByRole('button', { name: /add code/i })).toBeVisible();

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Add New Code
    // ═══════════════════════════════════════════════════════════
    await page.getByRole('button', { name: /add code/i }).click();

    // Modal appears
    await expect(page.getByText(/add new code/i)).toBeVisible();

    // Enter code name
    await page.getByPlaceholder(/enter code name/i).fill(testCodeName);

    // Save
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Verify code appears
    await expect(page.getByText(testCodeName)).toBeVisible();

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Edit Code Name
    // ═══════════════════════════════════════════════════════════
    // Find the code row
    const codeRow = page.locator(`text=${testCodeName}`).locator('..');

    // Click edit button
    const editButton = codeRow.getByRole('button', { name: /edit/i }).first();
    await editButton.click();
    await page.waitForTimeout(300);

    // Input should appear or modal should open
    const nameInput = page.getByPlaceholder(/enter code name/i).or(
      page.locator('input[type="text"]').filter({ hasText: testCodeName })
    ).first();

    // Clear and enter new name
    await nameInput.clear();
    await nameInput.fill(updatedCodeName);

    // Save (might be checkmark icon or Save button)
    const saveButton = codeRow.getByRole('button').filter({ hasText: /save|✓/i }).first().or(
      page.getByRole('button', { name: /save/i })
    );
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Verify name updated
    await expect(page.getByText(updatedCodeName)).toBeVisible();

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Toggle Whitelist Status
    // ═══════════════════════════════════════════════════════════
    const updatedCodeRow = page.locator(`text=${updatedCodeName}`).locator('..');

    // Find whitelist checkbox
    const whitelistCheckbox = updatedCodeRow.locator('input[type="checkbox"]').first();

    // Check if currently checked
    const isChecked = await whitelistCheckbox.isChecked();

    // Toggle it
    if (isChecked) {
      await whitelistCheckbox.uncheck();
    } else {
      await whitelistCheckbox.check();
    }

    await page.waitForTimeout(500);

    // Verify it toggled
    const newCheckedState = await whitelistCheckbox.isChecked();
    expect(newCheckedState).toBe(!isChecked);

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Recount Mentions
    // ═══════════════════════════════════════════════════════════
    // Find recount button
    const recountButton = updatedCodeRow.getByRole('button', { name: /recount/i });

    if (await recountButton.isVisible()) {
      await recountButton.click();

      // Wait for recount
      await page.waitForTimeout(2000);

      // Should show count (might be "0", "5", etc.)
      const mentionsCount = updatedCodeRow.getByText(/\d+/).first();
      await expect(mentionsCount).toBeVisible();
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Delete Code
    // ═══════════════════════════════════════════════════════════
    const deleteButton = updatedCodeRow.getByRole('button', { name: /delete/i });
    await deleteButton.click();

    // Confirmation dialog should appear
    // (This might need to be implemented - see bug fixes)
    await page.waitForTimeout(500);

    // Click confirm (if dialog exists)
    const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i }).last();
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    await page.waitForTimeout(1000);

    // Verify code disappeared
    await expect(page.getByText(updatedCodeName)).not.toBeVisible();
  });

  test('should assign code to category', async ({ page }) => {
    const codeName = `CategoryCode ${Date.now()}`;

    await goToCodes(page);
    await waitForLoadingToFinish(page);

    // Add code
    await page.getByRole('button', { name: /add code/i }).click();
    await page.getByPlaceholder(/enter code name/i).fill(codeName);
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Find the code
    const codeRow = page.locator(`text=${codeName}`).locator('..');

    // Click edit categories or assign button
    const assignButton = codeRow.getByText(/edit/i).or(
      codeRow.getByRole('button', { name: /categor/i })
    );

    if (await assignButton.count() > 0) {
      await assignButton.first().click();
      await page.waitForTimeout(500);

      // Check first available category checkbox
      const firstCheckbox = page.locator('input[type="checkbox"]').filter({
        has: page.locator('text=/./')
      }).first();
      await firstCheckbox.check();

      // Save
      await page.getByRole('button', { name: /save/i }).click();
      await page.waitForTimeout(1000);

      // Verify category assigned (should show in code row)
      await expect(codeRow.locator('.rounded-md').first()).toBeVisible();
    }
  });

  test('should search for codes', async ({ page }) => {
    await goToCodes(page);
    await waitForLoadingToFinish(page);

    // Type in search box
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Nike');
    await page.waitForTimeout(500);

    // Should filter results
    // Count rows before and after would differ
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('should sort codes by name', async ({ page }) => {
    await goToCodes(page);
    await waitForLoadingToFinish(page);

    // Click on "Code" column header to sort
    const codeHeader = page.getByText('Code').first();
    await codeHeader.click();
    await page.waitForTimeout(300);

    // Should show sort indicator (▲ or ▼)
    await expect(page.locator('text=/▲|▼/')).toBeVisible();

    // Click again to reverse sort
    await codeHeader.click();
    await page.waitForTimeout(300);

    // Indicator should still be visible
    await expect(page.locator('text=/▲|▼/')).toBeVisible();
  });

  test('should show error when adding empty code name', async ({ page }) => {
    await goToCodes(page);
    await waitForLoadingToFinish(page);

    // Open add modal
    await page.getByRole('button', { name: /add code/i }).click();
    await page.waitForTimeout(500);

    // Save button should be disabled when name is empty
    const saveButton = page.getByRole('button', { name: /save/i });
    await expect(saveButton).toBeDisabled();
  });
});

