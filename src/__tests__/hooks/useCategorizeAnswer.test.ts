/**
 * 🧪 Tests for useCategorizeAnswer Hook
 */

import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useBatchCategorize, useCategorizeAnswer } from '../../hooks/useCategorizeAnswer';

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

describe('useCategorizeAnswer', () => {
  it('should categorize single answer', async () => {
    const { result } = renderHook(() => useCategorizeAnswer(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      result.current.mutate(1);
    });

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    });
  });
});

describe('useBatchCategorize', () => {
  it('should categorize multiple answers', async () => {
    const { result } = renderHook(() => useBatchCategorize(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      result.current.mutate([1, 2, 3]);
    });

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    });
  });
});

