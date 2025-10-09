export interface Code {
  id: number;
  name: string;
  is_whitelisted: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CodeWithCategories extends Code {
  category_ids: number[]; // pomocniczo po stronie UI
}

export interface Category {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export type GeneralStatus = 'uncategorized' | 'whitelist' | 'blacklist' | 'categorized' | 'global_blacklist' | 'Other' | 'Ignored' | 'Global Blacklist' | 'Whitelist' | null;

/**
 * AI Suggestion structure for a single code suggestion
 */
export interface AiCodeSuggestion {
  code_id: string;
  code_name: string;
  confidence: number; // 0.0 to 1.0
  reasoning: string;
}

/**
 * Complete AI suggestions object stored in JSONB
 */
export interface AiSuggestions {
  suggestions: AiCodeSuggestion[];
  model: string; // e.g., "gpt-4.1-nano", "gpt-4o"
  timestamp: string; // ISO 8601
  preset_used: string; // e.g., "LLM Brand List"
}

export interface Answer {
  id: number;
  answer_text: string;
  translation: string | null;
  translation_en: string | null;  // readonly (system/GPT)
  language: string | null;
  country: string | null;
  quick_status: 'Other' | 'Ignore' | 'Global Blacklist' | 'Blacklist' | 'Confirmed' | null;
  general_status: GeneralStatus;
  selected_code: string | null;  // readonly chip in cell, edited only via modal
  ai_suggested_code: string | null;
  ai_suggestions: AiSuggestions | null; // Full AI suggestions with confidence scores
  category_id: number | null;
  coding_date: string | null;  // ISO
  confirmed_by?: string | null;  // email of user who confirmed
  created_at?: string;
  updated_at?: string;
}
