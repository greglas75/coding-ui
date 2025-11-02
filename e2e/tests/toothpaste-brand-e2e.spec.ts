/**
 * Comprehensive E2E test for brand codeframe generation
 *
 * This test:
 * 1. Calls the API directly to generate brand codeframe for toothpaste category
 * 2. Polls status endpoint to track real-time progress
 * 3. Verifies completion and codes created in database
 * 4. Verifies hierarchy was saved to codeframe_hierarchy table
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import axios from 'axios';

// Load .env file from project root
dotenv.config();

const API_BASE = 'http://localhost:3020';
const TOOTHPASTE_CATEGORY_ID = 2;

// Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

test.describe('Toothpaste Brand Codeframe E2E', () => {
  test('should generate brand codeframe for toothpaste category and create codes', async () => {
    // Set timeout to 15 minutes for this test
    test.setTimeout(900_000);

    console.log('\n🚀 Starting comprehensive toothpaste brand codeframe test...\n');
    console.log('═'.repeat(80));

    // Step 1: Check initial state
    console.log('\n📊 Step 1: Checking initial state...');

    const { data: category } = await supabase
      .from('categories')
      .select('*')
      .eq('id', TOOTHPASTE_CATEGORY_ID)
      .single();

    console.log(`  ✓ Category: ${category?.name} (ID: ${category?.id})`);

    const { count: totalAnswers } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', TOOTHPASTE_CATEGORY_ID);

    const { count: uncategorizedCount } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', TOOTHPASTE_CATEGORY_ID)
      .is('selected_code', null)
      .or('general_status.is.null,general_status.eq.uncategorized');

    console.log(`  ✓ Total answers: ${totalAnswers}`);
    console.log(`  ✓ Uncategorized answers: ${uncategorizedCount}`);

    expect(uncategorizedCount).toBeGreaterThan(0);

    // Step 2: Trigger brand codeframe generation via API
    console.log('\n🎬 Step 2: Triggering brand codeframe generation...');

    const generateResponse = await axios.post(
      `${API_BASE}/api/v1/codeframe/generate`,
      {
        category_id: TOOTHPASTE_CATEGORY_ID,
        coding_type: 'brand',
        anthropic_api_key: process.env.ANTHROPIC_API_KEY,
        google_api_key: process.env.GOOGLE_API_KEY,
        google_cse_cx_id: process.env.GOOGLE_CSE_CX_ID,
        pinecone_api_key: process.env.PINECONE_API_KEY,
      }
    );

    const { generation_id, status } = generateResponse.data;
    console.log(`  ✓ Generation started!`);
    console.log(`    - Generation ID: ${generation_id}`);
    console.log(`    - Status: ${status}`);
    console.log(`    - Expected to analyze ${uncategorizedCount} answers`);

    expect(generation_id).toBeTruthy();
    expect(status).toBe('processing');

    // Step 3: Poll status endpoint to track progress
    console.log('\n⏳ Step 3: Polling for completion (tracking real-time progress)...');
    console.log('─'.repeat(80));

    let statusData: any = null;
    let pollCount = 0;
    const maxPolls = 300; // 10 minutes with 2s interval
    let lastProgress = 0;

    while (pollCount < maxPolls) {
      try {
        const statusResponse = await axios.get(
          `${API_BASE}/api/v1/codeframe/${generation_id}/status`
        );
        statusData = statusResponse.data;

        const progress = statusData.progress || 0;
        const currentStep = statusData.current_step || 'Starting...';

        // Only log when progress changes
        if (progress !== lastProgress) {
          const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
          console.log(`  [${progressBar}] ${progress}% - ${currentStep}`);
          lastProgress = progress;
        }

        if (statusData.status === 'completed') {
          console.log('\n  ✅ Generation COMPLETED!');
          break;
        } else if (statusData.status === 'failed') {
          console.error('\n  ❌ Generation FAILED');
          console.error('  Error:', statusData.result?.error);
          throw new Error('Generation failed: ' + statusData.result?.error?.message);
        }

        pollCount++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log('  ⏳ Generation not found yet, waiting...');
        } else {
          throw error;
        }
        pollCount++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (statusData?.status !== 'completed') {
      throw new Error('Timeout: Generation did not complete in time');
    }

    console.log('─'.repeat(80));
    console.log('\n📊 Step 4: Verifying generation results...');

    // Fetch final generation record from database
    const { data: generation } = await supabase
      .from('codeframe_generations')
      .select('*')
      .eq('id', generation_id)
      .single();

    console.log(`  ✓ Generation status: ${generation?.status}`);
    console.log(`  ✓ Processing time: ${generation?.processing_time_ms}ms`);
    console.log(`  ✓ Final progress: ${generation?.progress_percent}%`);

    expect(generation?.status).toBe('completed');
    expect(generation?.progress_percent).toBe(100);

    // Step 5: Verify brand codes were created in codeframe_hierarchy
    console.log('\n🗂️  Step 5: Verifying brand codes in codeframe_hierarchy table...');

    const { data: brandCodes, count: brandCount } = await supabase
      .from('codeframe_hierarchy')
      .select('*', { count: 'exact' })
      .eq('generation_id', generation_id);

    console.log(`  ✓ Total brand codes created: ${brandCount}`);

    expect(brandCount).toBeGreaterThan(0);

    if (brandCodes && brandCodes.length > 0) {
      console.log('\n  📋 Sample brand codes:');
      brandCodes.slice(0, 5).forEach((code: any) => {
        console.log(`    - ${code.name} (ID: ${code.id})`);
        console.log(`      Mention count: ${code.mention_count}`);
        console.log(`      Confidence: ${code.confidence}`);
        if (code.variants) {
          console.log(`      Variants: ${JSON.stringify(code.variants).substring(0, 100)}`);
        }
      });
    }

    // Step 6: Verify brands have required fields
    console.log('\n✓ Step 6: Verifying brand data quality...');

    let brandsWithNames = 0;
    let brandsWithVariants = 0;

    brandCodes?.forEach((brand: any) => {
      if (brand.name) {
        brandsWithNames++;
      }
      if (brand.variants) {
        brandsWithVariants++;
      }
    });

    console.log(`  ✓ Valid brands (with names): ${brandsWithNames}/${brandCount}`);
    console.log(`  ✓ Brands with variants: ${brandsWithVariants}/${brandCount}`);

    expect(brandsWithNames).toBeGreaterThan(0);

    // Step 7: Final summary
    console.log('\n═'.repeat(80));
    console.log('✅ TEST PASSED - Full brand codeframe generation cycle completed!\n');
    console.log('Summary:');
    console.log(`  - Category: ${category?.name} (ID: ${TOOTHPASTE_CATEGORY_ID})`);
    console.log(`  - Uncategorized answers analyzed: ${uncategorizedCount}`);
    console.log(`  - Brand codes created: ${brandCount}`);
    console.log(`  - Processing time: ${generation?.processing_time_ms}ms`);
    console.log(`  - Generation ID: ${generation_id}`);
    console.log('═'.repeat(80) + '\n');
  });
});
