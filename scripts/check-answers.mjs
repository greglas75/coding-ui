#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnswers() {
  // Total answers
  const { count: totalCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total answers in database: ${totalCount}`);

  // Answers with suggestions
  const { count: withSuggestions } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .not('ai_suggestions', 'is', null);

  console.log(`🤖 Answers with AI suggestions: ${withSuggestions}`);

  // Get some sample data
  const { data: samples } = await supabase
    .from('answers')
    .select('id, answer_text, ai_suggestions, category_id')
    .limit(5);

  console.log('\n📋 Sample answers:');
  samples?.forEach(a => {
    console.log(`  ${a.id}: "${a.answer_text.substring(0, 40)}..." - Category: ${a.category_id}, Has AI: ${!!a.ai_suggestions}`);
  });
}

checkAnswers();
