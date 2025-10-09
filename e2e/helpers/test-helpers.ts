import { Page, expect } from '@playwright/test';

/**
 * Reusable helper functions for E2E tests
 * These make your tests easier to read and maintain
 */

/**
 * Wait for page to fully load
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Navigate to home page
 */
export async function goToHome(page: Page) {
  await page.goto('/');
  await waitForPageLoad(page);
}

/**
 * Navigate to categories page
 */
export async function goToCategories(page: Page) {
  await page.goto('/');
  await waitForPageLoad(page);
  await expect(page.getByText('Categories')).toBeVisible();
}

/**
 * Navigate to codes page
 */
export async function goToCodes(page: Page) {
  await page.goto('/codes');
  await waitForPageLoad(page);
}

/**
 * Navigate to coding page for a specific category
 */
export async function goToCodingPage(page: Page, categoryId: number) {
  await page.goto(`/coding?categoryId=${categoryId}`);
  await waitForPageLoad(page);
}

/**
 * Add a new category
 */
export async function addCategory(page: Page, categoryName: string) {
  // Click Add Category button
  await page.getByRole('button', { name: /add category/i }).click();
  
  // Fill in the name
  await page.getByPlaceholder(/enter category name/i).fill(categoryName);
  
  // Click Save
  await page.getByRole('button', { name: /save/i }).click();
  
  // Wait for success (modal closes)
  await page.waitForTimeout(500);
}

/**
 * Delete a category
 */
export async function deleteCategory(page: Page, categoryName: string) {
  // Find the category row
  const categoryRow = page.locator(`text=${categoryName}`).locator('..');
  
  // Click delete button
  await categoryRow.getByRole('button', { name: /delete/i }).click();
  
  // Confirm deletion
  await page.getByRole('button', { name: /confirm|yes|delete/i }).click();
  
  // Wait for deletion
  await page.waitForTimeout(500);
}

/**
 * Search for items in a table
 */
export async function searchInTable(page: Page, searchTerm: string) {
  await page.getByPlaceholder(/search/i).fill(searchTerm);
  await page.waitForTimeout(300); // Wait for debounce
}

/**
 * Apply filters
 */
export async function applyFilters(page: Page) {
  await page.getByRole('button', { name: /apply filters/i }).click();
  await page.waitForTimeout(300);
}

/**
 * Reset filters
 */
export async function resetFilters(page: Page) {
  await page.getByRole('button', { name: /reset/i }).click();
  await page.waitForTimeout(300);
}

/**
 * Select rows in a table
 */
export async function selectRowByText(page: Page, text: string) {
  const row = page.locator(`text=${text}`).locator('..');
  await row.locator('input[type="checkbox"]').check();
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ 
    path: `test-results/screenshots/${name}.png`,
    fullPage: true 
  });
}

/**
 * Wait for specific element to be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { 
    state: 'visible',
    timeout 
  });
}

/**
 * Check if element exists (without throwing)
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).count() > 0;
}

/**
 * Get table row count
 */
export async function getTableRowCount(page: Page, tableSelector = 'table'): Promise<number> {
  return await page.locator(`${tableSelector} tbody tr`).count();
}

/**
 * Wait for loading spinner to disappear
 */
export async function waitForLoadingToFinish(page: Page) {
  // Wait for any loading spinners to disappear
  await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 }).catch(() => {
    // Ignore if no spinner found
  });
}

/**
 * Login helper (if you add authentication later)
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await waitForPageLoad(page);
}

/**
 * Verify toast/notification appears
 */
export async function expectToastMessage(page: Page, message: string) {
  await expect(page.getByText(message)).toBeVisible({ timeout: 5000 });
}

/**
 * Close modal/dialog
 */
export async function closeModal(page: Page) {
  // Try different ways to close modal
  const closeButton = page.getByRole('button', { name: /close|cancel|×/i });
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    // Try ESC key
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(300);
}

