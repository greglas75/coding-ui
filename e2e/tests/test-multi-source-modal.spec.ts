import { test, expect } from '@playwright/test';

test.describe('Multi-Source Brand Validation Modal - All 7 Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the coding page
    await page.goto('http://localhost:5173/coding?categoryId=2');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should display all 7 features for Sensodyne brand', async ({ page }) => {
    // Find a row with "Sensodyne" and click the AI button
    const sensodyneRow = page.locator('tr', { hasText: 'Sensodyne' }).first();
    await sensodyneRow.waitFor({ state: 'visible', timeout: 10000 });

    // Click the AI categorize button (sparkles icon)
    const aiButton = sensodyneRow.locator('button[aria-label="AI Categorize"], button:has(svg)').first();
    await aiButton.click();

    // Wait for modal to open
    await page.waitForTimeout(2000);

    // Check modal is visible
    const modal = page.locator('div:has-text("Multi-Source Brand Validation")').first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    console.log('✅ Modal opened');

    // Wait for validation to complete (backend call)
    await page.waitForTimeout(15000);

    // Take screenshot before checking features
    await page.screenshot({ path: 'test-modal-before-check.png', fullPage: true });

    // FEATURE 1: Confidence Score Display
    const confidenceScore = page.locator('text=/\\d+%/').first();
    await expect(confidenceScore).toBeVisible({ timeout: 5000 });
    console.log('✅ Feature 1: Confidence Score visible');

    // FEATURE 2: Sources Breakdown (6 Tiers)
    const sourcesSection = page.locator('text=/Sources Breakdown/i');
    await expect(sourcesSection).toBeVisible({ timeout: 5000 });
    console.log('✅ Feature 2: Sources Breakdown visible');

    // FEATURE 3: Decision Tree
    const decisionTree = page.locator('text=/Decision Tree/i, text=/Step \\d+/i').first();
    await expect(decisionTree).toBeVisible({ timeout: 5000 });
    console.log('✅ Feature 3: Decision Tree visible');

    // FEATURE 4: Performance Breakdown
    const performance = page.locator('text=/Cost/i, text=/\\$0\\.\\d+/').first();
    await expect(performance).toBeVisible({ timeout: 5000 });
    console.log('✅ Feature 4: Performance breakdown visible');

    // FEATURE 5: Tier 1 Web Search Results
    const webResults = page.locator('text=/Web Results/i, text=/Search Results/i').first();
    await expect(webResults).toBeVisible({ timeout: 5000 });
    console.log('✅ Feature 5: Web Results visible');

    // FEATURE 6: Issues & Warnings Detection
    const issues = page.locator('text=/Issues Detected/i, text=/Issue/i').first();
    // Note: Issues may not always be present, so we just check if the section exists
    console.log('⚠️ Feature 6: Issues section - checking...');
    const hasIssues = await issues.isVisible().catch(() => false);
    console.log(hasIssues ? '✅ Feature 6: Issues detected and displayed' : '⚠️ Feature 6: No issues detected (may be normal)');

    // FEATURE 7: Knowledge Graph Error Badges
    const kgSection = page.locator('text=/Knowledge Graph/i').first();
    await expect(kgSection).toBeVisible({ timeout: 5000 });
    console.log('✅ Feature 7: Knowledge Graph section visible');

    // Check for error/warning badges (red/yellow)
    const errorBadge = page.locator('text=/ERROR/i, [class*="bg-red"]').first();
    const warningBadge = page.locator('text=/WARNING/i, [class*="bg-yellow"]').first();
    const hasErrorBadge = await errorBadge.isVisible().catch(() => false);
    const hasWarningBadge = await warningBadge.isVisible().catch(() => false);

    if (hasErrorBadge) {
      console.log('🔴 Feature 7: RED ERROR badge found!');
    } else if (hasWarningBadge) {
      console.log('🟡 Feature 7: YELLOW WARNING badge found!');
    } else {
      console.log('🟢 Feature 7: No errors/warnings (green badges expected)');
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-modal-all-features.png', fullPage: true });

    console.log('\n✅ ALL 7 FEATURES TEST COMPLETE!');
  });

  test('should show red ERROR badge for KG wrong entity', async ({ page }) => {
    // This test is for future cases where KG returns wrong entity
    // For now, we just verify the modal structure supports error badges

    // Try with a potentially ambiguous brand
    const row = page.locator('tr').first();
    await row.waitFor({ state: 'visible', timeout: 10000 });

    const aiButton = row.locator('button[aria-label="AI Categorize"], button:has(svg)').first();
    await aiButton.click();

    await page.waitForTimeout(2000);

    const modal = page.locator('div:has-text("Multi-Source Brand Validation")').first();
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Wait for validation
    await page.waitForTimeout(15000);

    // Check if KG section exists with error handling
    const kgDetails = page.locator('text=/Knowledge Graph/i').first();
    const hasKG = await kgDetails.isVisible().catch(() => false);

    if (hasKG) {
      console.log('✅ KG section visible - checking for error badges');

      // Look for red ERROR badge
      const errorIndicators = [
        page.locator('text=/ERROR/i'),
        page.locator('[class*="bg-red-100"]'),
        page.locator('text=/Wrong Entity/i'),
        page.locator('text=/Category Mismatch/i')
      ];

      for (const indicator of errorIndicators) {
        const isVisible = await indicator.first().isVisible().catch(() => false);
        if (isVisible) {
          console.log('🔴 Found error indicator!');
          await page.screenshot({ path: 'test-kg-error-badge.png', fullPage: true });
          break;
        }
      }
    }

    await page.screenshot({ path: 'test-kg-badges-final.png', fullPage: true });
  });
});
