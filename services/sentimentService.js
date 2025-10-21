/**
 * Sentiment Service - Context-aware sentiment analysis with smart detection
 */

import OpenAI from 'openai';
import { SENTIMENT_SYSTEM_PROMPT } from './prompts/sentimentSystemPrompt.js';

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class SentimentService {
  /**
   * Analyze answer with sentiment (context-aware)
   * @param {string} answerText - The answer text to analyze
   * @param {object} categorySettings - Category sentiment settings
   * @returns {Promise<object>} Analysis result
   */
  async analyzeWithSentiment(answerText, categorySettings = {}) {
    const {
      sentiment_enabled = false,
      sentiment_mode = 'smart',
    } = categorySettings;

    try {
      // Skip sentiment entirely if disabled at category level
      if (!sentiment_enabled) {
        return this._getCodesSuggestionOnly(answerText);
      }

      // Call GPT with enhanced function
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SENTIMENT_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: answerText,
          },
        ],
        functions: [
          {
            name: 'analyze_answer',
            description: 'Analyze answer for codes and sentiment',
            parameters: {
              type: 'object',
              properties: {
                suggested_codes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of relevant code names',
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Confidence in code suggestions',
                },
                sentiment_applicable: {
                  type: 'boolean',
                  description:
                    'Does sentiment analysis make sense for this text?',
                },
                sentiment: {
                  type: ['string', 'null'],
                  enum: ['positive', 'neutral', 'negative', 'mixed', null],
                  description: 'Overall sentiment if applicable',
                },
                sentiment_score: {
                  type: ['number', 'null'],
                  minimum: 0,
                  maximum: 1,
                  description:
                    '0 = very negative, 0.5 = neutral, 1 = very positive, null if not applicable',
                },
                sentiment_confidence: {
                  type: ['number', 'null'],
                  minimum: 0,
                  maximum: 1,
                  description:
                    'Confidence in sentiment assessment, null if not applicable',
                },
                reasoning: {
                  type: 'string',
                  description: 'Explain your decisions (codes and sentiment)',
                },
              },
              required: [
                'suggested_codes',
                'confidence',
                'sentiment_applicable',
                'reasoning',
              ],
            },
          },
        ],
        function_call: { name: 'analyze_answer' },
      });

      // Parse function call result
      const functionCall = response.choices[0].message.function_call;
      if (!functionCall) {
        throw new Error('No function call in GPT response');
      }

      let result = JSON.parse(functionCall.arguments);

      // Apply category sentiment_mode override
      result = this._applySentimentModeOverride(result, sentiment_mode);

      // Log for debugging
      console.log(
        `[Sentiment] Answer: "${answerText.substring(0, 50)}..."
                   Applicable: ${result.sentiment_applicable}
                   Sentiment: ${result.sentiment}
                   Score: ${result.sentiment_score}
                   Mode: ${sentiment_mode}`
      );

      // Add token usage info
      result.usage = {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      };

      return result;
    } catch (error) {
      console.error('[Sentiment] Analysis failed:', error);

      // Fallback: return without sentiment
      return {
        suggested_codes: [],
        confidence: 0,
        sentiment_applicable: false,
        sentiment: null,
        sentiment_score: null,
        sentiment_confidence: null,
        reasoning: `Error: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Apply sentiment_mode override
   */
  _applySentimentModeOverride(result, mode) {
    if (mode === 'never') {
      // Force disable sentiment
      result.sentiment_applicable = false;
      result.sentiment = null;
      result.sentiment_score = null;
      result.sentiment_confidence = null;
    } else if (mode === 'always') {
      // Force enable sentiment
      result.sentiment_applicable = true;

      // If GPT didn't provide sentiment, default to neutral
      if (!result.sentiment) {
        result.sentiment = 'neutral';
        result.sentiment_score = 0.5;
        result.sentiment_confidence = 0.5;
        result.reasoning += ' [Note: Sentiment forced by always mode]';
      }
    }
    // mode === 'smart': no override, use GPT decision

    return result;
  }

  /**
   * Fallback: Get codes without sentiment
   */
  async _getCodesSuggestionOnly(answerText) {
    try {
      // Simplified GPT call without sentiment
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a coding assistant. Suggest relevant codes for survey answers.',
          },
          {
            role: 'user',
            content: answerText,
          },
        ],
        functions: [
          {
            name: 'suggest_codes',
            parameters: {
              type: 'object',
              properties: {
                suggested_codes: {
                  type: 'array',
                  items: { type: 'string' },
                },
                confidence: { type: 'number' },
              },
            },
          },
        ],
        function_call: { name: 'suggest_codes' },
      });

      const result = JSON.parse(
        response.choices[0].message.function_call.arguments
      );

      return {
        ...result,
        sentiment_applicable: false,
        sentiment: null,
        sentiment_score: null,
        sentiment_confidence: null,
        reasoning: 'Sentiment analysis disabled for this category',
        usage: {
          input_tokens: response.usage?.prompt_tokens || 0,
          output_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('[Sentiment] Codes-only analysis failed:', error);
      throw error;
    }
  }

  /**
   * Batch analyze multiple answers
   */
  async batchAnalyze(answers, categorySettings) {
    const results = [];

    for (const answer of answers) {
      const analysis = await this.analyzeWithSentiment(
        answer.text,
        categorySettings
      );

      results.push({
        id: answer.id,
        ...analysis,
      });

      // Rate limiting: small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Calculate cost for sentiment analysis
   */
  calculateCost(inputTokens, outputTokens) {
    // GPT-4o-mini pricing (as of 2025)
    const inputCostPer1k = 0.00015; // $0.15 per 1M tokens
    const outputCostPer1k = 0.0006; // $0.60 per 1M tokens

    const inputCost = (inputTokens / 1000) * inputCostPer1k;
    const outputCost = (outputTokens / 1000) * outputCostPer1k;

    return inputCost + outputCost;
  }

  /**
   * Estimate cost difference with/without sentiment
   */
  estimateCostDifference() {
    // Without sentiment: ~500 input tokens, ~100 output tokens
    const costWithout = this.calculateCost(500, 100);

    // With sentiment: ~700 input tokens, ~150 output tokens
    const costWith = this.calculateCost(700, 150);

    const difference = costWith - costWithout;
    const percentageIncrease = ((difference / costWithout) * 100).toFixed(1);

    return {
      cost_without: costWithout.toFixed(6),
      cost_with: costWith.toFixed(6),
      difference: difference.toFixed(6),
      percentage_increase: parseFloat(percentageIncrease),
    };
  }
}

// Export singleton instance
export default new SentimentService();
