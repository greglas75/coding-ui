/**
 * CRUD operation utilities
 */

import { supabase } from '../supabaseClient';
import { simpleLogger } from '../../utils/logger';

/**
 * Fast count without fetching data
 *
 * @param table - Table name
 * @param filters - Optional filters
 * @returns Count
 */
export async function fastCount(table: string, filters?: Record<string, any>): Promise<number> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value);
      }
    });
  }

  const { count, error } = await query;

  if (error) {
    simpleLogger.error('❌ [Supabase] Count failed:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Update single row with optional return
 *
 * @param table - Table name
 * @param id - Row ID
 * @param updates - Updates to apply
 * @param options - Optional settings (returnUpdated, skipTimestamp)
 * @returns Success status and optionally updated data
 */
export async function updateSingleRow<T extends Record<string, any>>(
  table: string,
  id: number,
  updates: Partial<T>,
  options?: {
    returnUpdated?: boolean;
    skipTimestamp?: boolean;
  }
) {
  const updatePayload = {
    ...updates,
    ...(options?.skipTimestamp ? {} : { updated_at: new Date().toISOString() }),
  };

  if (options?.returnUpdated) {
    const { data, error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      simpleLogger.error(`❌ [Supabase] Update failed for ${table}:${id}:`, error);
      return { success: false, error };
    }

    simpleLogger.info(`✅ [Supabase] Updated ${table}:${id}`);
    return { success: true, data };
  } else {
    const { error } = await supabase.from(table).update(updatePayload).eq('id', id);

    if (error) {
      simpleLogger.error(`❌ [Supabase] Update failed for ${table}:${id}:`, error);
      return { success: false, error };
    }

    simpleLogger.info(`✅ [Supabase] Updated ${table}:${id}`);
    return { success: true };
  }
}

/**
 * Upsert row (insert or update)
 *
 * @param table - Table name
 * @param data - Row data
 * @param uniqueColumn - Unique column for conflict resolution (default: 'id')
 * @returns Success status and data
 */
export async function upsertRow<T extends Record<string, any>>(
  table: string,
  data: T,
  uniqueColumn: string = 'id'
) {
  const { data: result, error } = await supabase
    .from(table)
    .upsert(data, {
      onConflict: uniqueColumn,
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    simpleLogger.error(`❌ [Supabase] Upsert failed for ${table}:`, error);
    return { success: false, error };
  }

  simpleLogger.info(`✅ [Supabase] Upserted ${table}`);
  return { success: true, data: result };
}

