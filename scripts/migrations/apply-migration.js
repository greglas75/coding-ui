/**
 * Script to apply AI cost tracking migration to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyMigration() {
  console.log('='.repeat(80));
  console.log('APPLYING AI COST TRACKING MIGRATION');
  console.log('='.repeat(80));
  console.log();

  try {
    // Read migration file
    const migrationSQL = readFileSync(
      'supabase/migrations/20250102000000_create_unified_ai_cost_tracking.sql',
      'utf8'
    );

    console.log('📄 Migration file loaded');
    console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
    console.log();

    // Execute migration using RPC
    console.log('⏳ Executing migration...');
    console.log();

    // Split into statements and execute one by one
    // This is a simplified approach - for complex migrations, use proper SQL parser
    const statements = migrationSQL
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== ';');

    console.log(`   Found ${statements.length} SQL statements to execute`);
    console.log();

    // Execute via direct database connection (using psql)
    const { execSync } = await import('child_process');

    // Extract connection details from Supabase URL
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Use Supabase's PostgREST to execute raw SQL
    // Note: This won't work for DDL, so we'll try a different approach

    console.log('⚠️  Cannot execute DDL via Supabase JS client');
    console.log('   Please use one of these methods:');
    console.log();
    console.log('   Option 1: Supabase Dashboard SQL Editor');
    console.log('   1. Go to https://hoanegucluoshmpoxfnl.supabase.co/project/_/sql');
    console.log('   2. Copy contents of supabase/migrations/20250102000000_create_unified_ai_cost_tracking.sql');
    console.log('   3. Paste and run in SQL Editor');
    console.log();
    console.log('   Option 2: psql command line');
    console.log('   Run: supabase db push');
    console.log();
    console.log('   Option 3: Manual SQL execution');
    console.log('   The migration file is ready at:');
    console.log('   supabase/migrations/20250102000000_create_unified_ai_cost_tracking.sql');
    console.log();

    return false;

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    return false;
  }
}

applyMigration()
  .then((success) => {
    if (success) {
      console.log('✅ Migration applied successfully');
      process.exit(0);
    } else {
      console.log('ℹ️  Manual migration required');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
