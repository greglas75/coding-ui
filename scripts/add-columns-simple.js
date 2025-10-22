#!/usr/bin/env node
/**
 * Simple script to add missing columns via direct SQL execution
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || buildDatabaseUrl();

function buildDatabaseUrl() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    console.error('❌ Missing SUPABASE_URL');
    process.exit(1);
  }

  // Extract project ref from URL
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    console.error('❌ Invalid SUPABASE_URL format');
    process.exit(1);
  }

  const projectRef = match[1];
  // Note: You need to get the actual database password from Supabase dashboard
  console.log('⚠️  Note: Direct database connection requires database password');
  console.log('   Please run the SQL manually in Supabase dashboard');
  console.log('   URL: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');

  return null;
}

async function addColumns() {
  console.log('📝 Manual steps required:\n');
  console.log('1. Open: https://supabase.com/dashboard/project/hoanegucluoshmpoxfnl/sql/new');
  console.log('2. Copy and paste this SQL:\n');

  const sql = `
-- Add llm_preset column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'llm_preset'
    ) THEN
        ALTER TABLE categories ADD COLUMN llm_preset TEXT;
        RAISE NOTICE '✅ Added column: llm_preset';
    ELSE
        RAISE NOTICE 'ℹ️  Column llm_preset already exists';
    END IF;
END $$;

-- Add gpt_template column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'gpt_template'
    ) THEN
        ALTER TABLE categories ADD COLUMN gpt_template TEXT;
        RAISE NOTICE '✅ Added column: gpt_template';
    ELSE
        RAISE NOTICE 'ℹ️  Column gpt_template already exists';
    END IF;
END $$;

-- Set default preset for existing categories
UPDATE categories
SET llm_preset = 'LLM Proper Name'
WHERE llm_preset IS NULL;

-- Verify
SELECT 'Migration complete!' as status,
       COUNT(*) as total_categories,
       COUNT(*) FILTER (WHERE llm_preset IS NOT NULL) as with_preset
FROM categories;
`;

  console.log(sql);
  console.log('\n3. Click "Run" to execute');
  console.log('\n✅ This will fix the 400 error when categorizing answers\n');
}

addColumns();
