/**
 * 🧪 Integration Test: Full Categorization Workflow
 *
 * Tests the complete flow from creating category to categorizing answers
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createTestAnswer, createTestCategory, createTestCode, testSupabase } from './setup';

describe('Categorization Workflow Integration', () => {
  let testCategory: any;
  let testAnswer: any;
  let testCode: any;

  beforeEach(async () => {
    // Setup test data
    testCategory = await createTestCategory('TEST_Fashion_Brands');
    testAnswer = await createTestAnswer(testCategory.id, 'Nike shoes');
    testCode = await createTestCode('TEST_Nike');
  });

  it('should complete full categorization workflow', async () => {
    // 1. Verify answer is uncategorized
    const { data: initialAnswer } = await testSupabase
      .from('answers')
      .select('general_status, selected_code')
      .eq('id', testAnswer.id)
      .single();

    expect(initialAnswer?.general_status).toBe('uncategorized');
    expect(initialAnswer?.selected_code).toBeNull();

    // 2. Apply code to answer (simulate user selection)
    const { error: updateError } = await testSupabase
      .from('answers')
      .update({
        selected_code: testCode.name,
        general_status: 'whitelist',
        quick_status: 'Confirmed',
        coding_date: new Date().toISOString(),
      })
      .eq('id', testAnswer.id);

    expect(updateError).toBeNull();

    // 3. Verify answer is categorized
    const { data: updatedAnswer } = await testSupabase
      .from('answers')
      .select('general_status, selected_code, quick_status')
      .eq('id', testAnswer.id)
      .single();

    expect(updatedAnswer?.general_status).toBe('whitelist');
    expect(updatedAnswer?.selected_code).toBe(testCode.name);
    expect(updatedAnswer?.quick_status).toBe('Confirmed');
  });

  it('should handle duplicate answers', async () => {
    // Create duplicate answer
    const duplicate = await createTestAnswer(testCategory.id, testAnswer.answer_text);

    // Apply code to original
    await testSupabase
      .from('answers')
      .update({ selected_code: testCode.name })
      .eq('id', testAnswer.id);

    // Find duplicates (simulating auto-copy logic)
    const { data: duplicates } = await testSupabase
      .from('answers')
      .select('id')
      .eq('category_id', testCategory.id)
      .eq('answer_text', testAnswer.answer_text)
      .neq('id', testAnswer.id)
      .is('selected_code', null);

    expect(duplicates).toHaveLength(1);
    expect(duplicates?.[0].id).toBe(duplicate.id);
  });
});
