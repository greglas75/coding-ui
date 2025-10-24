import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { simpleLogger } from '../utils/logger';

interface CodingPageHeaderProps {
  currentCategoryId?: number;
}

export function CodingPageHeader({ currentCategoryId }: CodingPageHeaderProps) {
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    async function fetchCategory() {
      if (!currentCategoryId) {
        setCategoryName('');
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('id', currentCategoryId)
        .single();

      if (error) {
        simpleLogger.error('❌ Error fetching category name:', error);
        setCategoryName('');
      } else {
        setCategoryName(data?.name || '');
      }
    }
    fetchCategory();
  }, [currentCategoryId]);

  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        {categoryName ? `Category: ${categoryName}` : 'Select a category to start coding'}
      </h2>
    </div>
  );
}
