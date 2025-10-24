/**
 * 🧪 Integration Test Setup
 *
 * Configures test database and helpers for integration tests
 */

import { createClient } from '@supabase/supabase-js';
import { afterEach } from 'vitest';

// Test database configuration
const TEST_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-key';

export const testSupabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_KEY);

// Test data cleanup
export async function cleanupTestData() {
  // Delete test categories (with cascade to answers)
  await testSupabase.from('categories').delete().like('name', 'TEST_%');

  // Delete test codes
  await testSupabase.from('codes').delete().like('name', 'TEST_%');
}

// Auto cleanup after each test
afterEach(async () => {
  await cleanupTestData();
});

// Helper: Create test category
export async function createTestCategory(name: string = 'TEST_Category') {
  const { data, error } = await testSupabase
    .from('categories')
    .insert({ name, description: 'Test category' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper: Create test answer
export async function createTestAnswer(categoryId: number, answerText: string = 'Test answer') {
  const { data, error } = await testSupabase
    .from('answers')
    .insert({
      category_id: categoryId,
      answer_text: answerText,
      general_status: 'uncategorized',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper: Create test code
export async function createTestCode(name: string = 'TEST_Code') {
  const { data, error } = await testSupabase.from('codes').insert({ name }).select().single();

  if (error) throw error;
  return data;
}
