import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 * 
 * This allows you to record tests by clicking through the app!
 * Run: npm run test:e2e:record
 */
export default defineConfig({
  testDir: './e2e/tests',
  
  // Maximum time one test can run
  timeout: 30 * 1000,
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  // Shared settings for all projects
use: {
  // Base URL for your app
  baseURL: 'http://localhost:4173',
  
  // 🖥️ VIEWPORT - DUŻE OKNO (1920x1080)
  viewport: { width: 2560, height: 1440 },
  
  // 👁️ Pokaż okno przeglądarki (nie headless)
  headless: false,
  
  // ⏱️ Wolniejsze wykonanie (łatwiej zobaczyć co się dzieje)
  slowMo: 100,
  
  // Collect trace when retrying the failed test
  trace: 'on-first-retry',
  
  // Take screenshot on failure
  screenshot: 'only-on-failure',
  
  // Record video on failure
  video: 'retain-on-failure',
  
  // Maximum time each action can take
  actionTimeout: 10 * 1000,
  
  // Navigation timeout
  navigationTimeout: 30 * 1000,
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
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Output folder for test artifacts
  outputDir: 'test-results',
});

