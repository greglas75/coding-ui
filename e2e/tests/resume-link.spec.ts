/**
 * Test resume functionality - loading existing generation from URL
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

test.describe('Resume Generation from URL', () => {
  test('should jump to Step 4 when loading URL with resumeId parameter', async ({ page }) => {
    test.setTimeout(30000);

    console.log('\n🔗 Testing resume functionality...\n');

    // Step 1: Find an existing completed generation
    const { data: generations } = await supabase
      .from('codeframe_generations')
      .select('id')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!generations || generations.length === 0) {
      console.log('⚠️  No completed generations found. Skipping test.');
      test.skip();
      return;
    }

    const generationId = generations[0].id;
    console.log(`  ✓ Found generation: ${generationId}`);

    // Step 2: Navigate to codeframe builder with resumeId parameter
    const url = `http://localhost:5173/codeframe/builder?resumeId=${generationId}`;
    console.log(`  ⏳ Navigating to: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle' });

    // Wait a bit for React to process the effect
    await page.waitForTimeout(1000);

    // Step 3: Verify we're on Step 4 (Review & Edit)
    console.log('  ⏳ Checking for Step 4 (Review & Edit)...');

    // Look for the "Review & Edit Codebook" heading
    const reviewEditHeading = page.getByRole('heading', { name: /Review & Edit Codebook/i });
    await expect(reviewEditHeading).toBeVisible({ timeout: 10000 });
    console.log('  ✓ Found "Review & Edit Codebook" heading');

    // Verify the step indicator shows we're past step 1 (should see checkmarks)
    const currentStepMarker = page.locator('[aria-current="step"]');
    await expect(currentStepMarker).toBeVisible();
    console.log('  ✓ Found current step marker');

    // Verify we see the "Apply to Answers" button (confirming we're on the edit page)
    const applyButton = page.getByRole('button', { name: 'Apply to Answers', exact: true });
    await expect(applyButton).toBeVisible();
    console.log('  ✓ Found "Apply to Answers" button');

    console.log('  ✅ Successfully jumped to Step 4 (Review & Edit)!');
    console.log('  ✓ Resume functionality works correctly\n');
  });
});
