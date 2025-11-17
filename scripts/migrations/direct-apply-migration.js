/**
 * Direct SQL migration application via psql
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

async function applyMigration() {
  console.log('='.repeat(80));
  console.log('APPLYING AI COST TRACKING MIGRATION DIRECTLY');
  console.log('='.repeat(80));
  console.log();

  const migrationSQL = readFileSync(
    'supabase/migrations/20250102000000_create_unified_ai_cost_tracking.sql',
    'utf8'
  );

  // Extract database connection URL from Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectRef) {
    console.error('❌ Could not extract project ref from SUPABASE_URL');
    return false;
  }

  console.log(`📡 Project: ${projectRef}`);
  console.log(`📄 Migration file: 20250102000000_create_unified_ai_cost_tracking.sql`);
  console.log();

  // Use supabase CLI's db execute feature
  try {
    console.log('⏳ Executing SQL...');
    console.log();

    // Write SQL to temp file
    const tmpFile = '/tmp/ai_cost_migration.sql';
    const fs = await import('fs');
    fs.writeFileSync(tmpFile, migrationSQL);

    // Execute using supabase CLI
    const { stdout, stderr } = await execAsync(
      `supabase db execute --file ${tmpFile} --linked`
    );

    if (stdout) {
      console.log('📤 Output:');
      console.log(stdout);
    }

    if (stderr && !stderr.includes('NOTICE') && !stderr.includes('INFO')) {
      console.log('⚠️  Warnings/Errors:');
      console.log(stderr);
    }

    console.log();
    console.log('✅ Migration executed successfully!');
    console.log();

    // Clean up temp file
    fs.unlinkSync(tmpFile);

    return true;
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error.message);
    if (error.stdout) {
      console.log('\nStdout:', error.stdout);
    }
    if (error.stderr) {
      console.log('\nStderr:', error.stderr);
    }
    return false;
  }
}

applyMigration()
  .then((success) => {
    if (success) {
      console.log('='.repeat(80));
      console.log('NEXT STEPS:');
      console.log('  1. Verify table created: SELECT * FROM ai_usage_logs LIMIT 1;');
      console.log('  2. Test helper functions: SELECT * FROM get_daily_cost_trend(7);');
      console.log('  3. Test API endpoints');
      console.log('='.repeat(80));
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
