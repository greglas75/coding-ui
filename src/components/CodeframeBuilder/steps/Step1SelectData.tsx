/**
 * Step 1: Select Category and Answers
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CodeframeConfig, CategoryInfo } from '@/types/codeframe';

interface Step1SelectDataProps {
  config: CodeframeConfig;
  onChange: (config: CodeframeConfig) => void;
  onNext: () => void;
  onCancel: () => void;
}

export function Step1SelectData({
  config,
  onChange,
  onNext,
  onCancel,
}: Step1SelectDataProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    config.category_id
  );

  // Fetch categories with answer counts
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories-for-codeframe'],
    queryFn: async () => {
      const { data: cats, error } = await supabase
        .from('categories')
        .select('id, name, description')
        .order('name');

      if (error) throw error;

      // Get answer counts for each category
      const categoriesWithCounts = await Promise.all(
        cats.map(async (cat) => {
          const { count: totalCount } = await supabase
            .from('answers')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id)
            .not('answer_text', 'is', null);

          const { count: uncategorizedCount } = await supabase
            .from('answers')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id)
            .is('selected_code', null)
            .not('answer_text', 'is', null);

          return {
            id: cat.id,
            name: cat.name,
            description: cat.description || '',
            total_answers: totalCount || 0,
            uncategorized_count: uncategorizedCount || 0,
          } as CategoryInfo;
        })
      );

      return categoriesWithCounts.filter((c) => c.uncategorized_count >= 10);
    },
  });

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);

  const handleSelectCategory = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    onChange({
      ...config,
      category_id: categoryId,
      answer_ids: [], // Will use all uncategorized by default
    });
  };

  const canProceed = selectedCategory && selectedCategory.uncategorized_count >= 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Select Data for Codebook
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Choose a category with at least 10 uncategorized answers to generate a codebook.
        </p>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Category
        </label>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="space-y-3">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleSelectCategory(category.id)}
                data-testid="category-card"
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedCategoryId === category.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-gray-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                    </div>

                    {category.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {category.description}
                      </p>
                    )}

                    <div className="mt-2 flex gap-4 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Total: <span className="font-medium">{category.total_answers}</span>
                      </span>
                      <span
                        className={
                          category.uncategorized_count >= 10
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        Uncategorized:{' '}
                        <span className="font-medium">{category.uncategorized_count}</span>
                      </span>
                    </div>
                  </div>

                  {selectedCategoryId === category.id && (
                    <div className="ml-4 flex-shrink-0">
                      <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No categories with enough uncategorized answers found.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              At least 10 uncategorized answers are required.
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedCategory && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
            Selected for Generation
          </h4>
          <div className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
            <p>
              Category: <span className="font-medium">{selectedCategory.name}</span>
            </p>
            <p>
              Answers to process:{' '}
              <span className="font-medium">{selectedCategory.uncategorized_count}</span> (all
              uncategorized)
            </p>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-between pt-6 border-t dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            canProceed
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Next: Configure →
        </button>
      </div>
    </div>
  );
}
