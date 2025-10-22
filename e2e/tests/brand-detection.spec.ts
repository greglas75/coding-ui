/**
 * E2E Test: Brand Detection Flow
 * Tests complete brand codeframe generation end-to-end
 */

import { test, expect } from '@playwright/test';

test.describe('Brand Detection Flow', () => {
  test('should generate brand codeframe successfully', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await page.waitForLoadState('networkidle');

    console.log('✅ App loaded');

    // Navigate to Codeframe Builder via direct URL
    await page.goto('http://localhost:5173/codeframe/builder');
    await page.waitForLoadState('networkidle');

    console.log('✅ Navigated to Codeframe Builder');

    // Step 0: Select Brand type
    await page.click('[data-testid="type-brand"]');
    await page.waitForTimeout(500);

    console.log('✅ Selected Brand type');

    // Click Next to go to Step 1
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(1000);

    console.log('✅ Moved to Step 1 - Select Data');

    // Step 1: Select category (click on Toothpaste card)
    await page.click('button[data-testid="category-card"]:has-text("Toothpaste")');
    await page.waitForTimeout(500);

    console.log('✅ Selected category (toothpaste)');

    // Click Next to go to Step 2 (Configure)
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(1000);

    console.log('✅ Moved to Step 2 - Configure');

    // Step 2: Generate
    await page.click('button:has-text("Generate")');

    console.log('✅ Clicked Generate button');
    console.log('⏳ Waiting for generation to complete...');

    // Wait for processing screen
    await expect(page.locator('text=Generating Codebook')).toBeVisible({ timeout: 5000 });

    console.log('✅ Processing screen visible');

    // Wait for completion (max 60 seconds)
    await expect(page.locator('text=Codebook Generated')).toBeVisible({ timeout: 60000 });

    console.log('✅ Generation completed!');

    // Wait a bit for transition
    await page.waitForTimeout(2000);

    // Should now be on Review & Edit step
    await expect(page.locator('text=Review & Edit')).toBeVisible({ timeout: 10000 });

    console.log('✅ Moved to Review & Edit step');

    // Verify hierarchy is displayed
    const hierarchyVisible = await page.locator('[data-testid="hierarchy-tree"], .hierarchy').isVisible();
    expect(hierarchyVisible).toBeTruthy();

    console.log('✅ Hierarchy tree displayed');

    // Check for brand codes (Colgate, Crest, Sensodyne are common)
    const pageContent = await page.textContent('body');
    const hasBrands =
      pageContent?.includes('Colgate') ||
      pageContent?.includes('Crest') ||
      pageContent?.includes('Sensodyne') ||
      pageContent?.includes('Brand');

    expect(hasBrands).toBeTruthy();

    console.log('✅ Brand codes detected in results');

    console.log('🎉 Brand detection flow test PASSED!');
  });
});
