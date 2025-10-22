/**
 * Hook for managing codeframe generation
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { CodeframeConfig, GenerationResponse } from '@/types/codeframe';
import { getAnthropicAPIKey } from '@/utils/apiKeys';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020';

export function useCodeframeGeneration() {
  const [generation, setGeneration] = useState<GenerationResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (config: CodeframeConfig) => {
      // Get API key from Settings page (localStorage)
      const anthropicKey = getAnthropicAPIKey();

      const response = await axios.post<GenerationResponse>(
        `${API_BASE}/api/v1/codeframe/generate`,
        {
          ...config,
          anthropic_api_key: anthropicKey, // Add API key from Settings
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setGeneration(data);
    },
  });

  return {
    generation,
    isGenerating: mutation.isPending,
    generate: mutation.mutateAsync,
    error: mutation.error,
    reset: () => {
      setGeneration(null);
      mutation.reset();
    },
  };
}
