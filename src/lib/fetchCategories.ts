// 🧩 fetchCategories.ts - Professional Supabase categories fetcher with Zod validation
import { getSupabaseClient } from "./supabase";
import { parseCategories } from "../schemas/categorySchema";
import { simpleLogger } from "../utils/logger";

const supabase = getSupabaseClient();

export const fetchCategories = async () => {
  simpleLogger.info("🟡 [fetchCategories] Start fetching categories...");

  try {
    // --- STEP 1: Test połączenia z tabelą
    const tableCheck = await supabase
      .from("categories")
      .select("id")
      .limit(1);

    if (tableCheck.error) {
      simpleLogger.error("❌ [fetchCategories] Table check failed:", tableCheck.error);
      throw new Error("Supabase: Table 'categories' not found or inaccessible");
    }

    // --- STEP 2: Właściwe pobranie danych (tylko istniejące kolumny)
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      simpleLogger.error("❌ [fetchCategories] Supabase returned error:", error);
      return { success: false, data: [], error };
    }

    if (!data || data.length === 0) {
      simpleLogger.warn("⚠️ [fetchCategories] No categories found.");
      return { success: true, data: [] };
    }

    // Validate data with Zod schema
    try {
      const validatedData = parseCategories(data);
      simpleLogger.info(`✅ [fetchCategories] Fetched and validated ${validatedData.length} categories`);
      return { success: true, data: validatedData };
    } catch (validationError) {
      simpleLogger.error("❌ [fetchCategories] Validation failed:", validationError);
      return { success: false, data: [], error: validationError };
    }
  } catch (err) {
    simpleLogger.error("🔥 [fetchCategories] Unexpected error:", err);
    return { success: false, data: [], error: err };
  }
};
