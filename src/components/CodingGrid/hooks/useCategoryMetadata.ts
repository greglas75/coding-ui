/**
 * useCategoryMetadata Hook
 *
 * Manages category metadata:
 * - Category name
 * - Filter options (statuses, languages, countries, etc.)
 * - Document title updates
 */

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabase';
import { simpleLogger } from '../../../utils/logger';

const supabase = getSupabaseClient();

interface FilterOptions {
  types: string[];
  statuses: string[];
  languages: string[];
  countries: string[];
  brands: string[];
}

interface UseCategoryMetadataOptions {
  categoryId: number | undefined;
}

interface UseCategoryMetadataReturn {
  categoryName: string;
  filterOptions: FilterOptions;
}

export function useCategoryMetadata({
  categoryId,
}: UseCategoryMetadataOptions): UseCategoryMetadataReturn {
  // Category name
  const [categoryName, setCategoryName] = useState('');

  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    types: [],
    statuses: [],
    languages: [],
    countries: [],
    brands: [],
  });

  // Fetch category name and update document title
  useEffect(() => {
    if (!categoryId) {
      setCategoryName('');
      document.title = 'Coding & AI Categorization Dashboard';
      return;
    }

    const fetchCategoryName = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();

        if (error) {
          simpleLogger.error('Error fetching category name:', error);
          return;
        }

        if (data) {
          setCategoryName(data.name);
          document.title = `${data.name} - Coding`;
          simpleLogger.info('✅ Loaded category:', data.name);
        }
      } catch (error) {
        simpleLogger.error('Error fetching category name:', error);
      }
    };

    fetchCategoryName();
  }, [categoryId]);

  // Fetch filter options for the category
  useEffect(() => {
    if (!categoryId) {
      setFilterOptions({
        types: [],
        statuses: [],
        languages: [],
        countries: [],
        brands: [],
      });
      return;
    }

    const fetchFilterOptions = async () => {
      try {
        const { data, error } = await supabase.rpc('get_filter_options', {
          p_category_id: categoryId,
        });

        if (error) {
          simpleLogger.error('Error fetching filter options:', error);
          return;
        }

        if (data && data.length > 0) {
          const row = data[0] as any;

          // Hardcoded fallback statuses if none returned from DB
          const hardcodedStatuses = [
            'uncategorized',
            'whitelist',
            'blacklist',
            'categorized',
            'global_blacklist',
            'ignored',
            'other',
          ];

          setFilterOptions({
            types: (row.types || []).filter(Boolean),
            statuses: row.statuses ? (row.statuses || []).filter(Boolean) : hardcodedStatuses,
            languages: (row.languages || []).filter(Boolean),
            countries: (row.countries || []).filter(Boolean),
            brands: [],
          });

          simpleLogger.info('✅ Loaded filter options');
        }
      } catch (error) {
        simpleLogger.error('Error fetching filter options:', error);
      }
    };

    fetchFilterOptions();
  }, [categoryId]);

  return {
    categoryName,
    filterOptions,
  };
}
