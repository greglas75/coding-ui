import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface AIResult {
  items?: Array<{
    item: string;
    probability: number;
    category?: string;
  }>;
  model?: string;
  timestamp?: string;
}

interface AutoConfirmResult {
  processed: number;
  confirmed: number;
  skipped: number;
  errors: number;
  details: Array<{
    id: number;
    answer_text: string;
    code: string;
    probability: number;
    status: 'confirmed' | 'skipped' | 'error';
    reason?: string;
  }>;
}

interface AutoConfirmOptions {
  minProbability?: number;
  maxBatchSize?: number;
  dryRun?: boolean;
  categoryId?: number;
  logToDatabase?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 🤖 MAIN AUTO-CONFIRM FUNCTION
// ═══════════════════════════════════════════════════════════════

export async function autoConfirm(
  options: AutoConfirmOptions = {}
): Promise<AutoConfirmResult> {
  const {
    minProbability = 0.90,
    maxBatchSize = 100,
    dryRun = false,
    categoryId,
    logToDatabase = true,
  } = options;

  console.log('🤖 [AutoConfirm] Starting with options:', {
    minProbability,
    maxBatchSize,
    dryRun,
    categoryId,
  });

  const result: AutoConfirmResult = {
    processed: 0,
    confirmed: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  try {
    // ✅ Fetch pending answers (uncategorized with AI results)
    let query = supabase
      .from('answers')
      .select('id, answer_text, ai_result, category_id, selected_code')
      .eq('general_status', 'uncategorized')
      .not('ai_result', 'is', null)
      .limit(maxBatchSize);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: pending, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ [AutoConfirm] Error fetching pending answers:', fetchError);
      throw fetchError;
    }

    if (!pending || pending.length === 0) {
      console.log('✅ [AutoConfirm] No pending answers to process');
      return result;
    }

    console.log(`📊 [AutoConfirm] Found ${pending.length} pending answers`);

    // ✅ Process each answer
    for (const answer of pending) {
      result.processed++;

      try {
        // Parse AI result
        const aiResult: AIResult = JSON.parse(answer.ai_result || '{}');
        const topPrediction = aiResult.items?.[0];

        if (!topPrediction) {
          result.skipped++;
          result.details.push({
            id: answer.id,
            answer_text: answer.answer_text || '',
            code: '',
            probability: 0,
            status: 'skipped',
            reason: 'No AI predictions available',
          });
          continue;
        }

        const probability = topPrediction.probability;
        const suggestedCode = topPrediction.item;

        console.log(`🔍 [AutoConfirm] Answer ${answer.id}: ${suggestedCode} (${(probability * 100).toFixed(1)}%)`);

        // ✅ Check if probability meets threshold
        if (probability < minProbability) {
          result.skipped++;
          result.details.push({
            id: answer.id,
            answer_text: answer.answer_text || '',
            code: suggestedCode,
            probability,
            status: 'skipped',
            reason: `Probability too low (${(probability * 100).toFixed(1)}% < ${(minProbability * 100).toFixed(1)}%)`,
          });
          continue;
        }

        // ✅ Verify code exists in database
        const { data: codeData, error: codeError } = await supabase
          .from('codes')
          .select('id, name')
          .ilike('name', suggestedCode)
          .limit(1)
          .single();

        if (codeError || !codeData) {
          result.skipped++;
          result.details.push({
            id: answer.id,
            answer_text: answer.answer_text || '',
            code: suggestedCode,
            probability,
            status: 'skipped',
            reason: `Code "${suggestedCode}" not found in database`,
          });
          continue;
        }

        // ✅ Dry run mode - just log, don't update
        if (dryRun) {
          result.confirmed++;
          result.details.push({
            id: answer.id,
            answer_text: answer.answer_text || '',
            code: suggestedCode,
            probability,
            status: 'confirmed',
            reason: 'DRY RUN - Would confirm',
          });
          console.log(`✅ [AutoConfirm] DRY RUN: Would confirm answer ${answer.id} with ${suggestedCode}`);
          continue;
        }

        // ✅ Update answer status
        const { error: updateError } = await supabase
          .from('answers')
          .update({
            general_status: 'whitelist',
            selected_code: codeData.name,
            quick_status: 'Confirmed',
            updated_at: new Date().toISOString(),
            confirmed_by: 'AI Auto-Confirm',
            coding_date: new Date().toISOString(),
          })
          .eq('id', answer.id);

        if (updateError) {
          result.errors++;
          result.details.push({
            id: answer.id,
            answer_text: answer.answer_text || '',
            code: suggestedCode,
            probability,
            status: 'error',
            reason: updateError.message,
          });
          console.error(`❌ [AutoConfirm] Error updating answer ${answer.id}:`, updateError);
          continue;
        }

        // ✅ Create answer_codes relationship
        const { error: relationError } = await supabase
          .from('answer_codes')
          .insert({
            answer_id: answer.id,
            code_id: codeData.id,
          });

        if (relationError) {
          console.warn(`⚠️ [AutoConfirm] Error creating answer_codes relation:`, relationError);
        }

        // ✅ Log to audit table
        if (logToDatabase) {
          await logAutoConfirmation({
            answer_id: answer.id,
            answer_text: answer.answer_text || '',
            selected_code: codeData.name,
            probability,
            ai_model: aiResult.model || 'unknown',
          });
        }

        result.confirmed++;
        result.details.push({
          id: answer.id,
          answer_text: answer.answer_text || '',
          code: suggestedCode,
          probability,
          status: 'confirmed',
        });

        console.log(`✅ [AutoConfirm] Confirmed answer ${answer.id}: ${suggestedCode} (${(probability * 100).toFixed(1)}%)`);
      } catch (err: any) {
        result.errors++;
        result.details.push({
          id: answer.id,
          answer_text: answer.answer_text || '',
          code: '',
          probability: 0,
          status: 'error',
          reason: err.message,
        });
        console.error(`❌ [AutoConfirm] Error processing answer ${answer.id}:`, err);
      }
    }

    console.log('✅ [AutoConfirm] Complete:', {
      processed: result.processed,
      confirmed: result.confirmed,
      skipped: result.skipped,
      errors: result.errors,
    });

    return result;
  } catch (err: any) {
    console.error('❌ [AutoConfirm] Fatal error:', err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
// 📝 LOG AUTO-CONFIRMATION TO AUDIT TABLE
// ═══════════════════════════════════════════════════════════════

async function logAutoConfirmation(params: {
  answer_id: number;
  answer_text: string;
  selected_code: string;
  probability: number;
  ai_model: string;
}): Promise<void> {
  try {
    const { error } = await supabase.from('ai_audit_log').insert({
      answer_id: params.answer_id,
      answer_text: params.answer_text,
      selected_code: params.selected_code,
      probability: params.probability,
      ai_model: params.ai_model,
      action: 'auto_confirm',
      confirmed_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('⚠️ [AutoConfirm] Error logging to audit table:', error);
    }
  } catch (err) {
    console.warn('⚠️ [AutoConfirm] Failed to log audit:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 GET AUTO-CONFIRM STATISTICS
// ═══════════════════════════════════════════════════════════════

export async function getAutoConfirmStats(
  categoryId?: number
): Promise<{
  totalPending: number;
  highConfidence: number;
  readyToConfirm: number;
}> {
  try {
    // Get total pending
    let pendingQuery = supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('general_status', 'uncategorized');

    if (categoryId) {
      pendingQuery = pendingQuery.eq('category_id', categoryId);
    }

    const { count: totalPending } = await pendingQuery;

    // Get high confidence answers
    let highConfQuery = supabase
      .from('answers')
      .select('id, ai_result')
      .eq('general_status', 'uncategorized')
      .not('ai_result', 'is', null);

    if (categoryId) {
      highConfQuery = highConfQuery.eq('category_id', categoryId);
    }

    const { data: aiAnswers } = await highConfQuery;

    let highConfidence = 0;
    let readyToConfirm = 0;

    if (aiAnswers) {
      for (const answer of aiAnswers) {
        try {
          const aiResult: AIResult = JSON.parse(answer.ai_result || '{}');
          const topPrediction = aiResult.items?.[0];

          if (topPrediction && topPrediction.probability >= 0.80) {
            highConfidence++;

            if (topPrediction.probability >= 0.90) {
              readyToConfirm++;
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    return {
      totalPending: totalPending || 0,
      highConfidence,
      readyToConfirm,
    };
  } catch (err) {
    console.error('❌ [AutoConfirm] Error getting stats:', err);
    return {
      totalPending: 0,
      highConfidence: 0,
      readyToConfirm: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🧪 TEST AUTO-CONFIRM (DRY RUN)
// ═══════════════════════════════════════════════════════════════

export async function testAutoConfirm(
  categoryId?: number
): Promise<AutoConfirmResult> {
  return autoConfirm({
    minProbability: 0.90,
    maxBatchSize: 10,
    dryRun: true,
    categoryId,
    logToDatabase: false,
  });
}

// ═══════════════════════════════════════════════════════════════
// 🔄 RUN AUTO-CONFIRM (PRODUCTION)
// ═══════════════════════════════════════════════════════════════

export async function runAutoConfirm(
  categoryId?: number,
  minProbability: number = 0.90
): Promise<AutoConfirmResult> {
  return autoConfirm({
    minProbability,
    maxBatchSize: 100,
    dryRun: false,
    categoryId,
    logToDatabase: true,
  });
}

// ═══════════════════════════════════════════════════════════════
// 📊 GET AUDIT LOG
// ═══════════════════════════════════════════════════════════════

export async function getAuditLog(
  limit: number = 100,
  categoryId?: number
) {
  try {
    let query = supabase
      .from('ai_audit_log')
      .select('*')
      .order('confirmed_at', { ascending: false })
      .limit(limit);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [AutoConfirm] Error fetching audit log:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('❌ [AutoConfirm] Error in getAuditLog:', err);
    return [];
  }
}
