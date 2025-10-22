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

  console.log(`✓ Category: ${cat.name} (ID: ${cat.id})`);

  const { data: answers, count } = await supabase
    .from('answers')
    .select('*', { count: 'exact' })
    .eq('category_id', cat.id);

  console.log(`  Answers: ${count}`);
  if (answers && answers.length > 0) {
    console.log('\n  Sample answers:');
    answers.slice(0, 5).forEach(a => {
      console.log(`    - ${a.answer_text}`);
    });
  }
}

check();
