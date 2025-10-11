// ═══════════════════════════════════════════════════════════════
// 🧪 E2E Test Helpers - Reusable functions for Playwright tests
// ═══════════════════════════════════════════════════════════════

import { Page, expect } from '@playwright/test';

// ───────────────────────────────────────────────────────────────
// Navigation Helpers
// ───────────────────────────────────────────────────────────────

export async function navigateToCategories(page: Page) {
  await page.click('a[href*="/categories"]');
  await page.waitForSelector('table', { timeout: 10000 });
}

export async function navigateToCoding(page: Page, categoryIndex: number = 0) {
  await navigateToCategories(page);
  await page.waitForSelector('table tbody tr', { timeout: 10000 });
  await page.locator('table tbody tr').nth(categoryIndex).click();
  await page.waitForURL('**/coding/**', { timeout: 10000 });
}

export async function navigateToCodes(page: Page, categoryId?: number) {
  if (categoryId) {
    await page.goto(`/categories/${categoryId}/codes`);
  } else {
    await page.click('a[href*="/codes"]');
  }
  await page.waitForTimeout(1000);
}

// ───────────────────────────────────────────────────────────────
// Category Helpers
// ───────────────────────────────────────────────────────────────

export async function createCategory(page: Page, name: string) {
  await navigateToCategories(page);

  const addButton = page.locator('button:has-text("Add Category"), button:has-text("New")').first();
  await addButton.click();

  const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
  await nameInput.fill(name);

  const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
  await submitButton.click();

  await page.waitForTimeout(1000);
}

export async function deleteCategory(page: Page, categoryName: string) {
  await navigateToCategories(page);

  const categoryRow = page.locator(`table tbody tr:has-text("${categoryName}")`);
  const deleteButton = categoryRow.locator('button:has-text("Delete")');

  await deleteButton.click();

  // Confirm deletion
  const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').last();
  await confirmButton.click();

  await page.waitForTimeout(1000);
}

// ───────────────────────────────────────────────────────────────
// Code Helpers
// ───────────────────────────────────────────────────────────────

export async function createCode(page: Page, name: string, isWhitelisted: boolean = false) {
  const addButton = page.locator('button:has-text("Add Code"), button:has-text("New Code")').first();
  await addButton.click();

  const nameInput = page.locator('input[name="name"], input[placeholder*="code" i]').first();
  await nameInput.fill(name);

  if (isWhitelisted) {
    const whitelistCheckbox = page.locator('input[type="checkbox"]');
    await whitelistCheckbox.check();
  }

  const submitButton = page.locator('button:has-text("Save"), button:has-text("Add")').first();
  await submitButton.click();

  await page.waitForTimeout(1000);
}

// ───────────────────────────────────────────────────────────────
// Answer Coding Helpers
// ───────────────────────────────────────────────────────────────

export async function codeAnswer(page: Page, answerIndex: number = 0, codeIndex: number = 0) {
  // Wait for answers to load
  await page.waitForSelector('table tbody tr', { timeout: 10000 });

  // Click answer
  await page.locator('table tbody tr').nth(answerIndex).click();

  // Wait for modal
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

  // Click code
  const codeButton = page.locator('[role="dialog"] button, [role="dialog"] [class*="code"]').nth(codeIndex);
  await codeButton.click();

  // Wait for modal to close
  await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
}

export async function bulkCodeAnswers(page: Page, answerIndexes: number[], codeIndex: number = 0) {
  // Select multiple answers
  for (const index of answerIndexes) {
    await page.locator('table tbody tr').nth(index).click({ modifiers: ['Control'] });
    await page.waitForTimeout(200);
  }

  // Click batch assign button
  const batchButton = page.locator('button:has-text("Batch"), button:has-text("Assign")').first();
  await batchButton.click();

  // Select code in batch modal
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  const codeButton = page.locator('[role="dialog"] button').nth(codeIndex);
  await codeButton.click();

  await page.waitForTimeout(1000);
}

// ───────────────────────────────────────────────────────────────
// Filter Helpers
// ───────────────────────────────────────────────────────────────

export async function applyFilter(page: Page, filterType: string, filterValue: string) {
  const filterSelect = page.locator(`select[name="${filterType}"], [aria-label="${filterType}"]`).first();

  if (await filterSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await filterSelect.click();
    await filterSelect.selectOption(filterValue);
    await page.waitForTimeout(1000);
  }
}

export async function searchAnswers(page: Page, searchTerm: string) {
  const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
  await searchInput.fill(searchTerm);
  await page.waitForTimeout(1000);
}

export async function clearFilters(page: Page) {
  const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset")').first();

  if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await clearButton.click();
    await page.waitForTimeout(1000);
  }
}

// ───────────────────────────────────────────────────────────────
// Export/Import Helpers
// ───────────────────────────────────────────────────────────────

export async function exportData(page: Page, format: 'excel' | 'csv' | 'json' = 'excel') {
  const exportButton = page.locator('button:has-text("Export")').first();
  await exportButton.click();

  // Wait for export modal
  await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

  // Select format
  const formatButton = page.locator(`[role="dialog"] button:has-text("${format}"), [role="dialog"] text=${format}`).first();
  if (await formatButton.isVisible().catch(() => false)) {
    await formatButton.click();
  }

  // Set up download listener
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

  // Click export button in modal
  const exportInModal = page.locator('[role="dialog"] button:has-text("Export Data"), [role="dialog"] button:has-text("Download")').first();
  await exportInModal.click();

  // Wait for download
  const download = await downloadPromise;

  return download;
}

export async function importData(page: Page, filePath: string, strategy: 'merge' | 'replace' = 'merge') {
  const importButton = page.locator('button:has-text("Import")').first();
  await importButton.click();

  // Wait for import modal
  await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

  // Select strategy
  const strategyButton = page.locator(`[role="dialog"] button:has-text("${strategy}")`).first();
  if (await strategyButton.isVisible().catch(() => false)) {
    await strategyButton.click();
  }

  // Upload file
  const fileInput = page.locator('[role="dialog"] input[type="file"]');
  await fileInput.setInputFiles(filePath);

  // Wait for import to complete
  await page.waitForTimeout(3000);
}

// ───────────────────────────────────────────────────────────────
// Assertion Helpers
// ───────────────────────────────────────────────────────────────

export async function expectTableHasRows(page: Page, minRows: number = 1) {
  const rowCount = await page.locator('table tbody tr').count();
  expect(rowCount).toBeGreaterThanOrEqual(minRows);
}

export async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return () => {
    const criticalErrors = errors.filter(
      err => !err.includes('Failed to fetch') &&
             !err.includes('NetworkError') &&
             !err.includes('IndexedDB')
    );

    if (criticalErrors.length > 0) {
      console.warn('Console errors:', criticalErrors);
    }

    return criticalErrors;
  };
}

// ───────────────────────────────────────────────────────────────
// Wait Helpers
// ───────────────────────────────────────────────────────────────

export async function waitForLoadingToFinish(page: Page) {
  // Wait for any loading indicators to disappear
  await page.waitForSelector('[class*="loading"], [class*="spin"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
}

export async function waitForModalToOpen(page: Page, timeout: number = 5000) {
  await page.waitForSelector('[role="dialog"], [class*="modal"]', { timeout });
}

export async function waitForModalToClose(page: Page, timeout: number = 5000) {
  await page.waitForSelector('[role="dialog"], [class*="modal"]', { state: 'hidden', timeout });
}

export async function waitForToast(page: Page, message?: string, timeout: number = 5000) {
  if (message) {
    await page.waitForSelector(`[role="status"]:has-text("${message}"), text="${message}"`, { timeout });
  } else {
    await page.waitForSelector('[role="status"], [class*="toast"]', { timeout });
  }
}

// ───────────────────────────────────────────────────────────────
// Keyboard Helpers
// ───────────────────────────────────────────────────────────────

export async function pressShortcut(page: Page, key: string, modifiers: string[] = []) {
  await page.keyboard.press(key, { modifiers: modifiers as any });
  await page.waitForTimeout(300);
}

export async function openShortcutsHelp(page: Page) {
  await pressShortcut(page, '?');
  await waitForModalToOpen(page);
}

// ───────────────────────────────────────────────────────────────
// Data Helpers
// ───────────────────────────────────────────────────────────────

export async function getAnswerCount(page: Page): Promise<number> {
  await page.waitForSelector('table tbody tr, [class*="answer"]', { timeout: 10000 });
  return await page.locator('table tbody tr, [class*="answer"]').count();
}

export async function getCategoryCount(page: Page): Promise<number> {
  await navigateToCategories(page);
  return await page.locator('table tbody tr').count();
}

export async function getCodedAnswersCount(page: Page): Promise<number> {
  return await page.locator('[class*="coded"], [class*="whitelist"], td:has-text("Coded")').count();
}

// ───────────────────────────────────────────────────────────────
// Screenshot Helpers
// ───────────────────────────────────────────────────────────────

export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}

export async function takeScreenshotOnFailure(page: Page, testName: string, error: Error) {
  console.error(`Test failed: ${testName}`, error.message);
  await takeScreenshot(page, `failure-${testName}-${Date.now()}`);
}

