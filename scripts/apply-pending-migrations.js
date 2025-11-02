/**
 * Apply pending database migrations to Supabase
 * Applies both the ambiguous column fix and the variants column addition
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

// Migrations to apply
const migrations = [
  '20251026_fix_ambiguous_column.sql',
  '20251026_add_variants_column.sql'
];

async function applyMigrations() {
  console.log('📦 Applying pending migrations...\n');

  for (const migrationFile of migrations) {
    try {
      console.log(`\n📄 Reading ${migrationFile}...`);
      const migrationPath = path.join(__dirname, '../supabase/migrations', migrationFile);

      if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        continue;
      }

      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      console.log(`🚀 Applying ${migrationFile}...`);

      // Execute the SQL directly using the REST API
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: migrationSQL
      });

      if (error) {
        // exec_sql doesn't exist, output instructions for manual application
        console.log(`⚠️  Cannot execute migration automatically.`);
        console.log(`\n📝 Please run this SQL in your Supabase SQL Editor:`);
        console.log('─'.repeat(70));
        console.log(migrationSQL);
        console.log('─'.repeat(70));
      } else {
        console.log(`✅ ${migrationFile} applied successfully!`);
      }

    } catch (err) {
      console.error(`❌ Error applying ${migrationFile}:`, err.message);
    }
  }

  console.log('\n\n📝 Manual Application Instructions:');
  console.log('─'.repeat(70));
  console.log('If automatic application failed, please:');
  console.log('1. Go to: https://supabase.com/dashboard/project/_/sql/new');
  console.log('2. Copy and paste each migration SQL shown above');
  console.log('3. Click "Run" to execute');
  console.log('─'.repeat(70));
}

applyMigrations();
