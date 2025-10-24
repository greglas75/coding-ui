import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabase';
import { simpleLogger } from '../../../utils/logger';

const supabase = getSupabaseClient();

export function useCodeManagement(currentCategoryId?: number) {
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [cachedCodes, setCachedCodes] = useState<Array<{ id: number; name: string }>>([]);
  const [codesPage, setCodesPage] = useState(0);
  const [hasMoreCodes, setHasMoreCodes] = useState(true);
  const isFetchingCodes = useRef(false);

  // Load codes on category change
  useEffect(() => {
    if (!currentCategoryId) {
      setCachedCodes([]);
      setCodesPage(0);
      setHasMoreCodes(true);
      return;
    }

    if (isFetchingCodes.current) {
      simpleLogger.info('⏸️  Already fetching codes, skipping');
      return;
    }

    const cacheKey = `codes_${currentCategoryId}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const parsedCodes = JSON.parse(cached);
        setCachedCodes(parsedCodes);
        simpleLogger.info(`✅ Loaded ${parsedCodes.length} codes from cache`);
        setHasMoreCodes(false);
        return;
      } catch (error) {
        simpleLogger.error('❌ Error parsing cached codes:', error);
        localStorage.removeItem(cacheKey);
      }
    }

    loadCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategoryId]);

  const loadCodes = async () => {
    if (!currentCategoryId) return;

    isFetchingCodes.current = true;
    setLoadingCodes(true);
    const PAGE_SIZE = 1000;

    try {
      const { data, error } = await supabase
        .from('codes_categories')
        .select(`codes ( id, name )`)
        .eq('category_id', currentCategoryId)
        .range(0, PAGE_SIZE - 1);

      if (!error && data) {
        const codes = data
          .map((item: any) => item.codes)
          .filter(Boolean)
          .flat() as Array<{ id: number; name: string }>;

        const sortedCodes = codes.sort((a, b) => a.name.localeCompare(b.name));

        setCachedCodes(sortedCodes);
        setHasMoreCodes(data.length === PAGE_SIZE);

        if (data.length < PAGE_SIZE) {
          localStorage.setItem(`codes_${currentCategoryId}`, JSON.stringify(sortedCodes));
        }
      }
    } catch (error) {
      simpleLogger.error('❌ Error loading codes:', error);
    } finally {
      setLoadingCodes(false);
      isFetchingCodes.current = false;
    }
  };

  const handleReloadCodes = async () => {
    if (!currentCategoryId || isFetchingCodes.current) return;

    localStorage.removeItem(`codes_${currentCategoryId}`);
    setCachedCodes([]);
    setCodesPage(0);
    setHasMoreCodes(true);

    await loadCodes();
  };

  const loadMoreCodes = async () => {
    if (!currentCategoryId || loadingCodes || !hasMoreCodes) return;

    setLoadingCodes(true);
    const PAGE_SIZE = 1000;
    const nextPage = codesPage + 1;

    try {
      const { data, error } = await supabase
        .from('codes_categories')
        .select(`codes ( id, name )`)
        .eq('category_id', currentCategoryId)
        .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1);

      if (!error && data) {
        const codes = data
          .map((item: any) => item.codes)
          .filter(Boolean)
          .flat() as Array<{ id: number; name: string }>;

        const sortedCodes = codes.sort((a, b) => a.name.localeCompare(b.name));

        setCachedCodes(prev => {
          const combined = [...prev, ...sortedCodes];
          return combined.sort((a, b) => a.name.localeCompare(b.name));
        });

        setCodesPage(nextPage);
        setHasMoreCodes(data.length === PAGE_SIZE);
      }
    } catch (error) {
      simpleLogger.error('Error loading more codes:', error);
    } finally {
      setLoadingCodes(false);
    }
  };

  return {
    loadingCodes,
    cachedCodes,
    hasMoreCodes,
    handleReloadCodes,
    loadMoreCodes,
  };
}
