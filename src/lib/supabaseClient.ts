/**
 * Supabase Client Singleton
 * 
 * Centralized client creation with singleton pattern.
 * Import this when you need the raw Supabase client.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

// Singleton pattern to prevent multiple GoTrueClient instances
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client instance.
 * This ensures only one client is created, preventing multiple GoTrueClient warnings.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        headers: { 'x-application-name': 'CodingApp' }
      }
    });

    // Debug guard in development
    if (import.meta.env.DEV) {
      console.info('✅ Supabase client initialized once (singleton)');
    }
  }

  return supabaseInstance;
}

// Export the singleton instance for backward compatibility
export const supabase = getSupabaseClient();

