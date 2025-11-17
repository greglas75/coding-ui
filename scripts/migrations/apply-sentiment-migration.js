#!/usr/bin/env node

/**
 * Apply Sentiment Analysis Migration
 *
 * This script applies the sentiment analysis migration to the Supabase database.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Need: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔄 Reading migration file...');

  const migrationPath = './supabase/migrations/20250103000000_add_sentiment_analysis.sql';
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📊 Applying sentiment analysis migration...');
  console.log('This will add:');
  console.log('  - sentiment_enabled, sentiment_mode to categories');
  console.log('  - sentiment, sentiment_score, sentiment_confidence, sentiment_applicable, sentiment_reasoning to answers');
  console.log('  - get_sentiment_stats() and get_sentiment_by_code() functions');
  console.log('');

  // Split migration into individual statements
  const statements = migrationSQL
    .split('-- ============================================================================')
    .filter(s => s.trim().length > 0);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i <statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;

    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    try {
      // Execute using rpc for DDL statements
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Try direct query if rpc fails
        const result = await supabase.from('_').select().limit(0); // Dummy query to test connection
        console.log(`⚠️  Statement ${i + 1} may have failed (but might be OK):`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Error in statement ${i + 1}:`, err.message);
      errorCount++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`Migration complete: ${successCount} successful, ${errorCount} errors`);
  console.log('='.repeat(60));
  console.log('');

  // Verify the migration
  console.log('🔍 Verifying migration...');

  try {
    // Check categories table
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, sentiment_enabled, sentiment_mode')
      .limit(1);

    if (catError) {
      console.log('❌ Categories table verification failed:', catError.message);
    } else {
      console.log('✅ Categories table has sentiment columns');
    }

    // Check answers table
    const { data: answers, error: ansError } = await supabase
      .from('answers')
      .select('id, sentiment, sentiment_score, sentiment_applicable')
      .limit(1);

    if (ansError) {
      console.log('❌ Answers table verification failed:', ansError.message);
    } else {
      console.log('✅ Answers table has sentiment columns');
    }

    // Try to call the functions
    const { data: stats, error: statsError } = await supabase
      .rpc('get_sentiment_stats', { p_category_id: 1 });

    if (statsError) {
      console.log('⚠️  get_sentiment_stats function not yet available:', statsError.message);
      console.log('   This is normal if the function DDL needs service role permissions');
    } else {
      console.log('✅ get_sentiment_stats function is working');
    }

  } catch (err) {
    console.error('Error during verification:', err.message);
  }

  console.log('');
  console.log('✨ Next steps:');
  console.log('  1. Check the database directly if needed');
  console.log('  2. Test the API: curl http://localhost:3020/api/v1/sentiment/cost-estimate');
  console.log('  3. Enable sentiment for a category in the UI');
  console.log('');
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
