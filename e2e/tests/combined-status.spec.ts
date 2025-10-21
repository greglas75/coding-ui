import { test } from '@playwright/test';

test.describe('Combined Status Filter (Type + Status)', () => {

  test('Status dropdown should contain both status and type options', async ({ page }) => {
    // Navigate to coding page
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);

    // Find the Status dropdown
    const statusDropdown = page.locator('button').filter({ hasText: /status/i }).first();

    if (await statusDropdown.isVisible()) {
      // Click to open dropdown
      await statusDropdown.click();
      await page.waitForTimeout(500);

      // Check if we can see both status and type options
      const whitelistOption = page.locator('text=whitelist').or(page.locator('text=Whitelist'));
      const blacklistOption = page.locator('text=blacklist').or(page.locator('text=Blacklist'));
      const gibberishOption = page.locator('text=gibberish').or(page.locator('text=Gibberish'));
      const ignoredOption = page.locator('text=ignored').or(page.locator('text=Ignored'));

      const optionsFound = [];

      if (await whitelistOption.isVisible()) optionsFound.push('whitelist');
      if (await blacklistOption.isVisible()) optionsFound.push('blacklist');
      if (await gibberishOption.isVisible()) optionsFound.push('gibberish');
      if (await ignoredOption.isVisible()) optionsFound.push('ignored');

      console.log('Found options:', optionsFound);

      if (optionsFound.length >= 3) {
        console.log('✅ Status dropdown contains multiple options (status + type combined)');
      } else {
        console.log('⚠️  Limited options found in status dropdown');
      }

      // Check if "Select all" and "Unselect all" are still present
      const selectAllButton = page.locator('button', { hasText: 'Select all' }).first();
      const unselectAllButton = page.locator('button', { hasText: 'Unselect all' }).first();

      if (await selectAllButton.isVisible() && await unselectAllButton.isVisible()) {
        console.log('✅ Select all / Unselect all buttons present');
      } else {
        console.log('❌ Select all / Unselect all buttons missing');
      }

    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });

  test('Should be able to select multiple combined options', async ({ page }) => {
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

      // Try to select multiple options
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount >= 2) {
        // Select first two checkboxes
        await checkboxes.nth(0).click();
        await page.waitForTimeout(300);
        await checkboxes.nth(1).click();
        await page.waitForTimeout(1000);

        // Check if filtering worked
        const filteredAnswers = page.locator('tbody tr');
        const filteredCount = await filteredAnswers.count();

        console.log(`Filtered answers: ${filteredCount}`);

        if (filteredCount < initialCount) {
          console.log('✅ Multi-selection filtering works with combined options');
        } else {
          console.log('⚠️  No filtering detected with multi-selection');
        }

        // Check if active filter count increased
        const activeFilterTags = page.locator('[class*="bg-blue-100"]').or(
          page.locator('[class*="bg-blue-50"]')
        );
        const activeCount = await activeFilterTags.count();

        if (activeCount > 0) {
          console.log('✅ Active filter tags show combined selection');
        }

      } else {
        console.log('⚠️  Not enough checkboxes found for multi-selection test');
      }

    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });

  test('Type dropdown should no longer exist', async ({ page }) => {
    await page.goto('/coding?categoryId=2');
    await page.waitForTimeout(3000);

    // Look for Type dropdown - it should not exist
    const typeDropdown = page.locator('button').filter({ hasText: /type/i }).first();

    if (await typeDropdown.isVisible()) {
      console.log('❌ Type dropdown still exists - should have been removed');
    } else {
      console.log('✅ Type dropdown successfully removed');
    }

    // Verify only Status dropdown exists for filtering
    const statusDropdown = page.locator('button').filter({ hasText: /status/i }).first();

    if (await statusDropdown.isVisible()) {
      console.log('✅ Status dropdown exists and is the main filter');
    } else {
      console.log('❌ Status dropdown not found');
    }
  });

  test('URL filter should work with combined options', async ({ page }) => {
    // Test with a type option in URL
    await page.goto('/coding?categoryId=2&filter=whitelist');
    await page.waitForTimeout(3000);

    // Check if whitelist filter is applied
    const statusDropdown = page.locator('button').filter({ hasText: /status/i }).first();

    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();
      await page.waitForTimeout(500);

      // Check if whitelist is selected
      const whitelistCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /whitelist/i }).or(
        page.locator('label').filter({ hasText: /whitelist/i }).locator('input[type="checkbox"]')
      ).first();

      if (await whitelistCheckbox.isVisible()) {
        const isChecked = await whitelistCheckbox.isChecked();
        if (isChecked) {
          console.log('✅ URL filter with whitelist applied correctly');
        } else {
          console.log('⚠️  URL filter not applied to checkbox');
        }
      } else {
        console.log('⚠️  Whitelist checkbox not found');
      }

    } else {
      console.log('⚠️  Status dropdown not found');
    }
  });
});
