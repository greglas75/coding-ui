/**
 * Audit script for AI cost tracking schema
 * Checks what tables and columns exist in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function auditSchema() {
  console.log('='.repeat(80));
  console.log('AI COST TRACKING SCHEMA AUDIT');
  console.log('='.repeat(80));
  console.log();

  // Query 1: Check for AI-related tables
  console.log('1. Checking for AI-related tables...');
  console.log('-'.repeat(80));

  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        table_name,
        table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (
          table_name LIKE '%ai%'
          OR table_name LIKE '%usage%'
          OR table_name LIKE '%cost%'
          OR table_name = 'codeframe_generations'
          OR table_name = 'answers'
        )
      ORDER BY table_name;
    `
  });

  if (tablesError) {
    // Try direct query instead
    const { data: directTables, error: directError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .or('table_name.like.%ai%,table_name.like.%usage%,table_name.like.%cost%');

    if (directError) {
      console.log('⚠️  Cannot query information_schema directly');
      console.log('Checking specific tables manually...\n');

      // Check specific tables
      const checkTable = async (tableName) => {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        return !error;
      };

      const tablesToCheck = ['ai_usage_logs', 'codeframe_generations', 'answers'];
      for (const table of tablesToCheck) {
        const exists = await checkTable(table);
        console.log(`${exists ? '✓' : '✗'} ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      }
    } else {
      console.table(directTables);
    }
  } else {
    console.table(tables);
  }

  console.log();

  // Query 2: Check if ai_usage_logs exists and its structure
  console.log('2. Checking ai_usage_logs table structure...');
  console.log('-'.repeat(80));

  const { data: aiUsageLogs, error: aiUsageError } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .limit(1);

  if (aiUsageError) {
    console.log('❌ Table ai_usage_logs does NOT exist');
    console.log(`Error: ${aiUsageError.message}`);
    console.log('→ Will use Option B: Create new ai_usage_logs table\n');
  } else {
    console.log('✅ Table ai_usage_logs EXISTS');
    console.log('Sample data:', aiUsageLogs);
    console.log('→ Will use Option A: Extend existing ai_usage_logs table\n');
  }

  // Query 3: Check codeframe_generations table structure
  console.log('3. Checking codeframe_generations table for cost columns...');
  console.log('-'.repeat(80));

  const { data: codeframes, error: codeframeError } = await supabase
    .from('codeframe_generations')
    .select('id, ai_model, ai_input_tokens, ai_output_tokens, ai_cost_usd, status')
    .limit(3);

  if (codeframeError) {
    console.log('❌ Table codeframe_generations does NOT exist or lacks columns');
    console.log(`Error: ${codeframeError.message}\n`);
  } else {
    console.log(`✅ Table codeframe_generations EXISTS with ${codeframes.length} sample rows`);
    if (codeframes.length > 0) {
      console.log('Sample data:');
      console.table(codeframes);

      // Check if any have cost data
      const withCost = codeframes.filter(g => g.ai_cost_usd !== null);
      console.log(`\n→ ${withCost.length}/${codeframes.length} rows have cost data`);
    } else {
      console.log('→ No data yet\n');
    }
  }

  // Query 4: Check answers table for AI fields
  console.log('4. Checking answers table for AI fields...');
  console.log('-'.repeat(80));

  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .select('id, ai_suggestions, quick_status')
    .not('ai_suggestions', 'is', null)
    .limit(3);

  if (answersError) {
    console.log('❌ Cannot query answers table');
    console.log(`Error: ${answersError.message}\n`);
  } else {
    console.log(`✅ Found ${answers.length} answers with AI suggestions`);
    if (answers.length > 0) {
      console.log('Sample ai_suggestions structure:');
      console.log(JSON.stringify(answers[0].ai_suggestions, null, 2));
    }
    console.log();
  }

  // Final recommendation
  console.log('='.repeat(80));
  console.log('RECOMMENDATION');
  console.log('='.repeat(80));

  if (aiUsageError && aiUsageError.message.includes("'ai_usage_logs'")) {
    console.log('✓ Use Option B: CREATE new ai_usage_logs table');
    console.log('  Reason: Table does not exist yet');
  } else {
    console.log('✓ Use Option A: EXTEND existing ai_usage_logs table');
    console.log('  Reason: Table already exists');
  }

  console.log();
  console.log('Next steps:');
  console.log('1. Create migration file: supabase/migrations/20250102000000_*.sql');
  console.log('2. Include unified view: ai_cost_unified');
  console.log('3. Add helper functions for querying');
  console.log('4. Set up RLS policies');
  console.log('5. Test with sample queries');
  console.log('='.repeat(80));
}

// Run audit
auditSchema()
  .then(() => {
    console.log('\n✅ Audit complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  });
