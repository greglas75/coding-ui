/**
 * Optimistic update utilities
 */

import { supabase } from '../supabaseClient';
import { simpleLogger } from '../../utils/logger';

/**
 * Optimistic update - update UI immediately, then sync with database
 *
 * @param table - Table name
 * @param id - Row ID
 * @param updates - Updates to apply
 * @param localState - Current local state
 * @param setLocalState - State setter function
 * @returns Success status (rolls back on error)
 */
export async function optimisticUpdate<T extends { id: number }>(
  table: string,
  id: number,
  updates: Partial<T>,
  localState: T[],
  setLocalState: (state: T[]) => void
) {
  // 1. Update UI immediately (optimistic)
  setLocalState(localState.map(item => (item.id === id ? { ...item, ...updates } : item)));

  // 2. Update database in background
  try {
    const { error } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    simpleLogger.info(`✅ [Supabase] Optimistic update succeeded for ${table}:${id}`);
    return { success: true };
  } catch (error) {
    simpleLogger.error(`❌ [Supabase] Optimistic update failed:`, error);

    // Revert optimistic update on error
    setLocalState(localState);

    return { success: false, error };
  }
}

