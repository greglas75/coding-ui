import { supabase } from './supabase';
import { simpleLogger } from '../utils/logger';

export async function recountMentions(codeName: string): Promise<number> {
  const { count, error } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .ilike('answer_text', `%${codeName}%`);

  if (error) {
    simpleLogger.error('Error recounting mentions:', error);
    return 0;
  }

  return count || 0;
}
