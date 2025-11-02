import { test, expect } from '@playwright/test';

test.describe('CORS and Server Health Test', () => {
  test('should verify CORS is working and servers are healthy', async ({ page }) => {
    // Enable console logging to catch CORS errors
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        errors.push(text);
        console.log('🔴 Console Error:', text);
      }
    });

    // Listen for failed requests
    page.on('requestfailed', request => {
      const errorMsg = `Request failed: ${request.url()} - ${request.failure()?.errorText}`;
      errors.push(errorMsg);
      console.log('🔴 Request Failed:', errorMsg);
    });

    console.log('📍 Step 1: Navigating to settings page...');
    await page.goto('/settings');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');

    // Take screenshot of initial page state
    await page.screenshot({ path: `test-results/step-1-loaded.png`, fullPage: true });

    console.log('📍 Step 2: Checking server status indicators...');

    // Check that server status shows green (both servers healthy)
    // Look for the ServerStatus component
    const pythonStatusContainer = page.locator('text=Python').locator('..');
    const nodeStatusContainer = page.locator('text=Node.js').locator('..');

    console.log('Waiting for server status indicators...');

    // Wait for status icons to be visible (either green or red)
    await expect(pythonStatusContainer).toBeVisible({ timeout: 30000 });
    await expect(nodeStatusContainer).toBeVisible({ timeout: 30000 });

    // Take screenshot of server status
    await page.screenshot({ path: `test-results/step-2-server-status.png`, fullPage: true });

    // Check for green checkmark icons (CheckCircle2 with text-green-500 class)
    const pythonGreenIcon = pythonStatusContainer.locator('svg.text-green-500');
    const nodeGreenIcon = nodeStatusContainer.locator('svg.text-green-500');

    // Check if servers are healthy
    const isPythonHealthy = await pythonGreenIcon.isVisible().catch(() => false);
    const isNodeHealthy = await nodeGreenIcon.isVisible().catch(() => false);

    console.log('Python Backend Health:', isPythonHealthy ? '✅ Healthy' : '❌ Down');
    console.log('Node.js API Health:', isNodeHealthy ? '✅ Healthy' : '❌ Down');

    // Expect both servers to be healthy
    expect(isPythonHealthy, 'Python backend should be healthy (green icon)').toBe(true);
    expect(isNodeHealthy, 'Node.js API should be healthy (green icon)').toBe(true);

    console.log('📍 Step 3: Testing API call to check for CORS errors...');

    // Try to click on Pinecone tab if it exists (to trigger an API call)
    const pineconeTab = page.getByRole('button', { name: /pinecone/i });
    const hasPineconeTab = await pineconeTab.isVisible().catch(() => false);

    if (hasPineconeTab) {
      console.log('Found Pinecone tab, clicking...');
      await pineconeTab.click();
      await page.waitForTimeout(2000);

      // Try to find and click Test Connection button
      const testButton = page.getByRole('button', { name: /test connection/i });
      const hasTestButton = await testButton.isVisible().catch(() => false);

      if (hasTestButton) {
        console.log('Clicking Test Connection button...');
        await testButton.click();

        // Wait for the request to complete
        await page.waitForTimeout(5000);
      }
    }

    // Take final screenshot
    await page.screenshot({ path: `test-results/step-3-final.png`, fullPage: true });

    console.log('📍 Step 4: Checking for CORS errors...');

    // Check for CORS errors
    const corsErrors = errors.filter(err =>
      err.toLowerCase().includes('cors') ||
      err.toLowerCase().includes('access-control-allow-origin') ||
      err.toLowerCase().includes('cross-origin')
    );

    console.log('\n=== Error Summary ===');
    console.log('Total errors captured:', errors.length);
    console.log('CORS-related errors:', corsErrors.length);

    if (corsErrors.length > 0) {
      console.log('\n🔴 CORS Errors Found:');
      corsErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    if (errors.length > 0 && corsErrors.length === 0) {
      console.log('\n⚠️  Non-CORS Errors (may be acceptable):');
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    // Assert no CORS errors
    expect(corsErrors, 'Should have no CORS errors').toHaveLength(0);

    console.log('\n✅ All checks passed!');
    console.log('  ✅ Python backend is healthy');
    console.log('  ✅ Node.js API is healthy');
    console.log('  ✅ No CORS errors detected');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      console.log('\n❌ Test failed!');
      const timestamp = Date.now();
      await page.screenshot({
        path: `test-results/failure-${timestamp}.png`,
        fullPage: true
      });
      console.log(`Screenshot saved: test-results/failure-${timestamp}.png`);
    }
  });
});
