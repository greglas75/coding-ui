/**
 * Codes Repository
 * 
 * Domain-specific operations for codes table.
 * Handles CRUD operations and code-answer relationships.
 */

import { supabase } from '../lib/supabaseClient';
import { simpleLogger } from '../utils/logger';

/**
 * Fetch all codes from the database
 * 
 * @returns Array of codes with id and name
 * 
 * @example
 * const codes = await fetchCodes();
 * // [{ id: 1, name: 'Code1' }, { id: 2, name: 'Code2' }]
 */
export async function fetchCodes() {
  simpleLogger.info("🟡 [fetchCodes] Fetching all codes...");
  const { data, error } = await supabase
    .from("codes")
    .select("id, name")
    .order("name", { ascending: true });
  
  if (error) {
    simpleLogger.error("❌ Error fetching codes:", error);
    return [];
  }
  
  simpleLogger.info(`✅ [fetchCodes] ${data.length} codes fetched.`);
  return data;
}

/**
 * Create a new code
 * 
 * @param name - Code name
 * @returns Created code object
 * @throws Error if creation fails
 * 
 * @example
 * const code = await createCode('New Code');
 */
export async function createCode(name: string) {
  simpleLogger.info("🟢 [createCode] Creating code:", name);
  const { data, error } = await supabase
    .from("codes")
    .insert([{ name }])
    .select()
    .single();
  
  if (error) {
    simpleLogger.error("❌ Error creating code:", error);
    throw error;
  }
  
  return data;
}

/**
 * Save codes for an answer (many-to-many relationship)
 * 
 * @param answerId - Answer ID
 * @param codeIds - Array of code IDs to assign
 * @param mode - 'overwrite' to replace existing, 'additional' to add to existing
 * 
 * @example
 * await saveCodesForAnswer(123, [1, 2, 3], 'overwrite');
 */
export async function saveCodesForAnswer(
  answerId: number,
  codeIds: number[],
  mode: "overwrite" | "additional"
) {
  simpleLogger.info(`🟣 [saveCodesForAnswer] Saving codes for answer ${answerId}, mode=${mode}`);

  try {
    // Fetch existing codes
    const { data: existingCodes, error: fetchError } = await supabase
      .from('answer_codes')
      .select('code_id')
      .eq('answer_id', answerId);

    if (fetchError) throw fetchError;

    const existingIds = (existingCodes || []).map(r => r.code_id);
    simpleLogger.info(`🟣 [saveCodesForAnswer] Existing: ${existingIds.join(',')}, New: ${codeIds.join(',')}`);

    // If overwrite mode — delete old connections
    if (mode === 'overwrite') {
      const { error: deleteError } = await supabase
        .from('answer_codes')
        .delete()
        .eq('answer_id', answerId);

      if (deleteError) throw deleteError;
      simpleLogger.info('✅ [saveCodesForAnswer] Existing codes deleted');
    }

    // Prepare unique entries
    const uniqueIds = [...new Set(codeIds)];
    const records = uniqueIds.map(id => ({
      answer_id: answerId,
      code_id: id
    }));

    if (records.length === 0) {
      simpleLogger.warn('⚠️ [saveCodesForAnswer] No codes to insert.');
      return;
    }

    simpleLogger.info(`🟣 [saveCodesForAnswer] Records to insert:`, records);

    // Insert with on_conflict (no 409 error)
    const { error: insertError } = await supabase
      .from('answer_codes')
      .upsert(records, { onConflict: 'answer_id,code_id' });

    if (insertError) throw insertError;

    simpleLogger.info(`✅ [saveCodesForAnswer] ${records.length} codes saved successfully for answer ${answerId}`);

    // Update selected_code column in answers table
    await updateSelectedCodeColumn(answerId);
  } catch (error: any) {
    simpleLogger.error('❌ [saveCodesForAnswer] Error:', error);
  }
}

/**
 * Helper function to update selected_code column in answers table
 * Syncs the comma-separated code names with the answer_codes relationship
 */
async function updateSelectedCodeColumn(answerId: number) {
  try {
    // Get all codes for this answer
    const { data: allAnswerCodes, error: allCodesError } = await supabase
      .from("answer_codes")
      .select(`
        codes (
          name
        )
      `)
      .eq("answer_id", answerId);

    if (allCodesError) {
      simpleLogger.error("❌ Error fetching all answer codes:", allCodesError);
      return;
    }

    const allCodeNames = allAnswerCodes?.map((ac: any) => ac.codes?.name).filter(Boolean).join(', ') || null;

    const { error: updateError } = await supabase
      .from("answers")
      .update({ selected_code: allCodeNames })
      .eq("id", answerId);

    if (updateError) {
      simpleLogger.error("❌ Error updating selected_code:", updateError);
    } else {
      simpleLogger.info("✅ [saveCodesForAnswer] selected_code updated:", allCodeNames || "null");
    }
  } catch (err) {
    simpleLogger.error("❌ Error in updateSelectedCodeColumn:", err);
  }
}

