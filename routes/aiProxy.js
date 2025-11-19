/**
import logger from '../utils/logger.js';
 * AI Proxy Routes
 *
 * CORS-bypassing proxies for Claude, Gemini, and OpenAI APIs
 */
import express from 'express';
import OpenAI from 'openai';

const router = express.Router();
const isProd = process.env.NODE_ENV === 'production';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key',
});

/**
 * Claude API Proxy
 * POST /api/ai-proxy/claude
 */
router.post('/claude', async (req, res) => {
  const startTime = Date.now();
  const log = req.log || console;

  try {
    const { model, system, messages, temperature, max_tokens, apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key required' });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    log.info('[Claude Proxy] Request', {
      id: req.requestId,
      model,
      messageCount: messages.length,
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system,
        messages,
        temperature: temperature || 0.3,
        max_tokens: max_tokens || 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('[Claude Proxy] API Error', {
        id: req.requestId,
        status: response.status,
        error: errorText,
      });
      return res.status(response.status).json({
        error: `Claude API error: ${response.status} ${response.statusText}`,
        details: errorText,
      });
    }

    const data = await response.json();
    const elapsed = Date.now() - startTime;

    log.info('[Claude Proxy] Success', {
      id: req.requestId,
      timeMs: elapsed,
    });

    res.status(200).json(data);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log.error('[Claude Proxy] Failed', { id: req.requestId, timeMs: elapsed }, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Gemini API Proxy
 * POST /api/ai-proxy/gemini
 */
router.post('/gemini', async (req, res) => {
  const startTime = Date.now();
  const log = req.log || console;

  try {
    const { model, contents, generationConfig, apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key required' });
    }

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: 'Contents array required' });
    }

    log.info('[Gemini Proxy] Request', {
      id: req.requestId,
      model,
      contentCount: contents.length,
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: generationConfig || {
            temperature: 0.3,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.error('[Gemini Proxy] API Error', {
        id: req.requestId,
        status: response.status,
        error: errorText,
      });
      return res.status(response.status).json({
        error: `Gemini API error: ${response.status} ${response.statusText}`,
        details: errorText,
      });
    }

    const data = await response.json();
    const elapsed = Date.now() - startTime;

    log.info('[Gemini Proxy] Success', {
      id: req.requestId,
      timeMs: elapsed,
    });

    res.status(200).json(data);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    log.error('[Gemini Proxy] Failed', { id: req.requestId, timeMs: elapsed }, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * OpenAI GPT Test Endpoint
 * POST /api/gpt-test
 */
router.post('/gpt-test', async (req, res) => {
  const startTime = Date.now();
  const log = req.log || console;

  try {
    const { model, messages, max_completion_tokens, temperature, top_p } = req.body;

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: messages array is required',
      });
    }

    const requestedModel = model || 'gpt-4o-mini';

    log.info('[GPT Test] Request', {
      id: req.requestId,
      model: requestedModel,
      messageCount: messages.length,
      maxTokens: max_completion_tokens || 500,
      temperature: temperature ?? 0,
      topP: top_p ?? 0.1,
    });

    // Demo mode - return mock response
    if (process.env.OPENAI_API_KEY === 'demo-key' || !process.env.OPENAI_API_KEY) {
      log.info('[GPT Test] Running in DEMO mode (no API key)', { id: req.requestId });

      const mockResponse = {
        id: 'chatcmpl-demo',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify(
                {
                  brand: 'Demo Brand',
                  confidence: 0.95,
                  note: 'This is a DEMO response. Set OPENAI_API_KEY environment variable for real GPT responses.',
                },
                null,
                2
              ),
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 25,
          total_tokens: 75,
        },
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const elapsed = Date.now() - startTime;
      log.info('[GPT Test] Demo response sent', { id: req.requestId, timeMs: elapsed });

      return res.status(200).json(mockResponse);
    }

    // Production mode - call OpenAI API
    log.info('[GPT Test] Calling OpenAI API', { id: req.requestId, model: requestedModel });

    const completion = await client.chat.completions.create({
      model: requestedModel,
      messages: messages,
      max_completion_tokens: max_completion_tokens || 500,
      temperature: temperature ?? 0,
      top_p: top_p ?? 0.1,
    });

    const elapsed = Date.now() - startTime;

    log.info('[GPT Test] Success', {
      id: req.requestId,
      model: completion.model,
      finishReason: completion.choices[0]?.finish_reason,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
      timeMs: elapsed,
    });

    res.status(200).json(completion);
  } catch (error) {
    const elapsed = Date.now() - startTime;

    log.error('[GPT Test] Failed', { id: req.requestId, timeMs: elapsed }, error);
    const safe = isProd
      ? { error: 'Internal server error', id: req.requestId }
      : { error: error.message, type: error.constructor.name, timeMs: elapsed, id: req.requestId };
    res.status(500).json(safe);
  }
});

export default router;
