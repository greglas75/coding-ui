#!/usr/bin/env node
/**
 * Migration Script: Add llm_preset and gpt_template columns
 *
 * This script adds the missing columns to the categories table
 * to fix the 400 error when categorizing answers.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('📝 Reading SQL migration file...');
    const sqlPath = join(__dirname, '..', 'add-template-columns.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('🚀 Executing migration...\n');

    // Execute the SQL via Supabase's RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct SQL execution if RPC doesn't exist
      console.log('⚠️  RPC method not available, trying alternative...\n');

      // Execute each statement separately
      const statements = [
        // Add llm_preset column
        `DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'llm_preset'
    ) THEN
        ALTER TABLE categories ADD COLUMN llm_preset TEXT;
        RAISE NOTICE '✅ Added column: llm_preset';
    END IF;
END $$;`,

        // Add gpt_template column
        `DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'gpt_template'
    ) THEN
        ALTER TABLE categories ADD COLUMN gpt_template TEXT;
        RAISE NOTICE '✅ Added column: gpt_template';
    END IF;
END $$;`
      ];

      // Unfortunately Supabase client doesn't support raw SQL execution
      // We need to use the REST API directly
      console.log('⚠️  Please run the SQL script manually:');
      console.log('1. Open Supabase Dashboard SQL Editor');
      console.log('2. Copy and paste the contents of add-template-columns.sql');
      console.log('3. Execute the script\n');

      // As a workaround, let's verify if columns exist
      console.log('🔍 Checking if columns exist...\n');
      const { data: categories, error: selectError } = await supabase
        .from('categories')
        .select('id, name, llm_preset, gpt_template')
        .limit(1);

      if (selectError) {
        if (selectError.message.includes('llm_preset') || selectError.message.includes('gpt_template')) {
          console.log('❌ Columns do not exist. Migration needed.\n');
          console.log('📋 Manual Steps:');
          console.log('1. Go to: https://supabase.com/dashboard/project/hoanegucluoshmpoxfnl/sql/new');
          console.log('2. Copy contents from: add-template-columns.sql');
          console.log('3. Run the SQL script');
          return false;
        }
        throw selectError;
      }

      console.log('✅ Columns already exist!');
      console.log('Data check:', categories);
      return true;
    }

    console.log('✅ Migration completed successfully!');
    console.log('Result:', data);
    return true;

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    return false;
  }
}

runMigration()
  .then(success => {
    if (success) {
      console.log('\n✅ Migration check complete!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Manual migration required');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
