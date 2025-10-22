#!/usr/bin/env node

/**
 * Refresh PostgREST schema cache via Supabase REST API
 * This fixes the "Could not find the 'name' column" error
 */

import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

async function refreshSchemaCache() {
  console.log('🔄 Refreshing PostgREST schema cache...\n');

  try {
    // Call Supabase REST API to reload schema
    // This uses the undocumented PostgREST admin endpoint
    const adminUrl = `${supabaseUrl}/rest/v1/rpc/pgrst_reload`;

    console.log('📡 Calling:', adminUrl);

    const response = await fetch(adminUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('✅ Schema cache refreshed successfully!');
      console.log('   Status:', response.status);
    } else {
      const error = await response.text();
      console.log('⚠️  Response:', response.status, response.statusText);
      console.log('   Body:', error);

      // This is expected - the endpoint might not exist
      // Try alternative method: make a simple query to trigger cache refresh
      console.log('\n🔄 Trying alternative method: query codeframe_hierarchy...\n');

      const queryUrl = `${supabaseUrl}/rest/v1/codeframe_hierarchy`;
      const queryResponse = await fetch(`${queryUrl}?limit=1`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      });

      if (queryResponse.ok) {
        const data = await queryResponse.json();
        console.log('✅ Successfully queried codeframe_hierarchy');
        console.log('   Columns visible in response:', Object.keys(data[0] || {}));

        // Check if 'name' column is present
        if (data[0] && 'name' in data[0]) {
          console.log('   ✓ \'name\' column is present!');
        } else {
          console.log('   ✗ \'name\' column is MISSING');
          console.log('\n❌ MANUAL ACTION REQUIRED:');
          console.log('   1. Go to Supabase Dashboard → SQL Editor');
          console.log('   2. Run this command:');
          console.log('      NOTIFY pgrst, \'reload schema\';');
          console.log('   3. Or run: supabase db execute --sql "NOTIFY pgrst, \'reload schema\';"');
        }
      } else {
        const error = await queryResponse.text();
        console.error('❌ Query failed:', queryResponse.status);
        console.error('   Error:', error);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 MANUAL STEPS:');
    console.log('   1. Open Supabase Dashboard SQL Editor');
    console.log('   2. Run: NOTIFY pgrst, \'reload schema\';');
    process.exit(1);
  }
}

refreshSchemaCache();
