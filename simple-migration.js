/**
 * Simple migration script to create ai_usage_logs table
 * Executes SQL in smaller chunks for reliability
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSQLBatch(sqlStatements, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(description);
  console.log('='.repeat(60));

  for (const [index, sql] of sqlStatements.entries()) {
    try {
      console.log(`\n[${index + 1}/${sqlStatements.length}] Executing...`);
      console.log(sql.substring(0, 100) + '...');

      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        console.error(`❌ Error:`, error.message);
        throw error;
      }

      console.log(`✅ Success`);
    } catch (error) {
      console.error(`❌ Failed to execute statement ${index + 1}:`, error.message);
      // Continue with next statement
    }
  }
}

async function createMigration() {
  console.log('\n' + '='.repeat(80));
  console.log('AI COST TRACKING MIGRATION - SIMPLIFIED');
  console.log('='.repeat(80));

  try {
    // Step 1: Create ai_usage_logs table
    console.log('\nStep 1: Creating ai_usage_logs table...');

    const { data: tableExists, error: checkError } = await supabase
      .from('ai_usage_logs')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table ai_usage_logs already exists!');
    } else if (checkError.message.includes('ai_usage_logs')) {
      console.log('Creating ai_usage_logs table via direct INSERT (workaround)...');

      // Create a test log entry which will fail because table doesn't exist
      // Then we'll know for sure. But let's try a different approach.

      console.log('\n❌ Cannot create DDL via Supabase JS client');
      console.log('\n📋 MANUAL STEPS REQUIRED:');
      console.log('\n1. Go to Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/hoanegucluoshmpoxfnl/sql/new');
      console.log('\n2. Copy and paste this SQL:\n');

      const createTableSQL = `
-- Create ai_usage_logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN ('answer_coding', 'codeframe_generation')),
    user_id UUID,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES codeframe_generations(id) ON DELETE SET NULL,
    answer_id INTEGER REFERENCES answers(id) ON DELETE SET NULL,
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature_type ON ai_usage_logs(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_date ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_category ON ai_usage_logs(category_id);

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY IF NOT EXISTS "Service role has full access"
    ON ai_usage_logs FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- Allow insert for all (for logging)
CREATE POLICY IF NOT EXISTS "Allow all inserts"
    ON ai_usage_logs FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- Allow SELECT for development
CREATE POLICY IF NOT EXISTS "Allow all selects"
    ON ai_usage_logs FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

-- Add AI cost columns to codeframe_generations if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'codeframe_generations' AND column_name = 'ai_model') THEN
        ALTER TABLE codeframe_generations ADD COLUMN ai_model VARCHAR(100);
        ALTER TABLE codeframe_generations ADD COLUMN ai_input_tokens INTEGER;
        ALTER TABLE codeframe_generations ADD COLUMN ai_output_tokens INTEGER;
        ALTER TABLE codeframe_generations ADD COLUMN ai_cost_usd DECIMAL(10, 6);
        RAISE NOTICE 'Added AI cost columns to codeframe_generations';
    END IF;
END $$;
      `;

      console.log(createTableSQL);
      console.log('\n3. Click "Run" or press Cmd+Enter');
      console.log('\n4. Then run: node simple-migration.js again to verify\n');

      return false;
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(80));
    console.log('\nVerifying table...\n');

    const { count, error: countError } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`✅ ai_usage_logs table verified! Current rows: ${count || 0}`);
      return true;
    } else {
      console.log(`⚠️  Could not verify table:`, countError.message);
      return false;
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    return false;
  }
}

createMigration()
  .then((success) => {
    if (success) {
      console.log('\n✅ Ready to test API endpoints!');
      console.log('\nTest command:');
      console.log('  curl http://localhost:3001/api/v1/cost-dashboard/overview\n');
      process.exit(0);
    } else {
      console.log('\nℹ️  Manual SQL execution required');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
