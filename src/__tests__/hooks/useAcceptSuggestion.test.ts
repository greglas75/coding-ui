/**
 * 🧪 Tests for useAcceptSuggestion Hook
 */

import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAcceptSuggestion } from '../../hooks/useAcceptSuggestion';

function createSupabaseMock() {
  const mock: any = {};
  mock.from = vi.fn(() => mock);
  mock.select = vi.fn(() => mock);
  mock.__lastAction = null;
  mock.eq = vi.fn(() => {
    if (mock.__lastAction === 'update') {
      mock.__lastAction = null;
      return Promise.resolve({ data: null, error: null });
    }
    return mock;
  });
  mock.neq = vi.fn(() => mock);
  mock.single = vi.fn(async () => ({ data: { selected_code: null }, error: null }));
  mock.update = vi.fn(() => {
    mock.__lastAction = 'update';
    return mock;
  });
  mock.in = vi.fn(async () => ({ error: null }));
  mock.is = vi.fn(async () => ({ data: [], error: null }));
  return mock;
}

var supabaseInstance: ReturnType<typeof createSupabaseMock> | undefined;
let supabase: ReturnType<typeof createSupabaseMock>;

function getSupabaseMock() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseMock();
  }
  return supabaseInstance;
}

function resetSupabaseMock() {
  const mock = getSupabaseMock();
  mock.from.mockReset();
  mock.from.mockImplementation(() => mock);
  mock.select.mockReset();
  mock.select.mockImplementation(() => mock);
  mock.__lastAction = null;
  mock.eq.mockReset();
  mock.eq.mockImplementation(() => {
    if (mock.__lastAction === 'update') {
      mock.__lastAction = null;
      return Promise.resolve({ data: null, error: null });
    }
    return mock;
  });
  mock.neq.mockReset();
  mock.neq.mockImplementation(() => mock);
  mock.single.mockReset();
  mock.single.mockImplementation(async () => ({ data: { selected_code: null }, error: null }));
  mock.update.mockReset();
  mock.update.mockImplementation(() => {
    mock.__lastAction = 'update';
    return mock;
  });
  mock.in.mockReset();
  mock.in.mockImplementation(async () => ({ error: null }));
  mock.is.mockReset();
  mock.is.mockImplementation(async () => ({ data: [], error: null }));
}

vi.mock('../../lib/supabase', () => ({
  supabase: getSupabaseMock(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient, children });
}

describe('useAcceptSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseMock();
    supabase = getSupabaseMock();
  });

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

    supabase.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Not found'),
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

