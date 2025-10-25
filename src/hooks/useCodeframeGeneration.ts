/**
 * Hook for managing codeframe generation
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { CodeframeConfig, GenerationResponse } from '@/types/codeframe';
import { getAnthropicAPIKey, getGoogleCSEAPIKey, getGoogleCSECXID, getPineconeAPIKey } from '@/utils/apiKeys';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020';

export function useCodeframeGeneration() {
  const [generation, setGeneration] = useState<GenerationResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (config: CodeframeConfig) => {
      // Get API keys from Settings page (localStorage)
      const anthropicKey = getAnthropicAPIKey();
      const googleApiKey = getGoogleCSEAPIKey();
      const googleCxId = getGoogleCSECXID();
      const pineconeKey = getPineconeAPIKey();

      console.log('🚀 Starting codeframe generation...');
      console.log('📋 Config:', { ...config, answer_ids: `${config.answer_ids?.length || 0} answers` });
      console.log('🔑 API Keys:', {
        anthropic: !!anthropicKey,
        google: !!googleApiKey,
        google_cx: !!googleCxId,
        pinecone: !!pineconeKey,
        pinecone_length: pineconeKey?.length || 0
      });

      const response = await axios.post<GenerationResponse>(
        `${API_BASE}/api/v1/codeframe/generate`,
        {
          ...config,
          anthropic_api_key: anthropicKey,
          google_api_key: googleApiKey,
          google_cse_cx_id: googleCxId,
          pinecone_api_key: pineconeKey,
        }
      );

      console.log('✅ Generation started:', response.data);
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
