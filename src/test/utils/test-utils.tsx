// ═══════════════════════════════════════════════════════════════
// 🧪 Test Utilities - Helpers for React Testing Library
// ═══════════════════════════════════════════════════════════════

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

// ───────────────────────────────────────────────────────────────
// Custom Render with Providers
// ───────────────────────────────────────────────────────────────

interface AllTheProvidersProps {
  children: ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retry in tests
        gcTime: 0, // Disable cache in tests
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from RTL
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// ───────────────────────────────────────────────────────────────
// Mock Functions
// ───────────────────────────────────────────────────────────────

export const mockSupabaseClient = {
  from: (_table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      order: () => Promise.resolve({ data: [], error: null }),
      limit: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
      in: () => Promise.resolve({ data: null, error: null }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
      in: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
  rpc: () => Promise.resolve({ data: null, error: null }),
};

// ───────────────────────────────────────────────────────────────
// Mock Data Generators
// ───────────────────────────────────────────────────────────────

export function createMockCategory(overrides = {}): Category {
  return {
    id: 1,
    name: 'Test Category',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockCode(overrides = {}): Code {
  return {
    id: 1,
    name: 'Test Code',
    is_whitelisted: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  };
}

// Helper type that doesn't allow undefined, only the original type or omit the property
type AnswerOverrides = {
  [K in keyof Answer]?: Answer[K];
};

export function createMockAnswer(overrides: AnswerOverrides = {}): Answer {
  const base: Answer = {
    id: 1,
    answer_text: 'Test answer',
    translation: null,
    translation_en: 'Test answer',
    language: 'en',
    country: 'USA',
    quick_status: null,
    general_status: 'uncategorized',
    selected_code: null,
    ai_suggested_code: null,
    ai_suggestions: null,
    category_id: 1,
    coding_date: null,
    confirmed_by: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: null,
  };

  // Merge overrides, but only if they are defined (not undefined)
  return Object.keys(base).reduce((acc, key) => {
    const k = key as keyof Answer;
    acc[k] = (overrides[k] !== undefined ? overrides[k] : base[k]) as any;
    return acc;
  }, {} as Answer);
}

// ───────────────────────────────────────────────────────────────
// Wait Utilities
// ───────────────────────────────────────────────────────────────

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ───────────────────────────────────────────────────────────────
// Type Imports for convenience
// ───────────────────────────────────────────────────────────────

import type { Answer } from '../../schemas/answerSchema';
import type { Category } from '../../schemas/categorySchema';
import type { Code } from '../../schemas/codeSchema';

