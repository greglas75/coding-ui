export interface Code {
  id: number;
  name: string;
  is_whitelisted: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CodeWithCategories extends Code {
  category_ids: number[]; // pomocniczo po stronie UI
}

export interface Category {
  id: number;
  name: string;
  google_name?: string;
  description?: string;
  template?: string; // DEPRECATED: Use gpt_template instead
  preset?: string; // DEPRECATED: Use llm_preset instead
  model?: string; // DEPRECATED: Use openai_model, claude_model, or gemini_model instead
  llm_preset?: string; // Template preset name (e.g., "LLM Proper Name", "LLM Brand List")
  gpt_template?: string; // Custom GPT template (overrides preset)
  openai_model?: string; // OpenAI model (e.g., "gpt-4o-mini", "gpt-5")
  claude_model?: string; // Claude model (e.g., "claude-sonnet-4.5-20250929")
  gemini_model?: string; // Gemini model (e.g., "gemini-2.0-pro-experimental")
  brands_sorting?: string;
  min_length?: number;
  max_length?: number;
  use_web_context?: boolean; // default: true - enables Google Search context for AI
  created_at?: string | null;
  updated_at?: string | null;
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
  isNew?: boolean; // True if code doesn't exist in database yet (discovered from web search)
}

/**
 * Web context from Google Search
 */
export interface WebContext {
  title: string;
  snippet: string;
  url: string;
}

/**
 * Image result from Google Images
 */
export interface ImageResult {
  title: string;
  link: string;
  thumbnailLink?: string;
  contextLink?: string;
  displayLink?: string; // Domain (e.g., "sensodyne.com")
  snippet?: string; // Image description from page context
  mime?: string; // Image MIME type (e.g., "image/jpeg")
  fileFormat?: string; // File format (e.g., "image/jpeg")
  width?: number; // Image width in pixels
  height?: number; // Image height in pixels
  byteSize?: number; // File size in bytes
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

/**
 * Vision analysis result from Gemini Vision API
 */
export interface VisionAnalysisResult {
  brandDetected: boolean;
  brandName: string;
  confidence: number; // 0.0 to 1.0
  reasoning: string;
  objectsDetected: string[];
  costEstimate?: number; // Estimated cost in USD
  imagesAnalyzed?: number; // Number of images actually analyzed
}

/**
 * Complete AI suggestions object stored in JSONB
 */
export interface AiSuggestions {
  suggestions: AiCodeSuggestion[];
  model: string; // e.g., "gpt-4.1-nano", "gpt-4o"
  timestamp: string; // ISO 8601
  preset_used: string; // e.g., "LLM Brand List"
  webContext?: WebContext[]; // Google Search results
  images?: ImageResult[]; // Google Images results
  searchQuery?: string; // Exact phrase used in Google search
  visionResult?: VisionAnalysisResult; // Gemini Vision API analysis
  categoryName?: string; // Category name (e.g., "Toothpaste", "Brand")
  multiSourceResult?: any; // Multi-source validation result (imported type causes circular dependency)
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
  created_at?: string | null;
  updated_at?: string | null;
}
