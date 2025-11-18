/**
 * Batch operation utilities
 */

import { supabase } from '../supabaseClient';
import { simpleLogger } from '../../utils/logger';

/**
 * Batch update multiple rows
 *
 * @param table - Table name
 * @param ids - Array of row IDs
 * @param updates - Updates to apply to all rows
 * @returns Success status and count
 */
export async function batchUpdate(
  table: string,
  ids: number[],
  updates: Record<string, any>
) {
  if (ids.length === 0) return { success: true, count: 0 };

  try {
    const { error, count } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) throw error;

    simpleLogger.info(`✅ [Supabase] Batch updated ${count} rows in ${table}`);
    return { success: true, count: count || 0 };
  } catch (error) {
    simpleLogger.error(`❌ [Supabase] Batch update failed:`, error);
    return { success: false, error, count: 0 };
  }
}

