# 🤖 Complete AI Workflow Example

## End-to-End Example: From API Call to Database Storage

This guide shows the complete workflow of using OpenAI to categorize answers and storing the results in the database using the new `ai_suggestions` column.

---

## Prerequisites

1. ✅ Database migration applied (`2025-10-07-add-ai-suggestions.sql`)
2. ✅ OpenAI package installed (`npm install openai`)
3. ✅ API key configured in `.env`

---

## Complete Workflow

### Step 1: Setup

```typescript
// src/services/aiCategorization.ts
import { supabase } from '@/lib/supabase';
import { categorizeAnswer, batchCategorizeAnswers } from '@/lib/openai';
import type { Answer, Code, Category, AiSuggestions } from '@/types';
```

---

### Step 2: Single Answer Categorization

```typescript
/**
 * Categorize a single answer and store in database
 */
export async function categorizeAndStoreAnswer(answerId: number): Promise<void> {
  // 1. Fetch the answer with category
  const { data: answer, error: answerError } = await supabase
    .from('answers')
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq('id', answerId)
    .single();

  if (answerError || !answer) {
    throw new Error('Answer not found');
  }

  // 2. Get available codes for this category
  const { data: codes, error: codesError } = await supabase
    .from('codes')
    .select('id, name')
    .order('name');

  if (codesError || !codes) {
    throw new Error('Could not fetch codes');
  }

  // 3. Call OpenAI API
  console.log(`🤖 Categorizing answer ${answerId}...`);
  
  const suggestions = await categorizeAnswer({
    answer: answer.answer_text,
    categoryName: answer.category.name,
    template: DEFAULT_CATEGORIZATION_TEMPLATE,
    codes: codes.map(c => ({ id: String(c.id), name: c.name })),
    context: {
      language: answer.language || undefined,
      country: answer.country || undefined
    }
  });

  console.log(`✅ Got ${suggestions.length} suggestions`);

  // 4. Build AiSuggestions object
  const aiSuggestions: AiSuggestions = {
    suggestions,
    model: 'gpt-4o-mini',
    timestamp: new Date().toISOString(),
    preset_used: answer.category.name
  };

  // 5. Store in database
  const { error: updateError } = await supabase
    .from('answers')
    .update({
      ai_suggestions: aiSuggestions,
      ai_suggested_code: suggestions[0]?.code_name || null
    })
    .eq('id', answerId);

  if (updateError) {
    throw new Error(`Failed to update answer: ${updateError.message}`);
  }

  console.log(`✅ Answer ${answerId} updated with AI suggestions`);
}
```

---

### Step 3: Batch Categorization

```typescript
/**
 * Categorize all uncoded answers in a category
 */
export async function batchCategorizeCategoryAnswers(
  categoryId: number,
  limit: number = 100
): Promise<{ processed: number; errors: number }> {
  // 1. Get category info
  const { data: category } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', categoryId)
    .single();

  if (!category) {
    throw new Error('Category not found');
  }

  // 2. Get uncoded answers
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('category_id', categoryId)
    .is('selected_code', null)
    .is('ai_suggestions', null)
    .limit(limit);

  if (!answers || answers.length === 0) {
    console.log('No answers to process');
    return { processed: 0, errors: 0 };
  }

  console.log(`📊 Processing ${answers.length} answers for category "${category.name}"`);

  // 3. Get available codes
  const { data: codes } = await supabase
    .from('codes')
    .select('id, name')
    .order('name');

  if (!codes) {
    throw new Error('Could not fetch codes');
  }

  // 4. Build batch requests
  const requests = answers.map(answer => ({
    answer: answer.answer_text,
    categoryName: category.name,
    template: DEFAULT_CATEGORIZATION_TEMPLATE,
    codes: codes.map(c => ({ id: String(c.id), name: c.name })),
    context: {
      language: answer.language || undefined,
      country: answer.country || undefined
    }
  }));

  // 5. Call OpenAI in batch
  console.log('🤖 Calling OpenAI API...');
  const results = await batchCategorizeAnswers(requests);

  // 6. Update database
  console.log('💾 Storing results in database...');
  
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < answers.length; i++) {
    try {
      const aiSuggestions = results[i];
      
      await supabase
        .from('answers')
        .update({
          ai_suggestions: aiSuggestions,
          ai_suggested_code: aiSuggestions.suggestions[0]?.code_name || null
        })
        .eq('id', answers[i].id);

      processed++;
    } catch (error) {
      console.error(`Failed to update answer ${answers[i].id}:`, error);
      errors++;
    }
  }

  console.log(`✅ Processed: ${processed}, Errors: ${errors}`);
  return { processed, errors };
}
```

---

### Step 4: Auto-Confirm High Confidence

```typescript
/**
 * Auto-confirm answers with high confidence suggestions
 */
export async function autoConfirmHighConfidence(
  categoryId: number,
  confidenceThreshold: number = 0.95
): Promise<{ confirmed: number; total: number }> {
  // 1. Get high-confidence suggestions from database
  const { data: suggestions } = await supabase
    .rpc('get_high_confidence_suggestions', {
      p_category_id: categoryId,
      p_min_confidence: confidenceThreshold,
      p_limit: 1000
    });

  if (!suggestions || suggestions.length === 0) {
    console.log('No high-confidence suggestions to confirm');
    return { confirmed: 0, total: 0 };
  }

  console.log(`🚀 Auto-confirming ${suggestions.length} high-confidence suggestions...`);

  let confirmed = 0;

  // 2. Update each answer
  for (const suggestion of suggestions) {
    try {
      // Update answer
      await supabase
        .from('answers')
        .update({
          selected_code: suggestion.suggested_code,
          quick_status: 'Confirmed',
          general_status: 'whitelist',
          coding_date: new Date().toISOString(),
          confirmed_by: 'AI Agent'
        })
        .eq('id', suggestion.answer_id);

      // Log to audit trail
      await supabase
        .from('ai_audit_log')
        .insert({
          answer_id: suggestion.answer_id,
          category_id: categoryId,
          answer_text: suggestion.answer_text,
          selected_code: suggestion.suggested_code,
          probability: suggestion.confidence,
          ai_model: suggestion.model,
          action: 'auto_confirm',
          metadata: {
            confidence_threshold: confidenceThreshold,
            reasoning: suggestion.reasoning
          }
        });

      confirmed++;
    } catch (error) {
      console.error(`Failed to confirm answer ${suggestion.answer_id}:`, error);
    }
  }

  console.log(`✅ Auto-confirmed ${confirmed} out of ${suggestions.length} answers`);
  return { confirmed, total: suggestions.length };
}
```

---

### Step 5: React Hook for UI

```typescript
// src/hooks/useAiCategorization.ts
import { useState } from 'react';
import { categorizeAndStoreAnswer, batchCategorizeCategoryAnswers } from '@/services/aiCategorization';
import { validateOpenAIConfig } from '@/lib/openai';

export function useAiCategorization() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = validateOpenAIConfig();

  const categorizeSingle = async (answerId: number) => {
    if (!isConfigured) {
      setError('OpenAI API key not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await categorizeAndStoreAnswer(answerId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Categorization failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const categorizeBatch = async (categoryId: number, limit: number = 100) => {
    if (!isConfigured) {
      setError('OpenAI API key not configured');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await batchCategorizeCategoryAnswers(categoryId, limit);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch categorization failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    categorizeSingle,
    categorizeBatch,
    loading,
    error,
    isConfigured
  };
}
```

---

### Step 6: UI Component

```tsx
// src/components/AiCategorizationButton.tsx
import { useState } from 'react';
import { useAiCategorization } from '@/hooks/useAiCategorization';
import type { Answer } from '@/types';

interface Props {
  answer: Answer;
  onSuccess?: () => void;
}

export function AiCategorizationButton({ answer, onSuccess }: Props) {
  const { categorizeSingle, loading, error, isConfigured } = useAiCategorization();
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleCategorize = async () => {
    const success = await categorizeSingle(answer.id);
    if (success) {
      setShowSuggestions(true);
      onSuccess?.();
    }
  };

  if (!isConfigured) {
    return (
      <div className="text-sm text-red-600">
        ⚠️ OpenAI API key not configured
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleCategorize}
        disabled={loading}
        className="btn-primary flex items-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin">⚙️</span>
            Thinking...
          </>
        ) : (
          <>
            🤖 Get AI Suggestion
          </>
        )}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {showSuggestions && answer.ai_suggestions && (
        <div className="mt-4 space-y-2">
          <h4 className="font-semibold">AI Suggestions:</h4>
          {answer.ai_suggestions.suggestions.map((s, idx) => (
            <div key={idx} className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium">{s.code_name}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  s.confidence > 0.9 ? 'bg-green-100 text-green-800' :
                  s.confidence > 0.7 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {(s.confidence * 100).toFixed(0)}% confident
                </span>
              </div>
              <p className="text-sm text-gray-600">{s.reasoning}</p>
            </div>
          ))}
          <p className="text-xs text-gray-500">
            Model: {answer.ai_suggestions.model} • 
            Generated: {new Date(answer.ai_suggestions.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

### Step 7: Batch Processing UI

```tsx
// src/components/BatchAiCategorization.tsx
import { useState } from 'react';
import { useAiCategorization } from '@/hooks/useAiCategorization';

interface Props {
  categoryId: number;
  categoryName: string;
}

export function BatchAiCategorization({ categoryId, categoryName }: Props) {
  const { categorizeBatch, loading, error, isConfigured } = useAiCategorization();
  const [result, setResult] = useState<{ processed: number; errors: number } | null>(null);
  const [limit, setLimit] = useState(100);

  const handleBatchProcess = async () => {
    const batchResult = await categorizeBatch(categoryId, limit);
    setResult(batchResult);
  };

  if (!isConfigured) {
    return (
      <div className="bg-red-50 p-4 rounded border border-red-200">
        <p className="text-red-800">
          ⚠️ OpenAI API key not configured. Add VITE_OPENAI_API_KEY to .env
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">
        🤖 AI Batch Categorization: {categoryName}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Number of answers to process:
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            min={1}
            max={1000}
            className="border rounded px-3 py-2 w-32"
          />
        </div>

        <button
          onClick={handleBatchProcess}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <>
              <span className="animate-spin">⚙️</span>
              Processing...
            </>
          ) : (
            `Process ${limit} Answers`
          )}
        </button>

        {error && (
          <div className="bg-red-50 p-3 rounded border border-red-200">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 p-4 rounded border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">✅ Batch Complete</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Processed: {result.processed} answers</li>
              <li>• Errors: {result.errors}</li>
              <li>• Success rate: {
                ((result.processed / (result.processed + result.errors)) * 100).toFixed(1)
              }%</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Testing the Complete Workflow

### 1. Manual Test in Console

```javascript
// Open browser console on your app

// Test single answer
import { categorizeAndStoreAnswer } from './src/services/aiCategorization';
await categorizeAndStoreAnswer(1);

// Check database
const { data } = await supabase
  .from('answers')
  .select('id, answer_text, ai_suggestions, ai_suggested_code')
  .eq('id', 1)
  .single();

console.log(data);
```

---

### 2. Test Batch Processing

```javascript
// Process 10 answers
import { batchCategorizeCategoryAnswers } from './src/services/aiCategorization';
const result = await batchCategorizeCategoryAnswers(1, 10);
console.log(result); // { processed: 10, errors: 0 }
```

---

### 3. Test Auto-Confirm

```javascript
// Auto-confirm high confidence
import { autoConfirmHighConfidence } from './src/services/aiCategorization';
const result = await autoConfirmHighConfidence(1, 0.95);
console.log(result); // { confirmed: 5, total: 5 }
```

---

### 4. Verify in Database

```sql
-- Check AI suggestions
SELECT 
  id,
  answer_text,
  ai_suggested_code,
  ai_suggestions->>'model' as model,
  jsonb_array_length(ai_suggestions->'suggestions') as num_suggestions
FROM answers
WHERE ai_suggestions IS NOT NULL
LIMIT 10;

-- Check auto-confirmations
SELECT * FROM ai_audit_log 
WHERE action = 'auto_confirm'
ORDER BY confirmed_at DESC
LIMIT 20;

-- Get accuracy stats
SELECT * FROM get_ai_suggestion_accuracy(1, 30);
```

---

## Complete Example: Full Page Component

```tsx
// src/pages/AiCategorizationPage.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AiCategorizationButton } from '@/components/AiCategorizationButton';
import { BatchAiCategorization } from '@/components/BatchAiCategorization';

export function AiCategorizationPage() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadAnswers(selectedCategory.id);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    setCategories(data || []);
  };

  const loadAnswers = async (categoryId) => {
    const { data } = await supabase
      .from('answers')
      .select('*')
      .eq('category_id', categoryId)
      .is('selected_code', null)
      .limit(20);
    setAnswers(data || []);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🤖 AI Categorization</h1>

      {/* Category Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">
          Select Category:
        </label>
        <select
          onChange={(e) => {
            const cat = categories.find(c => c.id === Number(e.target.value));
            setSelectedCategory(cat);
          }}
          className="border rounded px-3 py-2"
        >
          <option value="">Choose...</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Batch Processing */}
      {selectedCategory && (
        <div className="mb-8">
          <BatchAiCategorization
            categoryId={selectedCategory.id}
            categoryName={selectedCategory.name}
          />
        </div>
      )}

      {/* Individual Answers */}
      {answers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Uncoded Answers ({answers.length})
          </h2>
          {answers.map(answer => (
            <div key={answer.id} className="bg-white p-4 rounded shadow">
              <p className="mb-3">{answer.answer_text}</p>
              <AiCategorizationButton
                answer={answer}
                onSuccess={() => loadAnswers(selectedCategory.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Summary

This complete workflow shows:

✅ **Database integration** - Store AI suggestions in JSONB column  
✅ **OpenAI API calls** - Single and batch processing  
✅ **Error handling** - Robust error management  
✅ **Type safety** - Full TypeScript types  
✅ **UI components** - React components for user interaction  
✅ **Audit logging** - Track auto-confirmations  
✅ **Analytics** - Query AI performance  

**Ready to use in production!** 🚀


