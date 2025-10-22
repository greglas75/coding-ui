#!/usr/bin/env node
/**
 * Seed toothpaste demo data for E2E tests
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedToothpaste() {
  console.log('🦷 Seeding toothpaste demo data...');

  try {
    // Create category (or get existing)
    console.log('Creating/finding Toothpaste category...');
    let categoryId;

    // Check if category exists
    const { data: existingCat } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Toothpaste')
      .maybeSingle();

    if (existingCat) {
      categoryId = existingCat.id;
      console.log(`✓ Category already exists: ${categoryId}`);
    } else {
      // Create new category
      const { data: newCat, error: catError } = await supabase
        .from('categories')
        .insert({ name: 'Toothpaste' })
        .select()
        .single();

      if (catError) throw catError;

      categoryId = newCat.id;
      console.log(`✓ Category created: ${categoryId}`);
    }

    console.log(`✓ Category created/found: ${categoryId}`);

    // Add sample answers
    console.log('Adding sample answers...');
    const answers = [
      { answer_text: 'sensodyne', translation: 'sensodyne', language: 'en', country: 'USA', general_status: 'uncategorized' },
      { answer_text: 'colgate', translation: 'colgate', language: 'en', country: 'USA', general_status: 'uncategorized' },
      { answer_text: 'crest', translation: 'crest', language: 'en', country: 'USA', general_status: 'uncategorized' },
      { answer_text: 'aquafresh', translation: 'aquafresh', language: 'en', country: 'USA', general_status: 'uncategorized' },
      { answer_text: 'pepsodent', translation: 'pepsodent', language: 'en', country: 'USA', general_status: 'uncategorized' },
      { answer_text: 'signal', translation: 'signal', language: 'en', country: 'USA', general_status: 'uncategorized' },
      { answer_text: 'oral b', translation: 'oral b', language: 'en', country: 'USA', general_status: 'uncategorized' },
      { answer_text: 'سنسوداين', translation: 'sensodyne', language: 'ar', country: 'Saudi Arabia', general_status: 'uncategorized' },
      { answer_text: 'كولجيت', translation: 'colgate', language: 'ar', country: 'Saudi Arabia', general_status: 'uncategorized' },
      { answer_text: 'سيجنال', translation: 'signal', language: 'ar', country: 'Saudi Arabia', general_status: 'uncategorized' },
      { answer_text: 'اورال بي', translation: 'oral b', language: 'ar', country: 'Saudi Arabia', general_status: 'uncategorized' },
      { answer_text: 'toothpaste', translation: 'toothpaste', language: 'en', country: 'USA', general_status: 'other' },
      { answer_text: 'pharmacy', translation: 'pharmacy', language: 'en', country: 'USA', general_status: 'other' },
      { answer_text: 'I don\'t know', translation: 'I don\'t know', language: 'en', country: 'USA', general_status: 'ignored' }
    ];

    // Add category_id to all answers
    const answersWithCategory = answers.map(a => ({ ...a, category_id: categoryId }));

    const { data: insertedAnswers, error: answerError } = await supabase
      .from('answers')
      .insert(answersWithCategory)
      .select();

    if (answerError) {
      throw answerError;
    }

    console.log(`✓ Added ${insertedAnswers.length} answers`);

    // Verify
    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    console.log('\n✅ Toothpaste demo data seeded successfully!');
    console.log(`   Category: Toothpaste (${categoryId})`);
    console.log(`   Answers: ${count}`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedToothpaste();
