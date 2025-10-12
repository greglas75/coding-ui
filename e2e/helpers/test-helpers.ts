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

/**
 * ============================================
 * AI HELPERS
 * ============================================
 */

/**
 * Trigger AI suggestion for a specific row
 */
export async function triggerAISuggestion(page: Page, rowIndex: number) {
  const aiButton = page.locator('tbody tr').nth(rowIndex).getByRole('button', { name: /ai|suggest/i });
  await aiButton.click();
  await page.waitForTimeout(1000); // Wait for AI to respond
}

/**
 * Accept AI suggestion for a specific row
 */
export async function acceptAISuggestion(page: Page, rowIndex: number) {
  const acceptButton = page.locator('tbody tr').nth(rowIndex).getByRole('button', { name: /accept|confirm/i });
  await acceptButton.click();
  await page.waitForTimeout(500);
}

/**
 * Reject AI suggestion for a specific row
 */
export async function rejectAISuggestion(page: Page, rowIndex: number) {
  const rejectButton = page.locator('tbody tr').nth(rowIndex).getByRole('button', { name: /reject|dismiss/i });
  await rejectButton.click();
  await page.waitForTimeout(500);
}

/**
 * ============================================
 * API HELPERS
 * ============================================
 */

/**
 * Make an API request
 */
export async function makeApiRequest(
  request: any,
  endpoint: string,
  method: string,
  body?: any
): Promise<any> {
  const options: any = { data: body };

  let response;
  switch (method.toUpperCase()) {
    case 'GET':
      response = await request.get(endpoint);
      break;
    case 'POST':
      response = await request.post(endpoint, options);
      break;
    case 'PUT':
      response = await request.put(endpoint, options);
      break;
    case 'DELETE':
      response = await request.delete(endpoint);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }

  return response;
}

/**
 * Upload file to page
 */
export async function uploadFile(page: Page, filePath: string) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(500);
}

/**
 * Download file and return download object
 */
export async function downloadFile(page: Page, buttonText: string) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: new RegExp(buttonText, 'i') }).click();
  const download = await downloadPromise;
  return download;
}

/**
 * ============================================
 * KEYBOARD HELPERS
 * ============================================
 */

/**
 * Press a keyboard shortcut
 */
export async function pressKeyboardShortcut(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
}

/**
 * Navigate with arrow keys
 */
export async function navigateWithArrows(
  page: Page,
  direction: 'up' | 'down' | 'left' | 'right'
) {
  const keyMap = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight'
  };

  await page.keyboard.press(keyMap[direction]);
  await page.waitForTimeout(200);
}

/**
 * ============================================
 * NETWORK HELPERS
 * ============================================
 */

/**
 * Set context to offline mode
 */
export async function goOffline(context: any) {
  await context.setOffline(true);
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Set context to online mode
 */
export async function goOnline(context: any) {
  await context.setOffline(false);
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Mock an API error response
 */
export async function mockApiError(page: Page, endpoint: string, statusCode: number) {
  await page.route(`**${endpoint}**`, route => {
    route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Mocked error response' })
    });
  });
}

/**
 * ============================================
 * PERFORMANCE HELPERS
 * ============================================
 */

/**
 * Measure page load time
 */
export async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  const endTime = Date.now();
  return endTime - startTime;
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}
