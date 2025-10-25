import { test, expect } from '@playwright/test';

test.describe('Brand Tracking Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should generate brand codeframe without errors', async ({ page }) => {
    console.log('Starting brand tracking test...');

    // Navigate to Codeframe Builder
    await page.goto('http://localhost:5173/codeframe-builder');
    await page.waitForLoadState('networkidle');

    console.log('Step 1: Navigated to Codeframe Builder');

    // Step 0: Select "Brand Tracking" type
    const brandTrackingButton = page.locator('button:has-text("Brand Tracking")');
    await expect(brandTrackingButton).toBeVisible({ timeout: 10000 });
    await brandTrackingButton.click();
    console.log('Step 2: Selected Brand Tracking type');

    // Wait for next step
    await page.waitForTimeout(500);

    // Step 1: Select category (assuming there's a category dropdown/button)
    // This part depends on your UI - adjust selector as needed
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      console.log('Step 3: Clicked Next after selecting type');
    }

    await page.waitForTimeout(500);

    // Step 2: Click "Generate Codebook" button
    const generateButton = page.locator('button:has-text("Generate Codebook"), button:has-text("Generate")');

    // Wait for button to be visible
    await expect(generateButton.first()).toBeVisible({ timeout: 10000 });
    console.log('Step 4: Generate button found');

    // Listen for network errors
    let networkError = false;
    page.on('response', response => {
      if (response.url().includes('/api/v1/codeframe/generate')) {
        console.log(`Response from generate endpoint: ${response.status()}`);
        if (response.status() === 500) {
          networkError = true;
          console.error('❌ 500 Error detected from generate endpoint');
        } else if (response.status() === 200) {
          console.log('✅ 200 Success from generate endpoint');
        }
      }
    });

    // Click generate button
    await generateButton.first().click();
    console.log('Step 5: Clicked Generate Codebook button');

    // Wait for the API request to complete
    await page.waitForTimeout(3000);

    // Check for frontend errors in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit more for any async errors
    await page.waitForTimeout(2000);

    // Assertions
    console.log('\n=== Test Results ===');

    // Check for network errors
    expect(networkError).toBe(false);
    if (!networkError) {
      console.log('✅ No 500 errors from backend');
    }

    // Check for frontend errors
    const hasSimpleLoggerError = consoleErrors.some(err => err.includes('simpleLogger'));
    expect(hasSimpleLoggerError).toBe(false);
    if (!hasSimpleLoggerError) {
      console.log('✅ No simpleLogger errors in frontend');
    }

    // Check for any axios errors
    const hasAxiosError = consoleErrors.some(err => err.includes('AxiosError'));
    expect(hasAxiosError).toBe(false);
    if (!hasAxiosError) {
      console.log('✅ No Axios errors in frontend');
    }

    // Check for processing state or success message
    const processingIndicator = page.locator('text=/processing|generating|loading/i');
    const successMessage = page.locator('text=/success|completed|generated/i');

    const hasProcessingOrSuccess = await Promise.race([
      processingIndicator.isVisible().then(() => 'processing'),
      successMessage.isVisible().then(() => 'success'),
      page.waitForTimeout(5000).then(() => 'timeout')
    ]);

    console.log(`UI State: ${hasProcessingOrSuccess}`);

    console.log('\n=== Test Complete ===\n');

    // The test passes if there are no 500 errors and no frontend errors
    expect(networkError).toBe(false);
    expect(hasSimpleLoggerError).toBe(false);
    expect(hasAxiosError).toBe(false);
  });

  test('should check backend health', async ({ request }) => {
    console.log('Checking backend services...');

    // Check Python service
    const pythonHealth = await request.get('http://localhost:8000/health');
    expect(pythonHealth.ok()).toBeTruthy();
    console.log('✅ Python service healthy');

    // Check Express service
    const expressHealth = await request.get('http://localhost:3020/api/health');
    expect(expressHealth.ok()).toBeTruthy();
    console.log('✅ Express service healthy');
  });

  test('should test generate endpoint directly', async ({ request }) => {
    console.log('Testing generate endpoint directly...');

    const response = await request.post('http://localhost:3020/api/v1/codeframe/generate', {
      data: {
        category_id: 2,
        coding_type: 'brand',
        target_language: 'en',
        brand_min_confidence: 0.3,
        brand_enable_enrichment: true
      },
      timeout: 30000
    });

    console.log(`Response status: ${response.status()}`);

    if (response.status() === 500) {
      const body = await response.text();
      console.error('❌ Error response:', body);
    } else if (response.status() === 200) {
      const body = await response.json();
      console.log('✅ Success response:', JSON.stringify(body, null, 2));
    }

    expect(response.status()).toBe(200);
  });
});
