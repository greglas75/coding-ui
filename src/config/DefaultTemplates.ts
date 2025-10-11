// ═══════════════════════════════════════════════════════════════
// 📝 Default AI Templates - Semantic prompts for categorization
// ═══════════════════════════════════════════════════════════════

export type TemplatePreset =
  | 'LLM Proper Name'
  | 'LLM Brand List'
  | 'LLM Sentiment'
  | 'LLM Entity Detection'
  | 'LLM Yes/No'
  | 'LLM First Letter'
  | 'LLM Description Extractor'
  | 'LLM Translation Validator'
  | 'LLM Geo Brand Detector'
  | 'Custom';

export interface TemplateConfig {
  name: TemplatePreset;
  description: string;
  template: string;
  variables: string[]; // Placeholders like {category}, {searchTerm}
}

/**
 * Default AI templates for various categorization tasks.
 * Use semantic instructions without hardcoded examples.
 */
export const DefaultTemplates: Record<TemplatePreset, TemplateConfig> = {
  'LLM Proper Name': {
    name: 'LLM Proper Name',
    description: 'Brand verification, normalization & validation with search evidence',
    template: `You are a brand verification and normalization assistant.

TASK:
Detect and normalize brand names from the user's message related to "{searchTerm}" or "{category}".
Correct spelling, capitalization, and transliteration issues.

CONTEXT:
- Category: {category}
- Search Reference: {searchTerm}

RULES:
1. Accept only verified, **real-world brands** with web presence
2. Correct common misspellings and normalize capitalization
3. Handle multilingual brand names:
   - Arabic script (preserve original, normalize to Latin if possible)
   - Cyrillic (preserve original, normalize to Latin if possible)
   - Asian scripts (preserve original, normalize to Latin if possible)
   - Transliterations (normalize to standard spelling)
4. Use Google Search and Image Search as evidence:
   - Logos, packaging, product images → strong evidence
   - Retail websites, official pages → confirms existence
5. Reject:
   - Generic terms (product categories, not brands)
   - Fictional or made-up names
   - Unrelated brands (different product category)

Return JSON:
{
  "normalized": "{brand_name}",
  "confidence": 0.92,
  "status": "whitelist | uncertain | reject",
  "reasoning": "{explain_evidence}"
}`,
    variables: ['{category}', '{searchTerm}'],
  },

  'LLM Brand List': {
    name: 'LLM Brand List',
    description: 'Match brands from full list with spelling variants and transliterations',
    template: `You are a brand classification assistant.

TASK:
Match the user's message to the most likely brand(s) from the list below:
{codes}

RULES:
- Consider alternate spellings, transliterations, and local variants
- Use your knowledge of international and local brands
- If message mentions a product, slogan, or parent company, infer the underlying brand
- Handle misspellings and phonetic variations
- If no matching brand exists, propose ONE new possible code and mark as "new_suggestion"

USER MESSAGE:
{input}

Return JSON:
{
  "matches": ["{code1}", "{code2}"],
  "new_suggestion": "{optional_new_code}",
  "confidence": 0.85,
  "reasoning": "{explain_match}"
}`,
    variables: ['{category}', '{codes}', '{input}'],
  },

  'LLM Sentiment': {
    name: 'LLM Sentiment',
    description: 'Sentiment analysis (positive, neutral, negative)',
    template: `Classify the sentiment of the following text as positive, neutral, or negative.

TEXT:
{input}

RESPONSE FORMAT:
[positive/neutral/negative] — [one-sentence reasoning]

EXAMPLE:
{sentiment} — {reasoning}`,
    variables: ['{input}'],
  },

  'LLM Entity Detection': {
    name: 'LLM Entity Detection',
    description: 'Detects named entities (brands, products, places, organizations)',
    template: `Identify and extract all named entities from the following text.

CATEGORIES:
- Brands (product brands, companies)
- Products (specific product names)
- Places (cities, countries, regions)
- Organizations (companies, institutions)

TEXT:
{input}

RESPONSE FORMAT (JSON):
{
  "brands": ["{brand1}", "{brand2}"],
  "products": ["{product1}"],
  "places": ["{place1}"],
  "organizations": ["{org1}"]
}`,
    variables: ['{input}'],
  },

  'LLM Yes/No': {
    name: 'LLM Yes/No',
    description: 'Simple yes/no classification with reasoning',
    template: `Answer the following question with "yes" or "no" and provide brief reasoning.

QUESTION:
Does the following text relate to "{category}" or "{searchTerm}"?

TEXT:
{input}

RESPONSE FORMAT:
[yes/no] — [reasoning]`,
    variables: ['{category}', '{searchTerm}', '{input}'],
  },

  'LLM First Letter': {
    name: 'LLM First Letter',
    description: 'Quick brand matching using first-letter filtering (performance optimization)',
    template: `You are a lightweight assistant performing first-letter brand matching.

TASK:
Given a user input, select the most likely brand(s) from the subset below.
These brands all start with the same letter as the user's input.

AVAILABLE BRANDS (FIRST LETTER MATCH):
{codes_letter}

RULES:
- Focus on first-letter match and phonetic similarity
- Ignore case, accents, and diacritics
- Handle common misspellings and transliterations
- Return only the top 1-2 matches
- If no good match, return "None"

USER INPUT:
{input}

RESPONSE FORMAT:
{code1}, {code2}

OR

None — {reasoning}`,
    variables: ['{codes_letter}', '{input}'],
  },

  'LLM Description Extractor': {
    name: 'LLM Description Extractor',
    description: 'Extracts motivations and brand perceptions from user responses',
    template: `You are a research assistant extracting reasons and brand perceptions.

TASK:
Summarize why the respondent mentioned the brand "{searchTerm}" in category "{category}".
Identify key motivation themes and emotional drivers.

USER RESPONSE:
{input}

MOTIVATION THEMES TO CONSIDER:
- Price/value (affordable, cheap, expensive, worth it)
- Quality (effective, reliable, premium, poor)
- Trust (trusted, recommended, verified, certified)
- Habit (always use, regular, familiar, used to)
- Availability (easy to find, everywhere, convenient)
- Recommendation (friend suggested, doctor recommended, influencer)
- Brand loyalty (loyal, fan, prefer, favorite)
- Innovation (new, modern, advanced, technology)

Return JSON:
{
  "brand": "{brand_name}",
  "motivations": ["{theme1}", "{theme2}"],
  "tone": "positive | neutral | negative",
  "sentiment_score": 0.85,
  "summary": "{brief_summary}",
  "quotes": ["{relevant_quote}"]
}`,
    variables: ['{category}', '{searchTerm}', '{input}'],
  },

  'LLM Translation Validator': {
    name: 'LLM Translation Validator',
    description: 'Validates translation consistency and accuracy',
    template: `You are a translation consistency validator.

TASK:
Compare the meaning of the original and translated responses.
Determine if the translation preserves the intended meaning, tone, and brand names.

ORIGINAL TEXT:
{original}

TRANSLATED TEXT:
{translation}

TARGET LANGUAGE: English

VALIDATION CRITERIA:
- Meaning preservation (same core message?)
- Tone consistency (formal/informal maintained?)
- Brand names preserved (not translated literally)
- Cultural context maintained
- No information loss or addition

Return JSON:
{
  "consistency": "accurate | partial | incorrect",
  "meaning_preserved": true | false,
  "tone_preserved": true | false,
  "brands_preserved": true | false,
  "issues": ["{issue1}", "{issue2}"],
  "confidence": 0.95,
  "reasoning": "{explanation}"
}`,
    variables: ['{original}', '{translation}'],
  },

  'LLM Geo Brand Detector': {
    name: 'LLM Geo Brand Detector',
    description: 'Detects brand geographic scope (local/regional/global)',
    template: `You are a localization and market intelligence assistant.

TASK:
Determine whether the mentioned brand is local, regional, or global.
Use knowledge of market presence, geography, and common availability.

BRAND: {searchTerm}
CATEGORY: {category}
USER MESSAGE: {input}

CLASSIFICATION CRITERIA:
- **Local**: Available in 1-2 countries
- **Regional**: Available in a region (multiple countries)
- **Global**: Available worldwide

Return JSON:
{
  "brand": "{brand_name}",
  "scope": "local | regional | global",
  "primary_region": "{region}",
  "countries": ["{country1}", "{country2}"],
  "market_maturity": "emerging | established | declining",
  "confidence": 0.88,
  "reasoning": "{market_analysis}"
}`,
    variables: ['{category}', '{searchTerm}', '{input}'],
  },

  'Custom': {
    name: 'Custom',
    description: 'User-defined custom template',
    template: '',
    variables: [],
  },
};

/**
 * Fills template with actual values.
 *
 * @param preset - Template preset name
 * @param variables - Variable values to replace
 * @returns Filled template
 */
export function fillTemplate(
  preset: TemplatePreset,
  variables: Record<string, string>
): string {
  const config = DefaultTemplates[preset];
  if (!config) {
    return '';
  }

  let filled = config.template;

  // Replace all variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    filled = filled.replaceAll(placeholder, value);
  }

  return filled.trim();
}

/**
 * Gets template for preset.
 */
export function getTemplate(preset: TemplatePreset): string {
  return DefaultTemplates[preset]?.template || '';
}

/**
 * Gets all available presets.
 */
export function getAvailablePresets(): TemplatePreset[] {
  return Object.keys(DefaultTemplates) as TemplatePreset[];
}

/**
 * Gets template config with metadata.
 */
export function getTemplateConfig(preset: TemplatePreset): TemplateConfig | undefined {
  return DefaultTemplates[preset];
}

