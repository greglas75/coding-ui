import { supabase } from "./supabase";
import { simpleLogger } from "../utils/logger";

// 1️⃣ Pobierz wszystkie kody
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

// 2️⃣ Utwórz nowy kod
export async function createCode(name: string) {
  simpleLogger.info("🟢 [createCode] Creating code:", name);
  const { data, error } = await supabase.from("codes").insert([{ name }]).select().single();
  if (error) {
    simpleLogger.error("❌ Error creating code:", error);
    throw error;
  }
  return data;
}

// 3️⃣ Zapisz przypisanie kodów do odpowiedzi (many-to-many)
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

// 4️⃣ Pobierz AI sugestie z pola `ai_suggested_code`
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
