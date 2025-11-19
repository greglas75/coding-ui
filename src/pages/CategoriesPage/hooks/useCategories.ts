/**
 * Hook for fetching categories with statistics
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { simpleLogger } from '../../../utils/logger';
import type { CategoryWithStats } from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchCategories() {
    try {
      simpleLogger.info('Fetching categories with statistics...');
      setLoading(true);

      // Get categories (including new multi-provider model columns)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select(
          'id, name, google_name, description, template, preset, model, openai_model, claude_model, gemini_model, vision_model, llm_preset, gpt_template, brands_sorting, min_length, max_length, use_web_context, sentiment_enabled, sentiment_mode'
        )
        .order('name');

      if (categoriesError) {
        simpleLogger.error('Error fetching categories:', categoriesError);
        setError(`Failed to fetch categories: ${categoriesError.message}`);
        setLoading(false);
        return;
      }

      if (!categoriesData) {
        setCategories([]);
        setLoading(false);
        return;
      }

      // Get statistics for all categories via RPC (single query, no N+1)
      const { data: statsData, error: statsError } = await supabase.rpc('get_category_stats');

      if (statsError) {
        simpleLogger.error('Error fetching category stats via RPC:', statsError);
      }

      interface CategoryStats {
        category_id: number;
        whitelisted?: number;
        blacklisted?: number;
        gibberish?: number;
        categorized?: number;
        not_categorized?: number;
        global_blacklist?: number;
      }

      const statsMap = new Map<number, CategoryStats>((statsData || []).map((s: CategoryStats) => [s.category_id, s]));

      const categoriesWithStats: CategoryWithStats[] = (categoriesData || []).map(cat => {
        const s = statsMap.get(cat.id) || {};
        const allAnswers =
          Number(s.whitelisted || 0) +
          Number(s.blacklisted || 0) +
          Number(s.gibberish || 0) +
          Number(s.categorized || 0) +
          Number(s.not_categorized || 0) +
          Number(s.global_blacklist || 0);
        return {
          ...cat,
          whitelisted: Number(s.whitelisted || 0),
          blacklisted: Number(s.blacklisted || 0),
          gibberish: Number(s.gibberish || 0),
          categorized: Number(s.categorized || 0),
          notCategorized: Number(s.not_categorized || 0),
          global_blacklist: Number(s.global_blacklist || 0),
          allAnswers: allAnswers,
        };
      });

      setCategories(categoriesWithStats);
      setLoading(false);
    } catch (error) {
      simpleLogger.error('Error in fetchCategories:', error);
      setError('Failed to fetch categories');
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // First, test if categories table exists
      simpleLogger.info('Testing categories table...');
      const { data: testData, error: testError } = await supabase
        .from('categories')
        .select('count')
        .limit(1);

      simpleLogger.info('Table test result:', { testData, testError });

      if (testError) {
        simpleLogger.error('Categories table test failed:', testError);
        setError(`Categories table not found. Please run the SQL migration: ${testError.message}`);
        setLoading(false);
        return;
      }

      await fetchCategories();
      setLoading(false);
    }
    loadData();
  }, []);

  return {
    categories,
    setCategories,
    loading,
    error,
    refetch: fetchCategories,
  };
}

