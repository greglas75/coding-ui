// ═══════════════════════════════════════════════════════════════
// 🎭 MSW Handlers - API mock handlers for testing
// ═══════════════════════════════════════════════════════════════

import { http, HttpResponse } from 'msw';
import type { Answer } from '../../schemas/answerSchema';
import type { Category } from '../../schemas/categorySchema';
import type { Code } from '../../schemas/codeSchema';

const API_BASE_URL = 'http://localhost:3001';

// ───────────────────────────────────────────────────────────────
// Mock Data
// ───────────────────────────────────────────────────────────────

const mockCategories: Category[] = [
  { id: 1, name: 'Electronics', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 2, name: 'Fashion', created_at: '2025-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z' },
  { id: 3, name: 'Food & Beverage', created_at: '2025-01-03T00:00:00Z', updated_at: '2025-01-03T00:00:00Z' },
];

const mockCodes: Code[] = [
  { id: 1, name: 'Apple', is_whitelisted: true, created_at: '2025-01-01T00:00:00Z', updated_at: null },
  { id: 2, name: 'Samsung', is_whitelisted: true, created_at: '2025-01-01T00:00:00Z', updated_at: null },
  { id: 3, name: 'Nike', is_whitelisted: false, created_at: '2025-01-02T00:00:00Z', updated_at: null },
  { id: 4, name: 'Adidas', is_whitelisted: false, created_at: '2025-01-02T00:00:00Z', updated_at: null },
];

const mockAnswers: Answer[] = [
  {
    id: 1,
    answer_text: 'I love Apple products',
    translation: null,
    translation_en: 'I love Apple products',
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
  },
  {
    id: 2,
    answer_text: 'Nike shoes are great',
    translation: null,
    translation_en: 'Nike shoes are great',
    language: 'en',
    country: 'USA',
    quick_status: 'Confirmed',
    general_status: 'whitelist',
    selected_code: 'Nike',
    ai_suggested_code: 'Nike',
    ai_suggestions: {
      suggestions: [
        {
          code_id: '3',
          code_name: 'Nike',
          confidence: 0.95,
          reasoning: 'Brand mention detected',
        }
      ],
      model: 'gpt-4o-mini',
      timestamp: '2025-01-01T12:00:00Z',
      preset_used: 'Brand Detection',
    },
    category_id: 2,
    coding_date: '2025-01-01T12:00:00Z',
    confirmed_by: 'user@example.com',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T12:00:00Z',
  },
];

// ───────────────────────────────────────────────────────────────
// Handlers
// ───────────────────────────────────────────────────────────────

export const handlers = [
  // GET /api/categories
  http.get(`${API_BASE_URL}/api/categories`, () => {
    return HttpResponse.json(mockCategories);
  }),

  // GET /api/categories/:id
  http.get(`${API_BASE_URL}/api/categories/:id`, ({ params }) => {
    const { id } = params;
    const category = mockCategories.find(c => c.id === Number(id));

    if (!category) {
      return HttpResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(category);
  }),

  // POST /api/categories
  http.post(`${API_BASE_URL}/api/categories`, async ({ request }) => {
    const body = await request.json() as { name: string };

    const newCategory: Category = {
      id: mockCategories.length + 1,
      name: body.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockCategories.push(newCategory);
    return HttpResponse.json(newCategory, { status: 201 });
  }),

  // GET /api/codes
  http.get(`${API_BASE_URL}/api/codes`, () => {
    return HttpResponse.json(mockCodes);
  }),

  // GET /api/codes/:id
  http.get(`${API_BASE_URL}/api/codes/:id`, ({ params }) => {
    const { id } = params;
    const code = mockCodes.find(c => c.id === Number(id));

    if (!code) {
      return HttpResponse.json(
        { error: 'Code not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(code);
  }),

  // POST /api/codes
  http.post(`${API_BASE_URL}/api/codes`, async ({ request }) => {
    const body = await request.json() as { name: string; is_whitelisted: boolean };

    const newCode: Code = {
      id: mockCodes.length + 1,
      name: body.name,
      is_whitelisted: body.is_whitelisted || false,
      created_at: new Date().toISOString(),
      updated_at: null,
    };

    mockCodes.push(newCode);
    return HttpResponse.json(newCode, { status: 201 });
  }),

  // POST /api/answers/filter
  http.post(`${API_BASE_URL}/api/answers/filter`, async ({ request }) => {
    const body = await request.json() as any;

    let filtered = [...mockAnswers];

    // Apply filters
    if (body.categoryId) {
      filtered = filtered.filter(a => a.category_id === body.categoryId);
    }

    if (body.status && body.status.length > 0) {
      filtered = filtered.filter(a => body.status.includes(a.general_status));
    }

    if (body.search) {
      filtered = filtered.filter(a =>
        a.answer_text.toLowerCase().includes(body.search.toLowerCase())
      );
    }

    return HttpResponse.json({
      success: true,
      count: filtered.length,
      results: filtered,
      mode: 'mock',
    });
  }),

  // GET /api/health
  http.get(`${API_BASE_URL}/api/health`, () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      supabaseConfigured: true,
    });
  }),

  // POST /api/gpt-test
  http.post(`${API_BASE_URL}/api/gpt-test`, async () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              code: 'Test Code',
              confidence: 'high',
              reasoning: 'Mock AI response',
            }),
          },
        },
      ],
      usage: {
        total_tokens: 100,
      },
    });
  }),

  // POST /api/file-upload
  http.post(`${API_BASE_URL}/api/file-upload`, async () => {
    return HttpResponse.json({
      status: 'success',
      imported: 10,
      skipped: 2,
      errors: [],
    });
  }),

  // Error simulation endpoint
  http.get(`${API_BASE_URL}/api/error`, () => {
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }),

  // Timeout simulation endpoint
  http.get(`${API_BASE_URL}/api/timeout`, async () => {
    await new Promise(resolve => setTimeout(resolve, 15000));
    return HttpResponse.json({ data: 'Too late' });
  }),
];

// ───────────────────────────────────────────────────────────────
// Helper to reset mock data
// ───────────────────────────────────────────────────────────────

export function resetMockData() {
  mockCategories.length = 0;
  mockCategories.push(
    { id: 1, name: 'Electronics', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    { id: 2, name: 'Fashion', created_at: '2025-01-02T00:00:00Z', updated_at: '2025-01-02T00:00:00Z' },
    { id: 3, name: 'Food & Beverage', created_at: '2025-01-03T00:00:00Z', updated_at: '2025-01-03T00:00:00Z' }
  );

  mockCodes.length = 0;
  mockCodes.push(
    { id: 1, name: 'Apple', is_whitelisted: true, created_at: '2025-01-01T00:00:00Z', updated_at: null },
    { id: 2, name: 'Samsung', is_whitelisted: true, created_at: '2025-01-01T00:00:00Z', updated_at: null },
    { id: 3, name: 'Nike', is_whitelisted: false, created_at: '2025-01-02T00:00:00Z', updated_at: null },
    { id: 4, name: 'Adidas', is_whitelisted: false, created_at: '2025-01-02T00:00:00Z', updated_at: null }
  );
}

