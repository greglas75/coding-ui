/**
 * 🤖 AI Categorization API
 *
 * Server-side functions for categorizing answers with OpenAI
 */

import { categorizeAnswer, DEFAULT_CATEGORIZATION_TEMPLATE } from '../lib/openai';
import { supabase } from '../lib/supabase';
import type { AiSuggestions } from '../types';

/**
 * Categorize a single answer using AI and store results in database
 *
 * @param answerId - The ID of the answer to categorize
 * @param forceRegenerate - If true, bypass cache and generate new suggestions (default: false)
 * @returns Array of AI suggestions
 *
 * @throws Error if answer not found or categorization fails
 */
export async function categorizeSingleAnswer(answerId: number, forceRegenerate: boolean = false) {
  try {
    // 1. Fetch answer with category info and codes
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .select(`
        *,
        category:categories!inner(
          id,
          name
        )
      `)
      .eq('id', answerId)
      .single();

    if (answerError || !answer) {
      throw new Error(`Answer not found: ${answerError?.message || 'Unknown error'}`);
    }

    // 2. Check for cached suggestions (if not forcing regeneration)
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const cachedSuggestions = answer.ai_suggestions;

    if (cachedSuggestions && !forceRegenerate) {
      const cacheAge = Date.now() - new Date(cachedSuggestions.timestamp).getTime();

      if (cacheAge < CACHE_DURATION) {
        console.log(`♻️ Using cached AI suggestions for answer ${answerId} (age: ${Math.floor(cacheAge / 60000)}m)`);
        return cachedSuggestions.suggestions;
      } else {
        console.log(`⏰ Cache expired for answer ${answerId} (age: ${Math.floor(cacheAge / 86400000)}d), regenerating...`);
      }
    }

    // 3. Get available codes (cache miss or expired, need to regenerate)
    const { data: codes, error: codesError } = await supabase
      .from('codes')
      .select('id, name')
      .order('name');

    if (codesError || !codes) {
      throw new Error(`Failed to fetch codes: ${codesError?.message || 'Unknown error'}`);
    }

    type SimpleCode = { id: number; name: string };

    // 4. Get category's preset, custom template, model, and vision model
    const { data: categoryData } = await supabase
      .from('categories')
      .select('llm_preset, gpt_template, openai_model, vision_model, use_web_context')
      .eq('id', answer.category.id)
      .single();

    const presetName = categoryData?.llm_preset || 'LLM Proper Name'; // Default preset
    const customTemplate = categoryData?.gpt_template; // Custom template (overrides preset)
    const openaiModel = categoryData?.openai_model || 'gpt-4o-mini'; // Default model
    const visionModel = categoryData?.vision_model || 'gemini-2.5-flash-lite'; // Vision model for image analysis
    const useWebContext = categoryData?.use_web_context ?? true; // Enable web context by default

    // 5. Call OpenAI API
    console.log(`🤖 Categorizing answer ${answerId} for category "${answer.category.name}"`);
    console.log(`   Original (${answer.language || 'unknown'}): "${answer.answer_text?.substring(0, 50)}..."`);
    if (answer.translation_en) {
      console.log(`   Translation (en): "${answer.translation_en?.substring(0, 50)}..."`);
    }

    const result = await categorizeAnswer({
      answer: answer.answer_text,
      answerTranslation: answer.translation_en, // ✅ Add English translation for better accuracy
      categoryName: answer.category.name,
      presetName: presetName, // Template preset (e.g., "LLM Proper Name")
      customTemplate: customTemplate, // Custom template (overrides preset if provided)
      model: openaiModel, // OpenAI model from category
      visionModel: useWebContext ? visionModel : undefined, // Vision model for image analysis (only if web context enabled)
      codes: codes.map((c: SimpleCode) => ({ id: String(c.id), name: c.name })),
      context: {
        language: answer.language || undefined,
        country: answer.country || undefined,
      },
    });

    console.log(`✅ Got ${result.suggestions.length} suggestions for answer ${answerId}`);
    if (result.webContext && result.webContext.length > 0) {
      console.log(`🌐 Got ${result.webContext.length} web results`);
    }
    if (result.images && result.images.length > 0) {
      console.log(`🖼️ Got ${result.images.length} images`);
    }

    // 6. Build AiSuggestions object
    const aiSuggestions: AiSuggestions = {
      suggestions: result.suggestions,
      model: openaiModel, // Use model from category
      timestamp: new Date().toISOString(),
      preset_used: presetName, // Store which preset was used
      webContext: result.webContext,
      images: result.images,
    };

    // 7. Save suggestions to database
    const { error: updateError } = await supabase
      .from('answers')
      .update({
        ai_suggestions: aiSuggestions,
        ai_suggested_code: result.suggestions[0]?.code_name || null,
      })
      .eq('id', answerId);

    if (updateError) {
      throw new Error(`Failed to update answer: ${updateError.message}`);
    }

    console.log(`💾 Stored AI suggestions for answer ${answerId}`);

    return result.suggestions;

  } catch (error) {
    console.error('Categorization error:', error);
    throw error;
  }
}

/**
 * Categorize multiple answers in batch
 *
 * @param answerIds - Array of answer IDs to categorize
 * @returns Object with success and error counts
 */
export async function categorizeBatchAnswers(answerIds: number[]) {
  console.log(`🤖 Starting batch categorization for ${answerIds.length} answers`);

  const results = {
    processed: 0,
    errors: 0,
    errorDetails: [] as Array<{ answerId: number; error: string }>,
  };

  for (const answerId of answerIds) {
    try {
      await categorizeSingleAnswer(answerId);
      results.processed++;
    } catch (error) {
      results.errors++;
      results.errorDetails.push({
        answerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error(`Failed to categorize answer ${answerId}:`, error);
    }
  }

  console.log(`✅ Batch complete: ${results.processed} processed, ${results.errors} errors`);

  return results;
}

/**
 * Categorize all uncoded answers in a category
 *
 * @param categoryId - The category ID
 * @param limit - Maximum number of answers to process (default: 100)
 * @returns Object with success and error counts
 */
export async function categorizeCategoryAnswers(
  categoryId: number,
  limit: number = 100
) {
  // Get uncoded answers for this category
  const { data: answers, error } = await supabase
    .from('answers')
    .select('id')
    .eq('category_id', categoryId)
    .is('selected_code', null)
    .is('ai_suggestions', null)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch answers: ${error.message}`);
  }

  if (!answers || answers.length === 0) {
    return {
      processed: 0,
      errors: 0,
      errorDetails: [],
    };
  }

  const answerIds = answers.map((a: { id: number }) => a.id);
  return categorizeBatchAnswers(answerIds);
}

/**
 * Auto-confirm high-confidence AI suggestions
 *
 * @param categoryId - The category ID (optional, null for all categories)
 * @param confidenceThreshold - Minimum confidence score (default: 0.95)
 * @returns Object with confirmation counts
 */
export async function autoConfirmHighConfidence(
  categoryId: number | null = null,
  confidenceThreshold: number = 0.95
) {
  // Get high-confidence suggestions using database function
  const { data: suggestions, error } = await supabase
    .rpc('get_high_confidence_suggestions', {
      p_category_id: categoryId,
      p_min_confidence: confidenceThreshold,
      p_limit: 1000,
    });

  if (error) {
    throw new Error(`Failed to get suggestions: ${error.message}`);
  }

  if (!suggestions || suggestions.length === 0) {
    return {
      confirmed: 0,
      total: 0,
    };
  }

  console.log(`🚀 Auto-confirming ${suggestions.length} high-confidence suggestions...`);

  let confirmed = 0;

  for (const suggestion of suggestions) {
    try {
      // Update answer with confirmed code
      const { error: updateError } = await supabase
        .from('answers')
        .update({
          selected_code: suggestion.suggested_code,
          quick_status: 'Confirmed',
          general_status: 'whitelist',
          coding_date: new Date().toISOString(),
          confirmed_by: 'AI Agent',
        })
        .eq('id', suggestion.answer_id);

      if (updateError) {
        console.error(`Failed to update answer ${suggestion.answer_id}:`, updateError);
        continue;
      }

      // Log to audit trail
      const { error: auditError } = await supabase
        .from('ai_audit_log')
        .insert({
          answer_id: suggestion.answer_id,
          category_id: categoryId,
          answer_text: suggestion.answer_text,
          selected_code: suggestion.suggested_code,
          probability: suggestion.confidence,
          ai_model: suggestion.model,
          action: 'auto_confirm',
          metadata: {
            confidence_threshold: confidenceThreshold,
            reasoning: suggestion.reasoning,
          },
        });

      if (auditError) {
        console.error(`Failed to log audit for answer ${suggestion.answer_id}:`, auditError);
      }

      confirmed++;
    } catch (error) {
      console.error(`Error confirming answer ${suggestion.answer_id}:`, error);
    }
  }

  console.log(`✅ Auto-confirmed ${confirmed} out of ${suggestions.length} answers`);

  return {
    confirmed,
    total: suggestions.length,
  };
}
