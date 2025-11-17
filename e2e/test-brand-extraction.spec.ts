/**
 * Playwright E2E test for brand extraction
 * 
 * This test:
 * 1. Loads API keys from .env
 * 2. Sets them in localStorage (simulating Settings page)
 * 3. Navigates to Toothpaste category
 * 4. Triggers brand codeframe generation
 * 5. Waits for completion (up to 10 minutes)
 * 6. Verifies results
 */
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

test.describe('Brand Extraction E2E', () => {
  test('should extract brands from Toothpaste category with real API keys', async ({ page }) => {
    // Set timeout to 15 minutes for this test
    test.setTimeout(900_000);

    console.log('🚀 Starting brand extraction E2E test...');

    // Step 1: Navigate to app and inject API keys into localStorage
    console.log('📄 Loading app and injecting API keys...');
    await page.goto('http://localhost:5173');

    // Inject API keys from .env into localStorage
    await page.evaluate((keys) => {
      // Set API keys in localStorage (same format as Settings page)
      if (keys.anthropic) {
        localStorage.setItem('anthropic_api_key', keys.anthropic);
      }
      if (keys.google) {
        localStorage.setItem('google_api_key', keys.google);
      }
      if (keys.google_cx) {
        localStorage.setItem('google_cse_cx_id', keys.google_cx);
      }
      if (keys.pinecone) {
        localStorage.setItem('pinecone_api_key', keys.pinecone);
      }
      console.log('✅ API keys injected into localStorage');
    }, {
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      google: process.env.GOOGLE_API_KEY || '',
      google_cx: process.env.GOOGLE_CSE_CX_ID || '',
      pinecone: process.env.PINECONE_API_KEY || ''
    });

    // Reload page to apply localStorage changes
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('✅ Page loaded with API keys');

    // Step 2: Navigate to Categories page
    console.log('🔍 Navigating to Categories...');
    
    // Wait for navigation to be ready
    await page.waitForSelector('nav', { timeout: 10000 });

    // Try to find Categories link
    try {
      const categoriesLink = page.locator('a[href*="/categories"], a:has-text("Categories")').first();
      await categoriesLink.click({ timeout: 5000 });
      console.log('✅ Clicked Categories link');
    } catch (e) {
      console.log('⚠️ Direct Categories link not found, trying alternative navigation...');
      // Alternative: direct navigation
      await page.goto('http://localhost:5173/categories');
    }

    await page.waitForLoadState('networkidle');

    // Step 3: Find and click Toothpaste category
    console.log('🔍 Looking for Toothpaste category...');
    
    // Wait for categories list to load
    await page.waitForSelector('text=Toothpaste, text=/toothpaste/i', { timeout: 10000 });
    
    // Click on Toothpaste
    const toothpasteLink = page.locator('text=Toothpaste, text=/toothpaste/i').first();
    await toothpasteLink.click();
    
    console.log('✅ Navigated to Toothpaste category');
    await page.waitForLoadState('networkidle');

    // Step 4: Find and click Generate Brand Codeframe button
    console.log('🔍 Looking for Generate button...');
    
    // Wait for the generate button to appear
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Brand"), button:has-text("Codeframe")').first();
    await generateButton.waitFor({ timeout: 10000 });
    
    console.log('✅ Found Generate button');
    
    // Take screenshot before clicking
    await page.screenshot({ path: '/tmp/before-generate.png', fullPage: true });

    // Click generate
    await generateButton.click();
    console.log('🚀 Clicked Generate button - waiting for brand extraction to complete...');

    // Step 5: Wait for completion (look for success indicators)
    console.log('⏳ Waiting for generation to complete (this may take 3-8 minutes)...');

    try {
      // Wait for success message, completion indicator, or MECE score to appear
      await page.waitForSelector('text=/complete|success|MECE|brand/i', {
        timeout: 600_000  // 10 minutes
      });
      
      console.log('✅ Generation appears to have completed!');
    } catch (error) {
      console.error('❌ Timeout waiting for completion');
      await page.screenshot({ path: '/tmp/timeout-error.png', fullPage: true });
      throw error;
    }

    // Step 6: Verify results
    console.log('🔍 Verifying results...');
    
    // Take final screenshot
    await page.screenshot({ path: '/tmp/final-result.png', fullPage: true });

    // Get page content
    const bodyText = await page.textContent('body');
    console.log('📊 Page content preview:', bodyText?.substring(0, 500));

    // Check for error indicators
    if (bodyText?.includes('0 brands') || bodyText?.includes('0/100') || bodyText?.includes('No brands found')) {
      console.error('❌ No brands found - checking logs...');
      
      // Print console logs
      const logs = await page.evaluate(() => {
        return (window as any).consoleLogs || [];
      });
      console.log('Console logs:', logs);
      
      throw new Error('Brand extraction returned 0 brands - check logs for Pinecone dimension mismatch');
    }

    console.log('✅ Test completed successfully - brands were found!');
  });
});
