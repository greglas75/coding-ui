/**
 * 🧪 MSW Mock Handlers
 *
 * Mock API responses for testing without real API calls
 */

import { http, HttpResponse } from 'msw';

// Mock data
const mockAnswers = [
  {
    id: 1,
    answer_text: 'Nike shoes',
    translation_en: 'Nike shoes',
    language: 'en',
    country: 'US',
    general_status: 'uncategorized',
    quick_status: null,
    selected_code: null,
    ai_suggested_code: null,
    category_id: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    answer_text: 'Adidas sneakers',
    translation_en: 'Adidas sneakers',
    language: 'en',
    country: 'UK',
    general_status: 'whitelist',
    quick_status: 'Confirmed',
    selected_code: 'Adidas',
    ai_suggested_code: 'Adidas',
    category_id: 1,
    created_at: new Date().toISOString(),
  },
];

const mockCategories = [
  {
    id: 1,
    name: 'Fashion Brands',
    description: 'Test category',
    created_at: new Date().toISOString(),
  },
];

const mockCodes = [
  { id: 1, name: 'Nike' },
  { id: 2, name: 'Adidas' },
  { id: 3, name: 'Puma' },
];

const mockOpenAIResponse = {
  id: 'chatcmpl-test',
  object: 'chat.completion',
  created: Math.floor(Date.now() / 1000),
  model: 'gpt-4o-mini',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: JSON.stringify({
          suggestions: [
            {
              code_id: '1',
              code_name: 'Nike',
              confidence: 0.95,
              reasoning: 'User explicitly mentioned Nike',
            },
          ],
        }),
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
};

export const handlers = [
  // Supabase - Answers
  http.get('*/rest/v1/answers*', () => {
    return HttpResponse.json(mockAnswers);
  }),

  http.post('*/rest/v1/answers*', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json([{ ...body, id: Date.now() }]);
  }),

  http.patch('*/rest/v1/answers*', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json([{ ...mockAnswers[0], ...body }]);
  }),

  // Supabase - Categories
  http.get('*/rest/v1/categories*', () => {
    return HttpResponse.json(mockCategories);
  }),

  http.post('*/rest/v1/categories*', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json([{ ...body, id: Date.now() }]);
  }),

  // Supabase - Codes
  http.get('*/rest/v1/codes*', () => {
    return HttpResponse.json(mockCodes);
  }),

  http.post('*/rest/v1/codes*', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json([{ ...body, id: Date.now() }]);
  }),

  // Supabase RPC
  http.post('*/rest/v1/rpc/*', () => {
    return HttpResponse.json([]);
  }),

  // OpenAI API
  http.post('*/v1/chat/completions', () => {
    return HttpResponse.json(mockOpenAIResponse);
  }),

  // Google Custom Search
  http.get('*/customsearch/v1', () => {
    return HttpResponse.json({
      items: [
        {
          title: 'Nike Official Site',
          snippet: 'Shop Nike shoes and apparel',
          link: 'https://nike.com',
        },
      ],
    });
  }),

  // Google Gemini
  http.post('*/generativelanguage.googleapis.com/*', () => {
    return HttpResponse.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  brandDetected: true,
                  brandName: 'Nike',
                  confidence: 95,
                  reasoning: 'Nike logo detected',
                  objectsDetected: ['shoe', 'logo'],
                }),
              },
            ],
          },
        },
      ],
    });
  }),
];
