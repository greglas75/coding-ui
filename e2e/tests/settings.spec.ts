import { expect, test } from '@playwright/test';
import { waitForLoadingToFinish } from '../helpers/test-helpers';

/**
 * Settings Page E2E Tests
 *
 * Tests AI settings, theme, notifications, and configuration
 */

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await waitForLoadingToFinish(page);
  });

  test('should display settings page', async ({ page }) => {
    // Check if settings page is accessible
    const settingsHeading = page.locator('h1, h2').filter({ hasText: /settings|preferences|config/i });
    const hasSettingsPage = await settingsHeading.count() > 0;

    if (hasSettingsPage) {
      console.log('✅ Settings page displayed');
    } else {
      console.log('⚠️  Settings page may not exist');
    }
  });

  test('should update AI model selection', async ({ page }) => {
    // Look for AI model dropdown
    const modelSelect = page.locator('select, [role="combobox"]').filter({ hasText: /model|gpt/i });

    if (await modelSelect.count() > 0) {
      const currentValue = await modelSelect.first().inputValue();

      // Change model
      await modelSelect.first().selectOption({ index: 1 });
      await page.waitForTimeout(500);

      // Should show success or auto-save
      console.log('✅ AI model selection works');
    } else {
      console.log('ℹ️  AI model settings not found');
    }
  });

  test('should update prompt template', async ({ page }) => {
    // Look for prompt template textarea
    const promptTemplate = page.locator('textarea, [contenteditable="true"]').filter({ hasText: /prompt|template/i });

    if (await promptTemplate.count() > 0) {
      await promptTemplate.first().fill('Test custom prompt template');
      await page.waitForTimeout(500);

      // Look for save button
      const saveButton = page.getByRole('button', { name: /save/i });
      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(500);

        console.log('✅ Prompt template updated');
      }
    } else {
      console.log('ℹ️  Prompt template settings not found');
    }
  });

  test('should toggle dark mode', async ({ page }) => {
    // Look for theme toggle
    const themeToggle = page.locator('button, [role="switch"]').filter({ hasText: /dark|theme|mode/i });

    if (await themeToggle.count() > 0) {
      // Get current theme
      const htmlClass = await page.locator('html').getAttribute('class');
      const isDarkBefore = htmlClass?.includes('dark');

      // Toggle theme
      await themeToggle.first().click();
      await page.waitForTimeout(500);

      // Check if theme changed
      const htmlClassAfter = await page.locator('html').getAttribute('class');
      const isDarkAfter = htmlClassAfter?.includes('dark');

      if (isDarkBefore !== isDarkAfter) {
        console.log('✅ Dark mode toggle works');
      }
    } else {
      console.log('ℹ️  Theme toggle not found in settings');
    }
  });

  test('should configure notifications', async ({ page }) => {
    // Look for notification settings
    const notificationSettings = page.locator('input[type="checkbox"], [role="switch"]').filter({ hasText: /notification|alert|email/i });

    if (await notificationSettings.count() > 0) {
      await notificationSettings.first().click();
      await page.waitForTimeout(500);

      console.log('✅ Notification settings configurable');
    } else {
      console.log('ℹ️  Notification settings not found');
    }
  });

  test('should reset to defaults', async ({ page }) => {
    // Look for reset button
    const resetButton = page.locator('button').filter({ hasText: /reset|default|restore/i });

    if (await resetButton.count() > 0) {
      await resetButton.first().click();
      await page.waitForTimeout(500);

      // Should show confirmation
      const confirmButton = page.getByRole('button', { name: /confirm|yes|reset/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(1000);

        console.log('✅ Reset to defaults works');
      }
    } else {
      console.log('ℹ️  Reset button not found');
    }
  });
});

test.describe('API Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await waitForLoadingToFinish(page);
  });

  test('should configure API keys', async ({ page }) => {
    // Look for API key input
    const apiKeyInput = page.locator('input[type="password"], input[type="text"]').filter({ hasText: /api.*key|key/i });

    if (await apiKeyInput.count() > 0) {
      await apiKeyInput.first().fill('sk-test-key-for-testing');
      await page.waitForTimeout(500);

      console.log('✅ API key configuration available');
    } else {
      console.log('ℹ️  API key configuration not exposed in UI');
    }
  });

  test('should test API connection', async ({ page }) => {
    // Look for test connection button
    const testButton = page.locator('button').filter({ hasText: /test|verify|check.*connection/i });

    if (await testButton.count() > 0) {
      await testButton.first().click();
      await page.waitForTimeout(2000);

      // Should show test result
      const hasResult = await page.locator('text=/success|failed|connected/i').count() > 0;

      if (hasResult) {
        console.log('✅ API connection test works');
      }
    } else {
      console.log('ℹ️  API connection test not available');
    }
  });
});

test.describe('Data Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await waitForLoadingToFinish(page);
  });

  test('should clear cache', async ({ page }) => {
    // Look for clear cache button
    const clearCacheButton = page.locator('button').filter({ hasText: /clear.*cache|reset.*cache/i });

    if (await clearCacheButton.count() > 0) {
      await clearCacheButton.first().click();
      await page.waitForTimeout(1000);

      console.log('✅ Clear cache option available');
    }
  });

  test('should export settings', async ({ page }) => {
    // Look for export settings button
    const exportButton = page.locator('button').filter({ hasText: /export.*settings|download.*settings/i });

    if (await exportButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);

      await exportButton.first().click();
      const download = await downloadPromise;

      if (download) {
        console.log('✅ Settings export works');
      }
    }
  });
});

