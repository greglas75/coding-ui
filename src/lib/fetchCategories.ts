// 🧩 fetchCategories.ts - Professional Supabase categories fetcher
import { getSupabaseClient } from "./supabase";

const supabase = getSupabaseClient();

export const fetchCategories = async () => {
  console.log("🟡 [fetchCategories] Start fetching categories...");

  try {
    // --- STEP 1: Test połączenia z tabelą
    const tableCheck = await supabase
      .from("categories")
      .select("id")
      .limit(1);

    if (tableCheck.error) {
      console.error("❌ [fetchCategories] Table check failed:", tableCheck.error);
      throw new Error("Supabase: Table 'categories' not found or inaccessible");
    }

    // --- STEP 2: Właściwe pobranie danych (tylko istniejące kolumny)
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("❌ [fetchCategories] Supabase returned error:", error);
      return { success: false, data: [], error };
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ [fetchCategories] No categories found.");
      return { success: true, data: [] };
    }

    console.log(`✅ [fetchCategories] Fetched ${data.length} categories:`, data);
    return { success: true, data };
  } catch (err) {
    console.error("🔥 [fetchCategories] Unexpected error:", err);
    return { success: false, data: [], error: err };
  }
};
