import { supabase } from "./supabase";

// 1️⃣ Pobierz wszystkie kody
export async function fetchCodes() {
  console.log("🟡 [fetchCodes] Fetching all codes...");
  const { data, error } = await supabase
    .from("codes")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) {
    console.error("❌ Error fetching codes:", error);
    return [];
  }
  console.log(`✅ [fetchCodes] ${data.length} codes fetched.`);
  return data;
}

// 2️⃣ Utwórz nowy kod
export async function createCode(name: string) {
  console.log("🟢 [createCode] Creating code:", name);
  const { data, error } = await supabase.from("codes").insert([{ name }]).select().single();
  if (error) {
    console.error("❌ Error creating code:", error);
    throw error;
  }
  return data;
}

// 3️⃣ Zapisz przypisanie kodów do odpowiedzi (many-to-many)
export async function saveCodesForAnswer(answerId: number, codeIds: number[], mode: "overwrite" | "additional") {
  console.log(`🟣 [saveCodesForAnswer] Saving codes for answer ${answerId}, mode=${mode}`);

  try {
    // 🔹 Fetch existing codes
    const { data: existingCodes, error: fetchError } = await supabase
      .from('answer_codes')
      .select('code_id')
      .eq('answer_id', answerId);

    if (fetchError) throw fetchError;

    const existingIds = (existingCodes || []).map(r => r.code_id);
    console.log(`🟣 [saveCodesForAnswer] Existing: ${existingIds.join(',')}, New: ${codeIds.join(',')}`);

    // 🔹 Jeśli tryb overwrite — usuń stare połączenia
    if (mode === 'overwrite') {
      const { error: deleteError } = await supabase
        .from('answer_codes')
        .delete()
        .eq('answer_id', answerId);

      if (deleteError) throw deleteError;
      console.log('✅ [saveCodesForAnswer] Existing codes deleted');
    }

    // 🔹 Przygotuj unikalne wpisy
    const uniqueIds = [...new Set(codeIds)];
    const records = uniqueIds.map(id => ({
      answer_id: answerId,
      code_id: id
    }));

    if (records.length === 0) {
      console.warn('⚠️ [saveCodesForAnswer] No codes to insert.');
      return;
    }

    console.log(`🟣 [saveCodesForAnswer] Records to insert:`, records);

    // 🔹 Insert z on_conflict (bez błędu 409)
    const { error: insertError } = await supabase
      .from('answer_codes')
      .upsert(records, { onConflict: 'answer_id,code_id' });

    if (insertError) throw insertError;

    console.log(`✅ [saveCodesForAnswer] ${records.length} codes saved successfully for answer ${answerId}`);

    // Update selected_code column in answers table
    await updateSelectedCodeColumn(answerId);
  } catch (error: any) {
    console.error('❌ [saveCodesForAnswer] Error:', error);
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
      console.error("❌ Error fetching all answer codes:", allCodesError);
      return;
    }

    const allCodeNames = allAnswerCodes?.map((ac: any) => ac.codes?.name).filter(Boolean).join(', ') || null;

    const { error: updateError } = await supabase
      .from("answers")
      .update({ selected_code: allCodeNames })
      .eq("id", answerId);

    if (updateError) {
      console.error("❌ Error updating selected_code:", updateError);
    } else {
      console.log("✅ [saveCodesForAnswer] selected_code updated:", allCodeNames || "null");
    }
  } catch (err) {
    console.error("❌ Error in updateSelectedCodeColumn:", err);
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
    console.error("❌ Error fetching AI suggestion:", error);
    return [];
  }
  // Convert string to array if it exists
  return data?.ai_suggested_code ? [data.ai_suggested_code] : [];
}
