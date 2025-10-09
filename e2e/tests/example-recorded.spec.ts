import { test } from '@playwright/test';

/**
 * 🎬 EXAMPLE: This is what a RECORDED test looks like!
 * 
 * This test was "written" by Playwright Codegen after watching a user
 * click through the app. You don't need to write this code manually!
 * 
 * HOW TO CREATE TESTS LIKE THIS:
 * 
 * 1. Make sure your app is running:
 *    npm run dev
 * 
 * 2. Start the recorder:
 *    npm run test:e2e:record
 * 
 * 3. A browser opens - just use your app normally:
 *    - Click buttons
 *    - Fill in forms
 *    - Navigate pages
 *    - Do whatever you normally test manually
 * 
 * 4. Playwright generates the code as you click!
 * 
 * 5. Copy the code into a new test file
 * 
 * 6. Run it:
 *    npm run test:e2e
 * 
 * That's it! No coding required on your part.
 */

test('example: navigate and interact (auto-generated)', async ({ page }) => {
  // This is what Playwright generates when you record your actions:
  
  // Go to the homepage
  await page.goto('http://localhost:5173/');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Click on a button (Playwright records the exact selector)
  // await page.getByRole('button', { name: 'Add Category' }).click();

  // Fill in a form field
  // await page.getByPlaceholder('Enter category name...').fill('My Category');

  // Click submit
  // await page.getByRole('button', { name: 'Save' }).click();

  // Wait for success
  // await expect(page.getByText('My Category')).toBeVisible();

  // ⬆️ This is example code. When you record, Playwright will generate
  // the actual selectors and actions based on what YOU click!
});

/**
 * 🎓 TIPS FOR RECORDING GOOD TESTS:
 * 
 * 1. ✅ Do one clear workflow at a time
 *    Example: "Add category" → don't also edit and delete in same recording
 * 
 * 2. ✅ Wait for things to load
 *    Playwright records your waits automatically
 * 
 * 3. ✅ Verify results
 *    After saving, look for the success message or new item
 *    Playwright will record these checks too!
 * 
 * 4. ✅ Use readable names
 *    test('should add category', ...) - good ✅
 *    test('test1', ...) - bad ❌
 * 
 * 5. ✅ One assertion per test
 *    Test ONE thing, not multiple features
 * 
 * 6. ✅ Clean up after tests
 *    If you create data, try to delete it at the end
 *    (Or use test.afterEach to clean up)
 */

/**
 * 🔧 COMMON COMMANDS WHILE RECORDING:
 * 
 * - Click "Assert visibility" to check if element is visible
 * - Click "Assert text" to verify text content
 * - Click "Assert value" to check input values
 * - Press ESC to pause recording
 * - Click "Resume" to continue
 * - Click "Copy" to copy generated code
 */

