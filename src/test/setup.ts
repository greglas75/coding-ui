// ═══════════════════════════════════════════════════════════════
// 🧪 Test Setup - Vitest + React Testing Library configuration
// ═══════════════════════════════════════════════════════════════

import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from '@/test/mocks/server';
import { bootstrapTestEnvironment } from '@/test/utils/bootstrap';

const env = import.meta.env as Record<string, string | undefined>;
const processEnv = (typeof process !== 'undefined'
  ? (process.env as Record<string, string | undefined>)
  : {}) as Record<string, string | undefined>;

const ensureEnvKey = (key: string, fallback: string) => {
  if (!env[key] || env[key]?.trim() === '') {
    env[key] = fallback;
  }
  if (!processEnv[key] || processEnv[key]?.trim() === '') {
    processEnv[key] = fallback;
  }
};

ensureEnvKey('VITE_OPENAI_API_KEY', 'test-openai-key');
ensureEnvKey('VITE_ANTHROPIC_API_KEY', 'test-anthropic-key');
ensureEnvKey('VITE_GOOGLE_GEMINI_API_KEY', 'test-gemini-key');
ensureEnvKey('VITE_GOOGLE_CSE_API_KEY', 'test-google-cse-key');
ensureEnvKey('VITE_GOOGLE_CSE_CX_ID', 'test-google-cx-id');
ensureEnvKey('VITE_PINECONE_API_KEY', 'test-pinecone-key');

// Setup MSW server
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  console.log('🔧 MSW Server started');
  bootstrapTestEnvironment();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  console.log('🔧 MSW Server closed');
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

