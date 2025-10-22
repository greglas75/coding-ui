import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 *
 * This runs once before all tests
 * Used for:
 * - Starting services
 * - Seeding test database
 * - Clearing cache
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Global E2E setup starting...');

  // Check if API server is running
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const apiResponse = await page.request.get('http://localhost:3020/api/health');

    if (apiResponse.ok()) {
      console.log('✅ API server is running');
    } else {
      console.warn('⚠️  API server returned:', apiResponse.status());
      console.warn('   Make sure to run: npm run dev:api');
    }
  } catch (error) {
    console.warn('⚠️  API server not reachable at localhost:3020');
    console.warn('   Tests requiring API will be skipped');
    console.warn('   To run full tests: npm run dev:api');
  }

  // Check if frontend is running
  try {
    const frontendResponse = await page.request.get('http://localhost:5173/');

    if (frontendResponse.ok()) {
      console.log('✅ Frontend server is running');
    } else {
      console.warn('⚠️  Frontend server returned:', frontendResponse.status());
      console.warn('   Make sure to run: npm run dev');
    }
  } catch (error) {
    console.error('❌ Frontend server not reachable at localhost:5173');
    console.error('   Please run: npm run dev');
    throw new Error('Frontend server must be running for E2E tests');
  }

  await browser.close();

  console.log('✅ Global E2E setup complete\n');
}

export default globalSetup;

