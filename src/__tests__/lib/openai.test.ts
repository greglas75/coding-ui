/**
 * 🧪 Unit Tests for OpenAI Categorization
 *
 * Tests the core AI categorization logic including:
 * - Request/response handling
 * - Error handling (rate limits, auth errors)
 * - Evidence scoring
 * - Vision AI fallback
 * - Web context integration
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CategorizeRequest } from '../../lib/openai';

const chatCompletionMock = vi.fn();

const buildOpenAIResponse = (
  suggestions: Array<{ code_id: string; code_name: string; confidence: number; reasoning?: string }> = [
    { code_id: '1', code_name: 'Nike', confidence: 0.95, reasoning: 'Mock response' },
  ]
) => ({
  choices: [
    {
      message: {
        content: JSON.stringify({ suggestions }),
      },
    },
  ],
});

const mockGetOpenAIAPIKey = vi.fn(() => 'test-openai-key');

vi.mock('../../utils/apiKeys', () => ({
  getOpenAIAPIKey: mockGetOpenAIAPIKey,
  getAnthropicAPIKey: vi.fn(() => 'test-anthropic-key'),
  getGoogleGeminiAPIKey: vi.fn(() => 'test-gemini-key'),
  getGoogleCSEAPIKey: vi.fn(() => 'test-google-cse-key'),
  getGoogleCSECXID: vi.fn(() => 'test-google-cx-id'),
  getPineconeAPIKey: vi.fn(() => 'test-pinecone-key'),
}));

const mockValidateBrandMultiSource = vi.fn();
const mockConvertToAISuggestion = vi.fn();
const mockFormatSourcesForDisplay = vi.fn(() => ({}));

vi.mock('../../services/multiSourceValidator', () => ({
  validateBrandMultiSource: (...args: Parameters<typeof mockValidateBrandMultiSource>) =>
    mockValidateBrandMultiSource(...args),
  convertToAISuggestion: (...args: Parameters<typeof mockConvertToAISuggestion>) =>
    mockConvertToAISuggestion(...args),
  formatSourcesForDisplay: mockFormatSourcesForDisplay,
}));

vi.mock('../../services/webContextProvider', () => ({
  buildWebContextSection: vi.fn(async () => 'Mock web context'),
  googleSearch: vi.fn(async () => [
    {
      title: 'Nike Official Site',
      snippet: 'Shop Nike shoes and apparel',
      url: 'https://nike.com',
    },
  ]),
  googleImageSearch: vi.fn(async () => [
    {
      title: 'Nike Logo',
      link: 'https://example.com/nike.jpg',
    },
  ]),
}));

vi.mock('../../services/geminiVision', () => ({
  analyzeImagesWithGemini: vi.fn(async () => ({
    brandDetected: true,
    brandName: 'Nike',
    confidence: 0.95,
    reasoning: 'Nike logo detected in image',
    objectsDetected: ['shoe', 'logo'],
  })),
  calculateVisionBoost: vi.fn(() => ({
    boost: 0.15,
    details: 'strong visual match',
  })),
}));

vi.mock('openai', () => {
  class OpenAI {
    chat = {
      completions: {
        create: (...args: any[]) => chatCompletionMock(...args),
      },
    };
  }
  return { default: OpenAI };
});

const retryWithBackoffMock = vi.fn(async (fn: () => Promise<unknown>) => fn());
const createRateLimiter = () => ({
  add: (fn: () => Promise<unknown>) => fn(),
});

vi.mock('../../lib/rateLimit', () => ({
  openaiRateLimiter: createRateLimiter(),
  googleSearchRateLimiter: createRateLimiter(),
  visionRateLimiter: createRateLimiter(),
  retryWithBackoff: (...args: Parameters<typeof retryWithBackoffMock>) =>
    retryWithBackoffMock(...args),
}));

let categorizeAnswer: typeof import('../../lib/openai').categorizeAnswer;
let batchCategorizeAnswers: typeof import('../../lib/openai').batchCategorizeAnswers;

beforeAll(async () => {
  const module = await import('../../lib/openai');
  categorizeAnswer = module.categorizeAnswer;
  batchCategorizeAnswers = module.batchCategorizeAnswers;
});

beforeEach(() => {
  vi.clearAllMocks();
  chatCompletionMock.mockReset();
  chatCompletionMock.mockResolvedValue(buildOpenAIResponse());
  mockValidateBrandMultiSource.mockRejectedValue(new Error('disabled multi-source'));
  mockConvertToAISuggestion.mockReturnValue(null);
  mockFormatSourcesForDisplay.mockReturnValue({});
  mockGetOpenAIAPIKey.mockReturnValue('test-openai-key');
});

describe('categorizeAnswer', () => {
  const mockRequest: CategorizeRequest = {
    answer: 'Nike shoes',
    answerTranslation: 'Nike shoes',
    categoryName: 'Brands',
    presetName: 'LLM Brand List',
    model: 'gpt-4o-mini',
    codes: [
      { id: '1', name: 'Nike' },
      { id: '2', name: 'Adidas' },
      { id: '3', name: 'Puma' },
    ],
    context: {
      language: 'en',
      country: 'US',
    },
  };

  it('should throw error if no API key configured', async () => {
    mockGetOpenAIAPIKey.mockReturnValueOnce(null);

    await expect(categorizeAnswer(mockRequest)).rejects.toThrow('OpenAI API key not configured');
  });

  it('should return suggestions for valid input', async () => {
    const result = await categorizeAnswer(mockRequest);

    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].code_name).toBe('Nike');
    expect(result.suggestions[0].confidence).toBeGreaterThan(0.8);
  });

  it('should validate and clamp confidence scores', async () => {
    chatCompletionMock.mockResolvedValueOnce(
      buildOpenAIResponse([
        { code_id: '1', code_name: 'Nike', confidence: 1.5, reasoning: 'Test' },
        { code_id: '2', code_name: 'Adidas', confidence: -0.2, reasoning: 'Test' },
      ])
    );

    const result = await categorizeAnswer(mockRequest);

    // Should clamp to 0-1 range and drop invalid negatives
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].confidence).toBeLessThanOrEqual(1);
    expect(result.suggestions[0].confidence).toBeGreaterThanOrEqual(0);
  });

  it('should handle OpenAI rate limit error (429)', async () => {
    const error: any = new Error('Rate limit exceeded');
    error.status = 429;
    chatCompletionMock.mockRejectedValueOnce(error);

    await expect(categorizeAnswer(mockRequest)).rejects.toThrow('Rate limit reached');
  });

  it('should handle invalid API key error (401)', async () => {
    const error: any = new Error('Invalid API key');
    error.status = 401;
    chatCompletionMock.mockRejectedValueOnce(error);

    await expect(categorizeAnswer(mockRequest)).rejects.toThrow('OpenAI API key is invalid');
  });

  it('should include web context in results', async () => {
    const result = await categorizeAnswer(mockRequest);

    expect(result.webContext).toBeDefined();
    expect(Array.isArray(result.webContext)).toBe(true);
    expect(result.webContext?.length).toBeGreaterThan(0);
  });

  it('should include images in results', async () => {
    const result = await categorizeAnswer(mockRequest);

    expect(result.images).toBeDefined();
    expect(Array.isArray(result.images)).toBe(true);
    expect(result.images?.length).toBeGreaterThan(0);
  });

  it('should use vision AI when visionModel is provided', async () => {
    const requestWithVision = {
      ...mockRequest,
      visionModel: 'gemini-2.0-pro-exp',
    };

    const result = await categorizeAnswer(requestWithVision);

    expect(result.visionResult).toBeDefined();
    expect(result.visionResult?.brandDetected).toBe(true);
  });

  it('should use custom template when provided', async () => {
    const customTemplate = 'Custom template for {category} with {codes}';
    const requestWithTemplate = {
      ...mockRequest,
      customTemplate,
    };

    await categorizeAnswer(requestWithTemplate);

    const firstCall = chatCompletionMock.mock.calls[0]?.[0];
    expect(firstCall?.messages?.[0]?.content).toContain('Custom template for Brands');
  });
});

describe('batchCategorizeAnswers', () => {
  it('should process multiple requests', async () => {
    const requests: CategorizeRequest[] = [
      {
        answer: 'Nike',
        categoryName: 'Brands',
        presetName: 'LLM Brand List',
        codes: [{ id: '1', name: 'Nike' }],
        context: {},
      },
      {
        answer: 'Adidas',
        categoryName: 'Brands',
        presetName: 'LLM Brand List',
        codes: [{ id: '2', name: 'Adidas' }],
        context: {},
      },
    ];

    const results = await batchCategorizeAnswers(requests);

    expect(results).toHaveLength(2);
    expect(results[0].suggestions).toBeDefined();
    expect(results[1].suggestions).toBeDefined();
  });

  it('should handle errors gracefully and continue', async () => {
    const requests: CategorizeRequest[] = [
      {
        answer: 'Nike',
        categoryName: 'Brands',
        presetName: 'LLM Brand List',
        codes: [{ id: '1', name: 'Nike' }],
        context: {},
      },
      {
        answer: '', // Invalid - will cause error
        categoryName: 'Brands',
        presetName: 'LLM Brand List',
        codes: [],
        context: {},
      },
    ];

    chatCompletionMock
      .mockResolvedValueOnce(buildOpenAIResponse([{ code_id: '1', code_name: 'Nike', confidence: 0.9 }]))
      .mockRejectedValueOnce(new Error('OpenAI failure'));

    const results = await batchCategorizeAnswers(requests);

    // Should return results for both (even if one failed)
    expect(results).toHaveLength(2);
    expect(results[0].suggestions).toBeDefined();
    expect(results[1].suggestions).toEqual([]); // Failed request returns empty
  });
});
