/**
 * Supabase Client and Helper Functions
 * 
 * Centralized Supabase operations for the application.
 * Includes client creation, basic CRUD operations, and advanced features.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import { simpleLogger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// CLIENT CREATION
// ═══════════════════════════════════════════════════════════════

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client instance.
 * This ensures only one client is created, preventing multiple GoTrueClient warnings.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        headers: { 'x-application-name': 'CodingApp' }
      }
    });

    // Debug guard in development
    if (import.meta.env.DEV) {
      console.info('✅ Supabase client initialized once (singleton)');
    }
  }

  return supabaseInstance;
}

// Export the singleton instance (backward compatibility)
export const supabase = getSupabaseClient();

// ═══════════════════════════════════════════════════════════════
// BASIC CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

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
  const { data, error } = await supabase.from("codes").insert([{ name }]).select().single();
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
export async function saveCodesForAnswer(answerId: number, codeIds: number[], mode: "overwrite" | "additional") {
  simpleLogger.info(`🟣 [saveCodesForAnswer] Saving codes for answer ${answerId}, mode=${mode}`);

  try {
    // 🔹 Fetch existing codes
    const { data: existingCodes, error: fetchError } = await supabase
      .from('answer_codes')
      .select('code_id')
      .eq('answer_id', answerId);

    if (fetchError) throw fetchError;

    const existingIds = (existingCodes || []).map(r => r.code_id);
    simpleLogger.info(`🟣 [saveCodesForAnswer] Existing: ${existingIds.join(',')}, New: ${codeIds.join(',')}`);

    // 🔹 Jeśli tryb overwrite — usuń stare połączenia
    if (mode === 'overwrite') {
      const { error: deleteError } = await supabase
        .from('answer_codes')
        .delete()
        .eq('answer_id', answerId);

      if (deleteError) throw deleteError;
      simpleLogger.info('✅ [saveCodesForAnswer] Existing codes deleted');
    }

    // 🔹 Przygotuj unikalne wpisy
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

    // 🔹 Insert z on_conflict (bez błędu 409)
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

// Helper function to update selected_code column
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

/**
 * Fetch AI suggestion for an answer
 * 
 * @param answerId - Answer ID
 * @returns Array with AI suggested code (or empty array)
 * 
 * @example
 * const suggestions = await fetchAISuggestion(123);
 * // ['Suggested Code']
 */
export async function fetchAISuggestion(answerId: number) {
  const { data, error } = await supabase
    .from("answers")
    .select("ai_suggested_code")
    .eq("id", answerId)
    .single();
  if (error) {
    simpleLogger.error("❌ Error fetching AI suggestion:", error);
    return [];
  }
  // Convert string to array if it exists
  return data?.ai_suggested_code ? [data.ai_suggested_code] : [];
}
