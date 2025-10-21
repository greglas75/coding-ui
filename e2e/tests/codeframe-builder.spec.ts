/**
 * E2E Tests for AI Codeframe Builder
 * Tests the complete flow: Select Type → Select Data → Configure → Process → Review → Apply
 */

import { test, expect } from '@playwright/test';

test.describe('AI Codeframe Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to codeframe builder
    await page.goto('/codeframe/builder');
    await expect(page.locator('h1')).toContainText('AI Codeframe Builder');
  });

  test('should display Step 0: Select Type with three coding options', async ({ page }) => {
    // Check step indicator shows "Select Type" as current step
    await expect(page.locator('text=Select Type').first()).toBeVisible();

    // Check all three coding type cards are visible (use more specific selectors)
    await expect(page.locator('button:has-text("Brand Tracking")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Open-ended Analysis")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Sentiment Analysis")').first()).toBeVisible();

    // Check Next button is disabled initially
    const nextButton = page.locator('button:has-text("Next: Select Data")');
    await expect(nextButton).toBeDisabled();
  });

  test('should enable Next button after selecting a coding type', async ({ page }) => {
    // Select Brand Tracking
    await page.locator('button:has-text("Brand Tracking")').click();

    // Check that the card shows "Selected"
    await expect(page.locator('text=Selected')).toBeVisible();

    // Check Next button is now enabled
    const nextButton = page.locator('button:has-text("Next: Select Data")');
    await expect(nextButton).toBeEnabled();
  });

  test('should navigate to Step 1: Select Data after choosing type', async ({ page }) => {
    // Select Open-ended Analysis
    await page.locator('button:has-text("Open-ended Analysis")').click();

    // Click Next
    await page.locator('button:has-text("Next: Select Data")').click();

    // Verify we're on Step 1
    await expect(page.locator('h2:has-text("Select Data for Codebook")')).toBeVisible();
  });

  test('should show categories with uncategorized answer counts', async ({ page }) => {
    // Select type and go to Step 1
    await page.locator('button:has-text("Open-ended Analysis")').click();
    await page.locator('button:has-text("Next: Select Data")').click();

    // Wait for categories to load
    await page.waitForSelector('[data-testid="category-card"], text=Loading', { timeout: 5000 });

    // Check that at least one category is shown with uncategorized count
    const categoryCards = page.locator('[data-testid="category-card"]');
    const count = await categoryCards.count();

    if (count > 0) {
      // Verify first category shows uncategorized count
      await expect(categoryCards.first()).toContainText('Uncategorized');
    } else {
      // Or verify "no categories" message
      await expect(page.locator('text=No categories')).toBeVisible();
    }
  });

  test.describe('Complete Flow - Open-ended Coding', () => {
    test('should complete full codeframe generation and application', async ({ page }) => {
      // Step 0: Select Type
      await page.locator('button:has-text("Open-ended Analysis")').click();
      await page.locator('button:has-text("Next: Select Data")').click();

      // Step 1: Select Data
      // Wait for categories to load
      await page.waitForSelector('[data-testid="category-card"], text=No categories', { timeout: 10000 });

      const categoryCard = page.locator('[data-testid="category-card"]').first();
      const hasCat = await categoryCard.count() > 0;

      if (hasCat) {
        await categoryCard.click();
        await page.locator('button:has-text("Next: Configure")').click();

        // Step 2: Configure
        await expect(page.locator('h2:has-text("Configure Generation")')).toBeVisible();

        // Verify clustering settings are visible for open-ended
        await expect(page.locator('text=Clustering Settings')).toBeVisible();
        await expect(page.locator('text=Minimum Cluster Size')).toBeVisible();

        // Click Generate Codebook
        await page.locator('button:has-text("Generate Codebook")').click();

        // Step 3: Processing
        await expect(page.locator('text=Generating Codebook')).toBeVisible({ timeout: 10000 });

        // Wait for processing to complete (or timeout)
        // This is where we expect the 500 error currently
        await page.waitForSelector(
          'text=Review & Edit, text=Error',
          { timeout: 120000 }
        );

        // Check if we reached Review step or got an error
        const hasError = await page.locator('text=Error').isVisible();
        const hasReview = await page.locator('text=Review & Edit').isVisible();

        if (hasError) {
          // Document the error for debugging
          const errorText = await page.locator('[class*="error"], [class*="Error"]').first().textContent();
          console.log('Error occurred:', errorText);

          // This test should fail here - documenting the bug
          expect(hasError).toBe(false);
        } else if (hasReview) {
          // Step 4: Review & Edit
          await expect(page.locator('h2:has-text("Review & Edit Codebook")')).toBeVisible();

          // Click "Save & Continue"
          await page.locator('button:has-text("Save"), button:has-text("Continue")').first().click();

          // Step 5: Apply
          await expect(page.locator('h2:has-text("Apply Codebook")')).toBeVisible();

          // Try to apply
          await page.locator('button:has-text("Apply to All Answers")').click();

          // Wait for result (success or error)
          await page.waitForSelector(
            'text=Success, text=Error, text=completed',
            { timeout: 30000 }
          );

          // Check for the 500 error on apply
          const applyError = await page.locator('text=Request failed with status code 500').isVisible();

          if (applyError) {
            console.log('Apply failed with 500 error');
            expect(applyError).toBe(false); // Should not have error
          }
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Brand Coding Specific', () => {
    test('should NOT show clustering settings for Brand Tracking', async ({ page }) => {
      // Select Brand Tracking
      await page.locator('button:has-text("Brand Tracking")').click();
      await page.locator('button:has-text("Next: Select Data")').click();

      // Select a category (if available)
      const categoryCard = page.locator('[data-testid="category-card"]').first();
      const hasCat = await categoryCard.count() > 0;

      if (hasCat) {
        await categoryCard.click();
        await page.locator('button:has-text("Next: Configure")').click();

        // Verify clustering settings are HIDDEN for brand tracking
        // TODO: This will fail until we implement conditional rendering
        await expect(page.locator('text=Clustering Settings')).not.toBeVisible();
      } else {
        test.skip();
      }
    });
  });
});
