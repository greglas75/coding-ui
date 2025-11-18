/**
 * Hook for category actions (add, delete, edit)
 */

import { toast } from 'sonner';
import { optimisticArrayUpdate } from '../../../lib/optimisticUpdate';
import { supabase } from '../../../lib/supabase';
import { simpleLogger } from '../../../utils/logger';
import type { CategoryWithStats } from '../types';

interface UseCategoryActionsProps {
  categories: CategoryWithStats[];
  setCategories: (categories: CategoryWithStats[]) => void;
}

export function useCategoryActions({ categories, setCategories }: UseCategoryActionsProps) {
  // Add new category (with optimistic updates!)
  async function addCategory(name: string, onSuccess?: () => void) {
    // Generate temporary ID
    const tempId = -Date.now();
    const tempCategory: CategoryWithStats = {
      id: tempId,
      name,
      created_at: new Date().toISOString(),
      whitelisted: 0,
      blacklisted: 0,
      gibberish: 0,
      categorized: 0,
      notCategorized: 0,
      global_blacklist: 0,
      allAnswers: 0,
    };

    try {
      await optimisticArrayUpdate(
        categories,
        setCategories,
        'add',
        tempCategory,
        async () => {
          const { data, error } = await supabase
            .from('categories')
            .insert({ name })
            .select()
            .single();

          if (error) throw error;

          // Replace temp category with real one from server
          setCategories(cats =>
            cats.map(cat =>
              cat.id === tempId
                ? {
                    ...data,
                    whitelisted: 0,
                    blacklisted: 0,
                    gibberish: 0,
                    categorized: 0,
                    notCategorized: 0,
                    global_blacklist: 0,
                    allAnswers: 0,
                  }
                : cat
            )
          );
        },
        {
          successMessage: `Category "${name}" added`,
          errorMessage: 'Failed to add category',
        }
      );

      onSuccess?.();
    } catch (error) {
      simpleLogger.error('Error adding category:', error);
    }
  }

  // Confirm delete category (with optimistic updates!)
  async function deleteCategory(
    categoryId: number,
    categoryName: string,
    onSuccess?: () => void
  ) {
    try {
      const categoryToRemove = categories.find(c => c.id === categoryId);
      if (!categoryToRemove) return;

      // Proceed with optimistic delete
      await optimisticArrayUpdate(
        categories,
        setCategories,
        'remove',
        categoryToRemove,
        async () => {
          const { error } = await supabase.from('categories').delete().eq('id', categoryId);

          if (error) throw error;
        },
        {
          successMessage: `Category "${categoryName}" deleted`,
          errorMessage: 'Failed to delete category',
        }
      );

      onSuccess?.();
    } catch (error) {
      simpleLogger.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  }

  return {
    addCategory,
    deleteCategory,
  };
}

