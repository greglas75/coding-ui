import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 *
 * This allows you to record tests by clicking through the app!
 * Run: npm run test:e2e:record
 */
export default defineConfig({
  testDir: './e2e/tests',

  // Global setup file
  globalSetup: './e2e/global-setup.ts',

  // Maximum time one test can run (increased for large test suites)
  timeout: 120 * 1000,

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI and locally for flaky tests
  retries: process.env.CI ? 2 : 1,

  // Workers configuration (increased for better performance)
  workers: process.env.CI ? 2 : 4,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Shared settings for all projects
use: {
  // Base URL for your app
  baseURL: 'http://localhost:5173',

  // 🖥️ VIEWPORT - DUŻE OKNO (1920x1080)
  viewport: { width: 2560, height: 1440 },

  // 👁️ Headless mode (no browser window)
  headless: true,

  // ⏱️ Fast execution (no slowMo in headless)
  slowMo: 0,

  // Collect trace on failure and retry
  trace: 'retain-on-failure',

  // Take screenshot on failure
  screenshot: 'only-on-failure',

  // Record video on failure
  video: 'retain-on-failure',

  // Maximum time each action can take (increased)
  actionTimeout: 30 * 1000,

  // Navigation timeout (increased)
  navigationTimeout: 90 * 1000,
},

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment to test on more browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    //
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Output folder for test artifacts
  outputDir: 'test-results',
});

