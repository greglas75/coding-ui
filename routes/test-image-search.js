/**
import logger from '../utils/logger.js';
 * 🧪 Image Search Tester API
 *
 * Tests different AI models to search for images using natural language
 */

import express from 'express';
const router = express.Router();

/**
 * POST /api/test-image-search
 *
 * Body:
 * {
 *   prompt: "find 3 pictures for category toothpaste, keyword: colgate",
 *   model: "gemini-2.5-flash-lite"
 * }
 */
router.post('/test-image-search', async (req, res) => {
  try {
    const { prompt, model, apiKeys } = req.body;

    if (!prompt || !model) {
      return res.status(400).json({
        error: 'Missing required fields: prompt, model',
      });
    }

    logger.info(`🧪 Image Search Test - Model: ${model}, Prompt: "${prompt}"`);

    // Route to appropriate AI service based on model
    let result;

    if (model.startsWith('gemini')) {
      result = await searchWithGemini(prompt, model, apiKeys?.gemini);
    } else if (model.startsWith('gpt') || model.startsWith('openai')) {
      result = await searchWithOpenAI(prompt, model, apiKeys?.openai);
    } else if (model.startsWith('claude')) {
      result = await searchWithClaude(prompt, model, apiKeys?.anthropic);
    } else {
      return res.status(400).json({
        error: `Unsupported model: ${model}`,
      });
    }

    res.json(result);

  } catch (error) {
    logger.error('❌ Image search test error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * Search using Gemini with Google Search grounding
 */
async function searchWithGemini(prompt, model, apiKey) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  // Use API key from request (localStorage in frontend)
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add it in Settings page.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: model,
    // Enable Google Search grounding
    tools: [{
      googleSearch: {}
    }]
  });

  const systemPrompt = `You are an image search assistant. When given a prompt to find images, use Google Search to find relevant, high-quality images.

Return a JSON response with:
{
  "images": [
    {
      "url": "https://...",
      "title": "Image title",
      "description": "Brief description",
      "source": "Domain (e.g., sensodyne.com)"
    }
  ],
  "reasoning": "Explain your search strategy and why you chose these images"
}

IMPORTANT:
- Find images from official/credible sources when possible
- Prefer high-resolution images
- Return 3-6 images
- Include reasoning for transparency`;

  const fullPrompt = `${systemPrompt}\n\nUser Request: ${prompt}`;

  const result = await geminiModel.generateContent(fullPrompt);
  const response = result.response;
  const text = response.text();

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      images: [],
      reasoning: text,
      error: 'Could not parse JSON response',
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    images: parsed.images || [],
    reasoning: parsed.reasoning || text,
  };
}

/**
 * Search using OpenAI (GPT-4o, GPT-4o Mini)
 * Note: OpenAI doesn't have built-in web search, so we use function calling
 */
async function searchWithOpenAI(prompt, model, apiKey) {
  const OpenAI = (await import('openai')).default;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add it in Settings page.');
  }

  const openai = new OpenAI({ apiKey });

  // Define function for image search
  const functions = [
    {
      name: 'search_images',
      description: 'Search for images on the web',
      parameters: {
        type: 'object',
        properties: {
          queries: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of search queries to find relevant images',
          },
        },
        required: ['queries'],
      },
    },
  ];

  const systemPrompt = `You are an image search assistant. Use the search_images function to find relevant images based on user requests.

Your task:
1. Understand the user's request
2. Generate 3-5 optimal search queries for Google Images
3. Return the queries

Example:
User: "find 3 pictures for category toothpaste, keyword: colgate"
Queries: ["colgate toothpaste product", "colgate toothpaste packaging", "colgate official brand"]`;

  const response = await openai.chat.completions.create({
    model: model.replace('openai-', ''), // Remove prefix if present
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    functions,
    function_call: { name: 'search_images' },
    temperature: 0.3,
  });

  const functionCall = response.choices[0]?.message?.function_call;

  if (!functionCall) {
    return {
      images: [],
      reasoning: 'AI did not call search function',
    };
  }

  const args = JSON.parse(functionCall.arguments);
  const queries = args.queries || [];

  // Actually search for images using Google Custom Search
  const { googleImageSearch } = await import('../src/services/webContextProvider');

  const allImages = [];
  for (const query of queries.slice(0, 3)) {
    const results = await googleImageSearch(query, 2);
    allImages.push(...results.map(img => ({
      url: img.link,
      title: img.title,
      description: img.snippet,
      source: img.displayLink,
    })));
  }

  return {
    images: allImages.slice(0, 6),
    reasoning: `Generated ${queries.length} search queries: ${queries.join(', ')}`,
  };
}

/**
 * Search using Claude (Haiku, Sonnet, Opus)
 * Note: Claude doesn't have built-in web search, similar to OpenAI
 */
async function searchWithClaude(prompt, model, apiKey) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;

  if (!apiKey) {
    throw new Error('Claude API key not configured. Please add it in Settings page.');
  }

  const anthropic = new Anthropic({ apiKey });

  // Claude uses tool calling
  const tools = [
    {
      name: 'search_images',
      description: 'Search for images on the web using Google Images',
      input_schema: {
        type: 'object',
        properties: {
          queries: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of search queries to find relevant images',
          },
        },
        required: ['queries'],
      },
    },
  ];

  const systemPrompt = `You are an image search assistant. Use the search_images tool to find relevant images based on user requests.

Your task:
1. Understand the user's request (category, keyword, etc.)
2. Generate 3-5 optimal search queries for finding relevant images
3. Call the search_images tool with your queries

Focus on official sources and high-quality images when possible.`;

  const response = await anthropic.messages.create({
    model: model.replace('claude-', '').replace('anthropic-', ''),
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: prompt },
    ],
    tools,
  });

  // Extract tool use
  const toolUse = response.content.find(block => block.type === 'tool_use');

  if (!toolUse) {
    return {
      images: [],
      reasoning: 'Claude did not use search tool',
    };
  }

  const queries = toolUse.input.queries || [];

  // Actually search for images
  const { googleImageSearch } = await import('../src/services/webContextProvider');

  const allImages = [];
  for (const query of queries.slice(0, 3)) {
    const results = await googleImageSearch(query, 2);
    allImages.push(...results.map(img => ({
      url: img.link,
      title: img.title,
      description: img.snippet,
      source: img.displayLink,
    })));
  }

  return {
    images: allImages.slice(0, 6),
    reasoning: `Generated ${queries.length} search queries: ${queries.join(', ')}`,
  };
}

export default router;
