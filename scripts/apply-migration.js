/**
 * Apply database migration to fix ambiguous column reference
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251026_fix_ambiguous_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration to Supabase...');

    // Execute the SQL using the service role
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, we need to use a different approach
      console.log('⚠️  exec_sql RPC not available, using direct connection...');

      // For now, let's just output instructions
      console.log('\n📝 Please run the following SQL in your Supabase SQL Editor:');
      console.log('─────────────────────────────────────────────────────────────');
      console.log(migrationSQL);
      console.log('─────────────────────────────────────────────────────────────');
      console.log('\n🔗 Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql/new');
    } else {
      console.log('✅ Migration applied successfully!');
      console.log('Data:', data);
    }

  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    console.error(err);
    process.exit(1);
  }
}

applyMigration();
