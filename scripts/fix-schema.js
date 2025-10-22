#!/usr/bin/env node

/**
 * Fix codeframe_hierarchy schema and refresh PostgREST cache
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSchema() {
  console.log('🔧 Fixing codeframe_hierarchy schema...\n');

  try {
    // 1. Check current schema
    console.log('1️⃣ Checking current schema...');
    const { data: currentSchema, error: schemaError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'codeframe_hierarchy'
          ORDER BY ordinal_position;
        `
      });

    if (schemaError) {
      console.log('ℹ️ RPC not available, using alternative method...');
    } else {
      console.log('Current schema:', currentSchema);
    }

    // 2. Read and execute SQL file
    console.log('\n2️⃣ Applying schema fixes...');
    const sqlContent = fs.readFileSync('./fix-codeframe-hierarchy-schema.sql', 'utf8');

    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'));

    console.log(`Found ${statements.length} statements to execute\n`);

    for (const statement of statements) {
      if (statement.includes('ALTER TABLE')) {
        console.log('Executing:', statement.substring(0, 80) + '...');
      }
    }

    // 3. Try direct execution (this might not work with RLS)
    console.log('\n3️⃣ Attempting to refresh schema cache...');

    // Test if we can insert
    const testInsert = await supabase
      .from('codeframe_hierarchy')
      .select('*')
      .limit(1);

    console.log('✅ Can query codeframe_hierarchy:', !testInsert.error);

    if (testInsert.error) {
      console.error('❌ Error querying:', testInsert.error.message);
    }

    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Open and run: fix-codeframe-hierarchy-schema.sql');
    console.log('3. This will add missing columns and refresh the schema cache');
    console.log('\nOR use Supabase CLI:');
    console.log('   npx supabase db execute --file fix-codeframe-hierarchy-schema.sql');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSchema();
