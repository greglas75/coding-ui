import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

interface Category {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface CategoryWithStats extends Category {
  codes_count: number;
  whitelisted: number;
  blacklisted: number;
  gibberish: number;
  categorized: number;
  notCategorized: number;
  allAnswers: number;
}

export function useCategoriesData() {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      console.log('Fetching categories with statistics...');
      setLoading(true);
      setError(null);

      // Get categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, created_at, updated_at')
        .order('name');

      if (categoriesError) {
        throw categoriesError;
      }

      if (!categoriesData) {
        setCategories([]);
        setLoading(false);
        return;
      }

      // Get codes count for each category
      const { data: countsData, error: countsError } = await supabase
        .from('codes_categories')
        .select('category_id')
        .order('category_id');

      if (countsError) {
        throw countsError;
      }

      // Count codes per category
      const countsMap = new Map<number, number>();
      countsData?.forEach(item => {
        const current = countsMap.get(item.category_id) || 0;
        countsMap.set(item.category_id, current + 1);
      });

      // Get statistics for all categories via RPC
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_category_stats');

      if (statsError) {
        console.error('Error fetching category stats via RPC:', statsError);
      }

      const statsMap = new Map<number, any>(
        (statsData || []).map((s: any) => [s.category_id, s])
      );

      const categoriesWithStats: CategoryWithStats[] = (categoriesData || []).map((cat) => {
        const s = statsMap.get(cat.id) || {};
        const allAnswers =
          Number(s.whitelisted || 0) +
          Number(s.blacklisted || 0) +
          Number(s.gibberish || 0) +
          Number(s.categorized || 0) +
          Number(s.not_categorized || 0);
        return {
          ...cat,
          codes_count: countsMap.get(cat.id) || 0,
          whitelisted: Number(s.whitelisted || 0),
          blacklisted: Number(s.blacklisted || 0),
          gibberish: Number(s.gibberish || 0),
          categorized: Number(s.categorized || 0),
          notCategorized: Number(s.not_categorized || 0),
          allAnswers: allAnswers
        };
      });

      setCategories(categoriesWithStats);
    } catch (err: any) {
      console.error('Error in fetchCategories:', err);
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(async (name: string) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
      return;
    }

    const categoryWithStats: CategoryWithStats = {
      ...data,
      codes_count: 0,
      whitelisted: 0,
      blacklisted: 0,
      gibberish: 0,
      categorized: 0,
      notCategorized: 0,
      allAnswers: 0
    };

    setCategories(prev => [...prev, categoryWithStats]);
    toast.success('Category added successfully');
  }, []);

  const updateCategory = useCallback(async (id: number, name: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setCategories(prev =>
        prev.map(cat => (cat.id === id ? { ...cat, name } : cat))
      );
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  }, []);

  const deleteCategory = useCallback(async (categoryId: number) => {
    try {
      // Check if category has associated codes
      const { count: codesCount } = await supabase
        .from('codes')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (codesCount && codesCount > 0) {
        toast.error(
          `Cannot delete category with ${codesCount} codes. Please remove associated codes first.`
        );
        return;
      }

      // Delete category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast.success('Category deleted successfully');
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory
  };
}
