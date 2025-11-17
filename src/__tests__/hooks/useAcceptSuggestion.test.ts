/**
 * 🧪 Tests for useAcceptSuggestion Hook
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useAcceptSuggestion } from '../../hooks/useAcceptSuggestion';

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useAcceptSuggestion', () => {
  it('should accept suggestion successfully', async () => {
    const { result } = renderHook(() => useAcceptSuggestion(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      result.current.mutate({
        answerId: 1,
        codeId: '1',
        codeName: 'Nike',
        confidence: 0.95,
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should handle error gracefully', async () => {
    const { result } = renderHook(() => useAcceptSuggestion(), {
      wrapper: createWrapper(),
    });

    // Force error by using invalid ID
    await waitFor(() => {
      result.current.mutate({
        answerId: -1,
        codeId: 'invalid',
        codeName: 'Invalid',
        confidence: 0.5,
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

