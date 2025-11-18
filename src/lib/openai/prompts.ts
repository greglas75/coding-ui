/**
 * Prompt Building Utilities
 */

import { getTemplate, type TemplatePreset } from '../../config/DefaultTemplates';
import { simpleLogger } from '../../utils/logger';
import { DEFAULT_CATEGORIZATION_TEMPLATE } from './config';
import type { CategorizeRequest } from './types';

/**
 * Format codes array for the prompt
 */
export function formatCodes(codes: Array<{ id: string; name: string }>): string {
  return codes.map((code, idx) => `${idx + 1}. ${code.name} (ID: ${code.id})`).join('\n');
}

/**
 * Build answer section with both original and translation
 * Using both languages significantly improves accuracy and confidence scores
 */
export function buildAnswerSection(request: CategorizeRequest): string {
  let section = `\n\n=== ANSWER INFORMATION ===\n\n`;

  section += `Original Answer (${request.context.language || 'unknown'}): "${request.answer}"`;

  if (request.answerTranslation) {
    section += `\nEnglish Translation: "${request.answerTranslation}"`;
  }

  section += `\n\n=== INSTRUCTIONS ===
- Analyze BOTH the original answer and English translation (if provided)
- The original may contain brand names in local spelling
- The translation helps understand context and intent
- Consider information from BOTH languages for maximum accuracy
- Brand names like "Nike", "Colgate", "Coca-Cola" may appear in either version
- If brand name appears in original language, it's usually more reliable
- Use redundancy between languages to increase confidence scores
- Generic terms without specific brands should have lower confidence

=== FUZZY MATCHING (CRITICAL) ===
- **ALWAYS USE FUZZY MATCHING**: Allow for typos, misspellings, and minor variations
- Examples: "mediplua" → "Mediplus", "sensodyne" → "Sensodyne", "collegiate" → "Colgate"
- Ignore case differences (e.g., "NIKE" matches "nike")
- Allow 1-2 character differences for short words, 2-3 for longer words
- Common typos: adjacent key swaps (e.g., "colaget" → "Colgate"), missing letters, extra letters
- Match phonetically similar spellings (e.g., "sencodyne" → "Sensodyne")
- **If answer is 70%+ similar to a code name, consider it a match**
- Calculate similarity: "collegiate" vs "Colgate" = 7 matching letters/positions = strong match
- Still require high confidence (>0.8) for fuzzy matches if web evidence confirms it

=== VISION AI EVIDENCE (USE THIS!) ===
- IF Vision AI detected a brand in product images, give it VERY HIGH weight
- Vision AI analyzes actual product packaging, logos, and brand imagery
- If Vision AI says "Colgate" with 100% confidence, prioritize this over text analysis
- Vision AI can correct user typos by identifying actual products in images
- Example: User writes "collegiate", Vision AI detects "Colgate" logo → TRUST Vision AI

=== WEB SEARCH CONTEXT (CRITICAL FOR TYPOS) ===
- Use web search results to understand context and find brands mentioned in results
- If web results mention a specific brand frequently, consider it even if user text has typos
- Examples:
  * User: "blank" → Web shows "BlanX toothpaste" results → Suggest "BlanX"
  * User: "crest" → Web shows "Crest Pro-Health" → Suggest "Crest"
- Look for brand names in:
  * Page titles (e.g., "Shop Toothpaste - BlanX")
  * Snippets (e.g., "BlanX whitening toothpaste...")
  * URLs (e.g., "lifesupplies.com/.../blanx")
- If 2+ web results mention the same brand, it's strong evidence
- **IMPORTANT**: You can suggest codes found in web search EVEN IF they don't exist in available codes list
  * If web search clearly identifies a brand (e.g., "BlanX") but it's not in available codes, still suggest it
  * User will be prompted to create the new code after confirmation
  * This allows discovering correct brand names with proper spelling from web evidence`;

  return section;
}

/**
 * Build the system prompt by replacing template placeholders
 */
export function buildSystemPrompt(request: CategorizeRequest): string {
  // Get template: Use custom template if provided, otherwise use preset template
  let prompt: string;

  if (request.customTemplate) {
    prompt = request.customTemplate;
    simpleLogger.info(`📝 Using custom template from category`);
  } else {
    const presetTemplate = getTemplate(request.presetName as TemplatePreset);
    if (presetTemplate) {
      prompt = presetTemplate;
      simpleLogger.info(`📝 Using preset template: "${request.presetName}"`);
    } else {
      prompt = DEFAULT_CATEGORIZATION_TEMPLATE;
      simpleLogger.warn(
        `⚠️ Preset "${request.presetName}" not found, using DEFAULT_CATEGORIZATION_TEMPLATE`
      );
    }
  }

  // Replace placeholders
  prompt = prompt.replace(/\{name\}/g, request.categoryName);
  prompt = prompt.replace(/\{category\}/g, request.categoryName);
  prompt = prompt.replace(/\{searchTerm\}/g, request.categoryName);
  prompt = prompt.replace(/\{codes\}/g, formatCodes(request.codes));
  prompt = prompt.replace(/\{answer_lang\}/g, request.context.language || 'unknown');
  prompt = prompt.replace(/\{country\}/g, request.context.country || 'unknown');
  prompt = prompt.replace(/\{input\}/g, request.answer);

  // Add answer section with both original and translation
  prompt += buildAnswerSection(request);

  // Add JSON format instructions if not present in the template
  if (!prompt.includes('"suggestions"')) {
    prompt += `\n\nIMPORTANT: You must respond with valid JSON in this exact format:
{
  "suggestions": [
    {
      "code_id": "1",
      "code_name": "Nike",
      "confidence": 0.95,
      "reasoning": "User explicitly mentioned 'nike' in their response"
    }
  ]
}

Rules:
- Return 1-3 suggestions, ordered by confidence (highest first)
- confidence must be a number between 0.0 and 1.0
- Only suggest codes that are relevant to the answer
- If uncertain, use lower confidence scores
- Always provide clear reasoning for each suggestion`;
  }

  return prompt;
}

