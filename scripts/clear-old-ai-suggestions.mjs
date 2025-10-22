#!/usr/bin/env node
/**
 * 🗑️ Clear Old AI Suggestions
 *
 * Removes AI suggestions that don't have the new fields:
 * - searchQuery
 * - categoryName
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearOldSuggestions() {
  console.log('🔍 Checking old AI suggestions...\n');

  // Step 1: Count old vs new format
  const { data: stats, error: statsError } = await supabase.rpc('get_ai_suggestions_stats');

  if (statsError && statsError.code !== '42883') { // Function doesn't exist
    console.error('❌ Error checking stats:', statsError);
  }

  // Step 2: Get all answers with suggestions
  const { data: answers, error: fetchError } = await supabase
    .from('answers')
    .select('id, answer_text, ai_suggestions')
    .not('ai_suggestions', 'is', null)
    .limit(1000);

  if (fetchError) {
    console.error('❌ Error fetching answers:', fetchError);
    process.exit(1);
  }

  console.log(`📊 Total answers with AI suggestions: ${answers.length}`);

  // Count old format (missing searchQuery or categoryName)
  const oldFormat = answers.filter(a =>
    !a.ai_suggestions?.searchQuery || !a.ai_suggestions?.categoryName
  );

  const newFormat = answers.length - oldFormat.length;

  console.log(`   - Old format (missing fields): ${oldFormat.length}`);
  console.log(`   - New format (has all fields): ${newFormat}\n`);

  if (oldFormat.length === 0) {
    console.log('✅ No old suggestions to clear!');
    return;
  }

  // Ask for confirmation
  console.log('⚠️  This will clear AI suggestions for:');
  oldFormat.slice(0, 10).forEach(a => {
    console.log(`   - ID ${a.id}: "${a.answer_text.substring(0, 50)}..."`);
  });
  if (oldFormat.length > 10) {
    console.log(`   ... and ${oldFormat.length - 10} more`);
  }

  console.log('\n🔄 Proceeding to clear old suggestions...\n');

  // Step 3: Clear old suggestions (batch update)
  const oldIds = oldFormat.map(a => a.id);

  const { error: updateError } = await supabase
    .from('answers')
    .update({
      ai_suggestions: null,
      ai_suggested_code: null
    })
    .in('id', oldIds);

  if (updateError) {
    console.error('❌ Error clearing suggestions:', updateError);
    process.exit(1);
  }

  console.log(`✅ Cleared ${oldFormat.length} old AI suggestions!`);
  console.log(`\n📌 Users can regenerate with the 🔄 button to get:`);
  console.log(`   ✅ Search query with category name`);
  console.log(`   ✅ Vision AI analysis`);
  console.log(`   ✅ Better web context\n`);
}

clearOldSuggestions().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
