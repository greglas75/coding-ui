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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CategorizeRequest } from '../../lib/openai';
import { batchCategorizeAnswers, categorizeAnswer } from '../../lib/openai';

// Mock modules
vi.mock('../../utils/apiKeys', () => ({
  getOpenAIAPIKey: vi.fn(() => 'test-api-key'),
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error if no API key configured', async () => {
    const { getOpenAIAPIKey } = await import('../../utils/apiKeys');
    vi.mocked(getOpenAIAPIKey).mockReturnValue(null);

    await expect(categorizeAnswer(mockRequest)).rejects.toThrow('OpenAI API key not configured');
  });

  it('should return suggestions for valid input', async () => {
    // Mock OpenAI response
    vi.mock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn(async () => ({
              choices: [
                {
                  message: {
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
                },
              ],
            })),
          },
        };
      },
    }));

    const result = await categorizeAnswer(mockRequest);

    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0].code_name).toBe('Nike');
    expect(result.suggestions[0].confidence).toBeGreaterThan(0.8);
  });

  it('should validate and clamp confidence scores', async () => {
    // Mock response with invalid confidence
    vi.mock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn(async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      suggestions: [
                        {
                          code_id: '1',
                          code_name: 'Nike',
                          confidence: 1.5, // Invalid (>1)
                          reasoning: 'Test',
                        },
                        {
                          code_id: '2',
                          code_name: 'Adidas',
                          confidence: -0.2, // Invalid (<0)
                          reasoning: 'Test',
                        },
                      ],
                    }),
                  },
                },
              ],
            })),
          },
        };
      },
    }));

    const result = await categorizeAnswer(mockRequest);

    // Should clamp to 0-1 range
    expect(result.suggestions[0].confidence).toBeLessThanOrEqual(1);
    expect(result.suggestions[0].confidence).toBeGreaterThanOrEqual(0);
    expect(result.suggestions[1].confidence).toBeLessThanOrEqual(1);
    expect(result.suggestions[1].confidence).toBeGreaterThanOrEqual(0);
  });

  it('should handle OpenAI rate limit error (429)', async () => {
    vi.mock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn(async () => {
              const error: any = new Error('Rate limit exceeded');
              error.status = 429;
              throw error;
            }),
          },
        };
      },
    }));

    await expect(categorizeAnswer(mockRequest)).rejects.toThrow('Rate limit reached');
  });

  it('should handle invalid API key error (401)', async () => {
    vi.mock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn(async () => {
              const error: any = new Error('Invalid API key');
              error.status = 401;
              throw error;
            }),
          },
        };
      },
    }));

    await expect(categorizeAnswer(mockRequest)).rejects.toThrow('OpenAI API key is invalid');
  });

  it('should include web context in results', async () => {
    const result = await categorizeAnswer(mockRequest);

    expect(result.webContext).toBeDefined();
    expect(Array.isArray(result.webContext)).toBe(true);
  });

  it('should include images in results', async () => {
    const result = await categorizeAnswer(mockRequest);

    expect(result.images).toBeDefined();
    expect(Array.isArray(result.images)).toBe(true);
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

    // Mock to capture the system prompt
    let capturedPrompt: string = '';
    vi.mock('openai', () => ({
      default: class OpenAI {
        chat = {
          completions: {
            create: vi.fn(async (params: any) => {
              capturedPrompt = params.messages[0].content;
              return {
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        suggestions: [],
                      }),
                    },
                  },
                ],
              };
            }),
          },
        };
      },
    }));

    await categorizeAnswer(requestWithTemplate);

    // Should use custom template
    expect(capturedPrompt).toContain('Brands');
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

    const results = await batchCategorizeAnswers(requests);

    // Should return results for both (even if one failed)
    expect(results).toHaveLength(2);
    expect(results[1].suggestions).toEqual([]); // Failed request returns empty
  });
});
