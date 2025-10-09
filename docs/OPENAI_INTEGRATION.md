# 🤖 OpenAI Integration Guide

## Overview

The OpenAI integration provides AI-powered answer categorization using GPT models. The system analyzes survey responses and suggests relevant codes with confidence scores and reasoning.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install openai
```

✅ **Already installed** in this project

### 2. Configure API Key

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your key
VITE_OPENAI_API_KEY=sk-proj-your-actual-key-here
```

⚠️ **Never commit `.env` to git!** (Already in `.gitignore`)

### 3. Import and Use

```typescript
import { categorizeAnswer } from '@/lib/openai';

const suggestions = await categorizeAnswer({
  answer: "I love Nike shoes",
  categoryName: "Fashion Brands",
  template: DEFAULT_CATEGORIZATION_TEMPLATE,
  codes: [
    { id: "1", name: "Nike" },
    { id: "2", name: "Adidas" },
    { id: "3", name: "Puma" }
  ],
  context: {
    language: "en",
    country: "US"
  }
});

// suggestions = [
//   {
//     code_id: "1",
//     code_name: "Nike",
//     confidence: 0.95,
//     reasoning: "User explicitly mentioned 'Nike shoes' in response"
//   }
// ]
```

---

## API Reference

### `categorizeAnswer(request: CategorizeRequest): Promise<AiCodeSuggestion[]>`

Categorize a single answer using OpenAI.

**Parameters:**

```typescript
interface CategorizeRequest {
  answer: string;              // The user's survey response
  categoryName: string;        // Category being coded (e.g., "Fashion Brands")
  template: string;            // System prompt template
  codes: Array<{              // Available codes to suggest
    id: string;
    name: string;
  }>;
  context: {                   // Additional context
    language?: string;
    country?: string;
  };
}
```

**Returns:**

```typescript
interface AiCodeSuggestion {
  code_id: string;      // ID of suggested code
  code_name: string;    // Name of suggested code
  confidence: number;   // 0.0 to 1.0
  reasoning: string;    // AI's explanation
}
```

**Example:**

```typescript
try {
  const suggestions = await categorizeAnswer({
    answer: "I prefer Adidas because of comfort",
    categoryName: "Shoe Brands",
    template: DEFAULT_CATEGORIZATION_TEMPLATE,
    codes: [
      { id: "1", name: "Nike" },
      { id: "2", name: "Adidas" },
      { id: "3", name: "Puma" }
    ],
    context: {
      language: "en",
      country: "US"
    }
  });

  console.log(suggestions);
  // [
  //   {
  //     code_id: "2",
  //     code_name: "Adidas",
  //     confidence: 0.98,
  //     reasoning: "User explicitly stated preference for Adidas"
  //   }
  // ]
} catch (error) {
  console.error('Categorization failed:', error);
}
```

---

### `batchCategorizeAnswers(requests: CategorizeRequest[]): Promise<AiSuggestions[]>`

Process multiple answers in batch.

**Parameters:**
- `requests`: Array of `CategorizeRequest` objects

**Returns:**
- Array of `AiSuggestions` objects ready for database storage

**Example:**

```typescript
const requests = answers.map(answer => ({
  answer: answer.answer_text,
  categoryName: category.name,
  template: DEFAULT_CATEGORIZATION_TEMPLATE,
  codes: availableCodes,
  context: {
    language: answer.language,
    country: answer.country
  }
}));

const results = await batchCategorizeAnswers(requests);

// Store in database
for (let i = 0; i < answers.length; i++) {
  await supabase
    .from('answers')
    .update({
      ai_suggestions: results[i],
      ai_suggested_code: results[i].suggestions[0]?.code_name
    })
    .eq('id', answers[i].id);
}
```

---

### `validateOpenAIConfig(): boolean`

Check if OpenAI API key is configured.

```typescript
if (!validateOpenAIConfig()) {
  alert('Please configure OpenAI API key in .env file');
}
```

---

### `getOpenAIStatus(): object`

Get detailed configuration status.

```typescript
const status = getOpenAIStatus();
console.log(status);
// {
//   configured: true,
//   model: "gpt-4o-mini",
//   apiKeyPresent: true
// }
```

---

## Template System

### Default Template

```typescript
import { DEFAULT_CATEGORIZATION_TEMPLATE } from '@/lib/openai';
```

The default template includes:
- Category name placeholder: `{name}`
- Available codes list: `{codes}`
- Language context: `{answer_lang}`
- Country context: `{country}`

### Custom Templates

Create category-specific templates:

```typescript
const BRAND_TEMPLATE = `You are an expert at identifying brand mentions in consumer feedback for: {name}.

Available brands:
{codes}

Language: {answer_lang}
Country: {country}

Rules:
1. Only suggest brands explicitly mentioned or strongly implied
2. Use high confidence (>0.9) only for explicit mentions
3. Use medium confidence (0.7-0.9) for strong implications
4. Use low confidence (<0.7) for weak associations
5. Provide clear reasoning for each suggestion

Return JSON with suggestions array.`;

const suggestions = await categorizeAnswer({
  // ...
  template: BRAND_TEMPLATE
});
```

---

## Usage Examples

### Example 1: Single Answer Categorization

```typescript
import { categorizeAnswer } from '@/lib/openai';
import { supabase } from '@/lib/supabase';

async function categorizeSingleAnswer(answerId: number) {
  // Fetch answer and codes
  const { data: answer } = await supabase
    .from('answers')
    .select('*, category:categories(*)')
    .eq('id', answerId)
    .single();

  const { data: codes } = await supabase
    .from('codes')
    .select('id, name');

  // Get AI suggestions
  const suggestions = await categorizeAnswer({
    answer: answer.answer_text,
    categoryName: answer.category.name,
    template: DEFAULT_CATEGORIZATION_TEMPLATE,
    codes: codes.map(c => ({ id: String(c.id), name: c.name })),
    context: {
      language: answer.language,
      country: answer.country
    }
  });

  // Store suggestions in database
  const aiSuggestions = {
    suggestions,
    model: 'gpt-4o-mini',
    timestamp: new Date().toISOString(),
    preset_used: answer.category.name
  };

  await supabase
    .from('answers')
    .update({
      ai_suggestions: aiSuggestions,
      ai_suggested_code: suggestions[0]?.code_name
    })
    .eq('id', answerId);

  return suggestions;
}
```

---

### Example 2: Batch Processing

```typescript
import { batchCategorizeAnswers } from '@/lib/openai';

async function processCategoryWithAI(categoryId: number) {
  // Get uncoded answers
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('category_id', categoryId)
    .is('selected_code', null)
    .limit(100);

  // Get available codes
  const { data: codes } = await supabase
    .from('codes')
    .select('id, name');

  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .single();

  // Create batch requests
  const requests = answers.map(answer => ({
    answer: answer.answer_text,
    categoryName: category.name,
    template: DEFAULT_CATEGORIZATION_TEMPLATE,
    codes: codes.map(c => ({ id: String(c.id), name: c.name })),
    context: {
      language: answer.language,
      country: answer.country
    }
  }));

  // Process batch
  const results = await batchCategorizeAnswers(requests);

  // Update database
  const updates = answers.map((answer, idx) => ({
    id: answer.id,
    ai_suggestions: results[idx],
    ai_suggested_code: results[idx].suggestions[0]?.code_name
  }));

  await supabase.from('answers').upsert(updates);

  console.log(`✅ Processed ${answers.length} answers`);
}
```

---

### Example 3: UI Component with AI Suggestions

```tsx
import { useState } from 'react';
import { categorizeAnswer } from '@/lib/openai';
import type { Answer, Code } from '@/types';

function AiAssistButton({ 
  answer, 
  codes 
}: { 
  answer: Answer; 
  codes: Code[];
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const handleAiSuggest = async () => {
    setLoading(true);
    try {
      const result = await categorizeAnswer({
        answer: answer.answer_text,
        categoryName: "Fashion Brands",
        template: DEFAULT_CATEGORIZATION_TEMPLATE,
        codes: codes.map(c => ({ id: String(c.id), name: c.name })),
        context: {
          language: answer.language,
          country: answer.country
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error('AI suggestion failed:', error);
      alert('Failed to get AI suggestions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAiSuggest}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? '🤖 Thinking...' : '🤖 Get AI Suggestion'}
      </button>

      {suggestions && (
        <div className="mt-4 space-y-2">
          {suggestions.map((s, idx) => (
            <div key={idx} className="bg-blue-50 p-3 rounded">
              <div className="flex justify-between">
                <strong>{s.code_name}</strong>
                <span className="text-sm">
                  {(s.confidence * 100).toFixed(0)}% confident
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {s.reasoning}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Example 4: Auto-Confirm High Confidence

```typescript
import { categorizeAnswer } from '@/lib/openai';

async function autoConfirmHighConfidence(
  categoryId: number,
  threshold: number = 0.95
) {
  // Get uncoded answers
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('category_id', categoryId)
    .is('selected_code', null);

  const { data: codes } = await supabase
    .from('codes')
    .select('id, name');

  let autoConfirmed = 0;

  for (const answer of answers) {
    const suggestions = await categorizeAnswer({
      answer: answer.answer_text,
      categoryName: "Category Name",
      template: DEFAULT_CATEGORIZATION_TEMPLATE,
      codes: codes.map(c => ({ id: String(c.id), name: c.name })),
      context: {
        language: answer.language,
        country: answer.country
      }
    });

    const topSuggestion = suggestions[0];

    // Auto-confirm if confidence is high enough
    if (topSuggestion && topSuggestion.confidence >= threshold) {
      await supabase
        .from('answers')
        .update({
          selected_code: topSuggestion.code_name,
          quick_status: 'Confirmed',
          general_status: 'whitelist',
          coding_date: new Date().toISOString(),
          confirmed_by: 'AI Agent',
          ai_suggestions: {
            suggestions,
            model: 'gpt-4o-mini',
            timestamp: new Date().toISOString(),
            preset_used: 'Auto-Confirm'
          }
        })
        .eq('id', answer.id);

      autoConfirmed++;
    }
  }

  console.log(`✅ Auto-confirmed ${autoConfirmed} answers`);
  return autoConfirmed;
}
```

---

## Cost Management

### Model Selection

Current model: **gpt-4o-mini**
- Cost-effective for production use
- Fast response times
- Good accuracy for categorization tasks

To change model:

```typescript
// In src/lib/openai.ts, line ~68
model: 'gpt-4o',  // More accurate but more expensive
```

### Cost Estimates

**gpt-4o-mini pricing** (as of Oct 2024):
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

**Typical categorization:**
- Input tokens: ~200 (prompt + answer)
- Output tokens: ~100 (suggestions)
- Cost per categorization: **~$0.0001** (0.01 cents)

**Batch of 1000 answers:**
- Total cost: **~$0.10**

### Rate Limits

**Free tier:**
- 3 requests/minute
- 200 requests/day

**Paid tier (Tier 1):**
- 3,500 requests/minute
- 200,000 tokens/minute

### Optimization Tips

1. **Batch Processing**: Use `batchCategorizeAnswers` with `Promise.all`
2. **Cache Results**: Store `ai_suggestions` in database
3. **Filter Smart**: Only categorize uncoded answers
4. **Use Confidence**: Auto-confirm high confidence (>0.95)
5. **Monitor Usage**: Track costs in OpenAI dashboard

---

## Error Handling

### Common Errors

**1. API Key Not Configured**

```typescript
Error: OpenAI API key not configured
```

**Solution:** Add `VITE_OPENAI_API_KEY` to `.env`

---

**2. Rate Limit Exceeded**

```typescript
Error: Rate limit exceeded
```

**Solution:** Add delay between requests or upgrade plan

```typescript
// Add delay in batch processing
for (const answer of answers) {
  await categorizeAnswer(...);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
}
```

---

**3. Invalid JSON Response**

```typescript
Error: Invalid response format from OpenAI
```

**Solution:** Usually temporary. Retry the request.

---

**4. Network Error**

```typescript
Error: fetch failed
```

**Solution:** Check internet connection, verify API key is valid

---

### Production Error Handling

```typescript
async function robustCategorize(request: CategorizeRequest, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await categorizeAnswer(request);
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      
      if (i === retries - 1) {
        // Last attempt failed
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => 
        setTimeout(resolve, 1000 * Math.pow(2, i))
      );
    }
  }
}
```

---

## Testing

### Unit Tests

```typescript
// src/lib/__tests__/openai.test.ts
import { describe, it, expect, vi } from 'vitest';
import { categorizeAnswer } from '../openai';

describe('OpenAI Integration', () => {
  it('should return suggestions for valid input', async () => {
    const suggestions = await categorizeAnswer({
      answer: "I love Nike",
      categoryName: "Brands",
      template: DEFAULT_CATEGORIZATION_TEMPLATE,
      codes: [{ id: "1", name: "Nike" }],
      context: {}
    });

    expect(suggestions).toBeInstanceOf(Array);
    expect(suggestions[0]).toHaveProperty('code_name');
    expect(suggestions[0]).toHaveProperty('confidence');
    expect(suggestions[0]).toHaveProperty('reasoning');
  });

  it('should throw error if API key missing', async () => {
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    
    await expect(
      categorizeAnswer({ /* ... */ })
    ).rejects.toThrow('API key not configured');
  });
});
```

---

## Security Considerations

### ⚠️ Client-Side vs Server-Side

**Current implementation**: Client-side (browser)
- **Pros**: Simple, no backend needed
- **Cons**: API key exposed in browser

**⚠️ IMPORTANT**: For production, move to server-side API!

### Recommended Production Setup

1. **Create API endpoint** (e.g., `/api/categorize`)
2. **Store API key** on server only
3. **Rate limit** requests per user
4. **Add authentication** to prevent abuse

```typescript
// Example: Server-side endpoint (Next.js API route)
// pages/api/categorize.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Server-side only
});

export default async function handler(req, res) {
  // Add authentication here
  
  const suggestions = await categorizeAnswer(req.body);
  res.json(suggestions);
}
```

---

## Monitoring & Analytics

### Track AI Performance

```sql
-- Get AI accuracy over time
SELECT 
  DATE(updated_at) as date,
  COUNT(*) as total_suggestions,
  SUM(CASE WHEN selected_code = ai_suggested_code THEN 1 ELSE 0 END) as correct,
  ROUND(
    SUM(CASE WHEN selected_code = ai_suggested_code THEN 1 ELSE 0 END)::NUMERIC / 
    COUNT(*)::NUMERIC * 100, 
    2
  ) as accuracy_pct
FROM answers
WHERE ai_suggestions IS NOT NULL
AND selected_code IS NOT NULL
GROUP BY DATE(updated_at)
ORDER BY date DESC;
```

### Dashboard Metrics

- **Total categorized**: Count of answers with `ai_suggestions`
- **Auto-confirmed**: Count with `confirmed_by = 'AI Agent'`
- **Accuracy rate**: `correct_suggestions / total_suggestions`
- **Avg confidence**: Average of top suggestion confidence scores

---

## Next Steps

1. ✅ **Integration complete** - OpenAI service ready
2. ✅ **Environment configured** - `.env` setup done
3. 🔜 **Add UI components** - AI suggestion buttons
4. 🔜 **Implement batch processing** - Auto-categorize feature
5. 🔜 **Add analytics dashboard** - Track AI performance
6. 🔜 **Move to server-side** - Production security

---

## Support

For issues or questions:
- Check [OpenAI API Docs](https://platform.openai.com/docs)
- Review error messages in console
- Verify API key is valid in OpenAI dashboard
- Check rate limits and usage

---

**✅ OpenAI integration is ready to use!**


