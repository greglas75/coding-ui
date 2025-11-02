#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data: cat } = await supabase
    .from('categories')
    .select('*')
    .eq('name', 'Toothpaste')
    .maybeSingle();

  if (!cat) {
    console.log('❌ No Toothpaste category found');
    return;
  }

  console.log(`✓ Category: ${cat.name} (ID: ${cat.id})\n`);

  // Total answers
  const { count: totalCount } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', cat.id);

  console.log(`  Total answers: ${totalCount}`);

  // Uncategorized (no selected_code, not whitelisted/blacklisted)
  const { data: uncategorized, count: uncategorizedCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact' })
    .eq('category_id', cat.id)
    .is('selected_code', null)
    .or('general_status.is.null,general_status.eq.uncategorized');

  console.log(`  Uncategorized: ${uncategorizedCount}`);

  // Whitelisted
  const { count: whitelistCount } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', cat.id)
    .eq('general_status', 'whitelist');

  console.log(`  Whitelisted: ${whitelistCount}`);

  // Blacklisted
  const { count: blacklistCount } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', cat.id)
    .eq('general_status', 'blacklist');

  console.log(`  Blacklisted: ${blacklistCount}`);

  // Already categorized (has selected_code)
  const { count: categorizedCount } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', cat.id)
    .not('selected_code', 'is', null);

  console.log(`  Already categorized (has code): ${categorizedCount}\n`);

  if (uncategorized && uncategorized.length > 0) {
    console.log('  Sample uncategorized answers:');
    uncategorized.slice(0, 10).forEach(a => {
      console.log(`    - ${a.answer_text} (status: ${a.general_status || 'null'})`);
    });
  }
}

check();
