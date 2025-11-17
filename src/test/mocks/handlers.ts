/**
 * 🧪 MSW Mock Handlers
 *
 * Consolidated handlers for external APIs and Supabase endpoints.
 */

import { http, HttpResponse } from 'msw';

const mockTranslations: Record<string, string> = {
  'Używam GCash|en': 'I use GCash',
  'Dzień dobry|en': 'Good morning',
  'Cześć świat|en': 'Hello world',
  'Test text|en': 'Fallback translation',
};

const mockSearchResults = [
  {
    title: 'GCash — Mobile wallet in Philippines',
    snippet: 'GCash is the leading mobile wallet in the Philippines...',
    link: 'https://example.com/gcash',
  },
  {
    title: 'Maya — Digital bank in Philippines',
    snippet: 'Maya offers digital banking and wallet services...',
    link: 'https://example.com/maya',
  },
];

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
];

const mockCategories = [{ id: 1, name: 'Fashion Brands', description: 'Test category' }];
const mockCodes = [
  { id: 1, name: 'Nike' },
  { id: 2, name: 'Adidas' },
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
};

const translationHandlers = [
  http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
    const body = await request.json();
    const userContent = body.messages?.find((msg: any) => msg.role === 'user')?.content;
    const translation = mockTranslations[`${userContent}|${body.target_language || 'en'}`] ?? 'Translated text';
    return HttpResponse.json({
      choices: [
        {
          message: { content: translation },
        },
      ],
    });
  }),
  http.post('https://generativelanguage.googleapis.com/v1beta/models/*:generateContent', async ({ request }) => {
    const body = await request.json();
    const prompt = body.contents?.[0]?.parts?.[0]?.text;
    const translation = mockTranslations[`${prompt}|en`] ?? 'Translated text';
    return HttpResponse.json({
      candidates: [
        {
          content: { parts: [{ text: translation }] },
        },
      ],
    });
  }),
  http.get('https://www.googleapis.com/customsearch/v1', ({ request }) => {
    const num = Number(new URL(request.url).searchParams.get('num')) || 2;
    return HttpResponse.json({
      items: mockSearchResults.slice(0, num),
    });
  }),
];

const supabaseHandlers = [
  http.get('*/rest/v1/answers*', () => HttpResponse.json(mockAnswers)),
  http.post('*/rest/v1/answers*', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json([{ ...body, id: Date.now() }]);
  }),
  http.get('*/rest/v1/categories*', () => HttpResponse.json(mockCategories)),
  http.get('*/rest/v1/codes*', () => HttpResponse.json(mockCodes)),
  http.post('*/rest/v1/rpc/*', () => HttpResponse.json([])),
  http.post('*/v1/chat/completions', () => HttpResponse.json(mockOpenAIResponse)),
];

export const handlers = [...translationHandlers, ...supabaseHandlers];
