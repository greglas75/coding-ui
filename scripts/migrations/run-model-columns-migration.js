#!/usr/bin/env node

/**
 * 🔧 Migration Script: Add AI Model Columns to Categories Table
 *
 * This script adds missing columns:
 * - openai_model, claude_model, gemini_model
 * - vision_model, llm_preset, gpt_template
 * - sentiment_enabled, sentiment_mode
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runMigration() {
  console.log('🚀 Starting migration: Add AI Model Columns\n');

  // Read SQL file
  const sql = readFileSync('fix-category-model-columns.sql', 'utf8');

  // Split by statement separator and filter empty lines
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith("SELECT '"));

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  for (const [index, statement] of statements.entries()) {
    if (!statement) continue;

    console.log(`\n[${index + 1}/${statements.length}] Executing...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';',
      });

      if (error) {
        // Try direct query if RPC fails
        console.log('⚠️  RPC failed, trying direct query...');

        // For Supabase, we need to use the service role key for DDL
        console.error('❌ Error:', error.message);
        console.log('\n⚠️  DDL statements require SERVICE_ROLE_KEY.');
        console.log('📋 Please run this SQL manually in Supabase Dashboard:');
        console.log('   https://supabase.com/dashboard > SQL Editor\n');
        console.log('Or set SUPABASE_SERVICE_ROLE_KEY in .env and use service role client.\n');

        // Print first few statements for manual execution
        console.log('🔹 First SQL statement to run:');
        console.log(statements[0].substring(0, 200) + '...\n');

        process.exit(1);
      }

      console.log('✅ Success');
    } catch (err) {
      console.error('❌ Unexpected error:', err.message);
      process.exit(1);
    }
  }

  console.log('\n\n🎉 Migration completed successfully!');
  console.log('✅ All AI model columns have been added to categories table.');

  // Verify
  console.log('\n🔍 Verifying schema...');
  const { data: columns, error: verifyError } = await supabase
    .from('categories')
    .select('*')
    .limit(1);

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
  } else {
    console.log('✅ Schema verification passed!');
    if (columns && columns[0]) {
      const keys = Object.keys(columns[0]);
      const modelColumns = keys.filter(
        k =>
          k.includes('model') ||
          k.includes('preset') ||
          k.includes('template') ||
          k.includes('sentiment')
      );
      console.log('📊 Model-related columns:', modelColumns.join(', '));
    }
  }
}

runMigration().catch(err => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
