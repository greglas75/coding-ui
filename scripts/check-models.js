#!/usr/bin/env node
/**
 * Check and fix OpenAI model configuration in categories
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkModels() {
  console.log('🔍 Checking OpenAI models in categories...\n');

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, openai_model, llm_preset');

  if (error) {
    console.error('❌ Error fetching categories:', error);
    process.exit(1);
  }

  console.log('📊 Current model configuration:\n');
  categories?.forEach(cat => {
    console.log(`  ${cat.id}. ${cat.name}`);
    console.log(`     Model: ${cat.openai_model || '(default)'}`);
    console.log(`     Preset: ${cat.llm_preset || '(default)'}`);
    console.log('');
  });

  // Check for invalid models
  const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  const invalidCategories = categories?.filter(cat =>
    cat.openai_model && !validModels.includes(cat.openai_model)
  );

  if (invalidCategories && invalidCategories.length > 0) {
    console.log('⚠️  Found categories with invalid models:\n');
    invalidCategories.forEach(cat => {
      console.log(`  ${cat.id}. ${cat.name} - Model: ${cat.openai_model}`);
    });

    console.log('\n🔧 Fixing invalid models to gpt-4o-mini...\n');

    for (const cat of invalidCategories) {
      const { error: updateError } = await supabase
        .from('categories')
        .update({ openai_model: 'gpt-4o-mini' })
        .eq('id', cat.id);

      if (updateError) {
        console.error(`❌ Failed to update category ${cat.id}:`, updateError);
      } else {
        console.log(`✅ Updated ${cat.name} to use gpt-4o-mini`);
      }
    }
  } else {
    console.log('✅ All categories have valid models!');
  }
}

checkModels()
  .then(() => {
    console.log('\n✅ Model check complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
