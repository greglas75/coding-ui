/**
 * 💰 useAIPricing Hook
 *
 * React Query hook for fetching and managing AI model pricing data
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ModelPricing, PricingResponse } from '../types/pricing';

interface UseAIPricingOptions {
  enabled?: boolean;
  refetchInterval?: number; // milliseconds
}

export function useAIPricing(options: UseAIPricingOptions = {}) {
  const { enabled = true, refetchInterval = 1000 * 60 * 60 } = options; // Default: 1 hour
  const queryClient = useQueryClient();

  const query = useQuery<PricingResponse>({
    queryKey: ['ai-pricing'],
    queryFn: async () => {
      console.log('🔄 Fetching AI pricing data...');

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3020';
      const response = await fetch(`${API_URL}/api/ai-pricing`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ AI pricing data loaded:', data.dataSource);

      return data;
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchInterval, // Auto-refetch co godzinę
    refetchOnWindowFocus: false,
    retry: 3,
  });

  /**
   * Force refresh pricing data
   */
  const refresh = async () => {
    console.log('🔄 Manually refreshing pricing data...');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3020';
      const response = await fetch(`${API_URL}/api/ai-pricing/refresh`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh pricing');
      }

      // Invalidate cache and refetch
      await queryClient.invalidateQueries({ queryKey: ['ai-pricing'] });

      return true;
    } catch (error) {
      console.error('❌ Error refreshing pricing:', error);
      return false;
    }
  };

  /**
   * Get pricing for a specific provider
   */
  const getPricingForProvider = (provider: 'openai' | 'anthropic' | 'google'): ModelPricing[] => {
    if (!query.data) return [];
    return query.data.models[provider] || [];
  };

  /**
   * Get pricing for a specific model by ID
   */
  const getPricingForModel = (modelId: string): ModelPricing | null => {
    if (!query.data) return null;

    const allModels = [
      ...query.data.models.openai,
      ...query.data.models.anthropic,
      ...query.data.models.google,
    ];

    return allModels.find(m => m.id === modelId) || null;
  };

  /**
   * Get all models sorted by cost (cheapest first)
   */
  const getModelsByCost = (): ModelPricing[] => {
    if (!query.data) return [];

    const allModels = [
      ...query.data.models.openai,
      ...query.data.models.anthropic,
      ...query.data.models.google,
    ];

    return allModels.sort((a, b) => a.costPer1000Responses - b.costPer1000Responses);
  };

  /**
   * Get cheapest model from each provider
   */
  const getCheapestByProvider = () => {
    if (!query.data) return null;

    return {
      openai: query.data.models.openai.reduce((min, model) =>
        model.costPer1000Responses < min.costPer1000Responses ? model : min
      ),
      anthropic: query.data.models.anthropic.reduce((min, model) =>
        model.costPer1000Responses < min.costPer1000Responses ? model : min
      ),
      google: query.data.models.google.reduce((min, model) =>
        model.costPer1000Responses < min.costPer1000Responses ? model : min
      ),
    };
  };

  return {
    // Data
    pricing: query.data,
    models: query.data?.models,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,

    // Metadata
    lastUpdated: query.data?.lastUpdated,
    dataSource: query.data?.dataSource,
    cacheExpiry: query.data?.cacheExpiry,
    nextUpdate: query.data?.nextUpdate,

    // Actions
    refresh,

    // Helper functions
    getPricingForProvider,
    getPricingForModel,
    getModelsByCost,
    getCheapestByProvider,
  };
}

