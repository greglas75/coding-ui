# 🤖 API & Hooks - COMPLETE ✅

**Date:** October 7, 2025  
**Status:** ✅ READY FOR USE

---

## What Was Done

### 1. ✅ API Layer Created

**File:** `src/api/categorize.ts`

Complete API layer with 4 main functions:

| Function | Purpose | Returns |
|----------|---------|---------|
| `categorizeSingleAnswer()` | Categorize one answer | AI suggestions array |
| `categorizeBatchAnswers()` | Categorize multiple answers | Stats (processed, errors) |
| `categorizeCategoryAnswers()` | Categorize all uncoded in category | Stats (processed, errors) |
| `autoConfirmHighConfidence()` | Auto-confirm high confidence | Stats (confirmed, total) |

**Features:**
- ✅ Full TypeScript types
- ✅ Error handling & logging  
- ✅ Database integration
- ✅ Audit logging for auto-confirm
- ✅ Custom template support per category
- ✅ Progress tracking with console logs

---

### 2. ✅ React Query Hooks Created

**File:** `src/hooks/useCategorizeAnswer.ts`

5 hooks for different use cases:

#### Individual Hooks

| Hook | Use Case |
|------|----------|
| `useCategorizeAnswer()` | Single answer categorization |
| `useBatchCategorize()` | Multiple answers at once |
| `useCategorizeCategory()` | All uncoded in a category |
| `useAutoConfirm()` | Auto-confirm high confidence |
| `useAiCategorization()` | Combined - all functions |

**Features:**
- ✅ React Query integration
- ✅ Automatic cache invalidation
- ✅ Toast notifications (sonner)
- ✅ Loading states
- ✅ Error handling
- ✅ Success/error feedback

---

## Usage Examples

### Example 1: Single Answer Button

```tsx
import { useCategorizeAnswer } from '@/hooks/useCategorizeAnswer';

function AiButton({ answerId }: { answerId: number }) {
  const { mutate: categorize, isPending } = useCategorizeAnswer();

  return (
    <button 
      onClick={() => categorize(answerId)}
      disabled={isPending}
      className="btn-primary"
    >
      {isPending ? '🤖 Thinking...' : '🤖 Get AI Suggestion'}
    </button>
  );
}
```

**What happens:**
1. ✅ Shows loading toast: "🤖 Getting AI suggestions..."
2. ✅ Calls OpenAI API
3. ✅ Stores suggestions in database
4. ✅ Shows success toast with top suggestion
5. ✅ Refreshes UI automatically

---

### Example 2: Batch Categorization

```tsx
import { useBatchCategorize } from '@/hooks/useCategorizeAnswer';

function BatchButton({ answerIds }: { answerIds: number[] }) {
  const { mutate: batchCategorize, isPending } = useBatchCategorize();

  return (
    <button 
      onClick={() => batchCategorize(answerIds)}
      disabled={isPending}
    >
      {isPending 
        ? `Processing ${answerIds.length} answers...` 
        : `Batch Categorize (${answerIds.length})`
      }
    </button>
  );
}
```

**Result:**
- ✅ Processes all answers in parallel
- ✅ Shows summary: "Batch complete: 95 succeeded, 5 failed"
- ✅ Logs errors for debugging

---

### Example 3: Auto-Categorize Category

```tsx
import { useCategorizeCategory } from '@/hooks/useCategorizeAnswer';

function AutoCategorizeButton({ categoryId }: { categoryId: number }) {
  const { mutate: categorizeCategory, isPending } = useCategorizeCategory();

  return (
    <button 
      onClick={() => categorizeCategory({ categoryId, limit: 100 })}
      disabled={isPending}
    >
      {isPending ? 'Processing...' : 'Auto-Categorize 100 Answers'}
    </button>
  );
}
```

**Result:**
- ✅ Finds all uncoded answers in category
- ✅ Categorizes up to 100 answers
- ✅ Stores all suggestions
- ✅ Shows success rate

---

### Example 4: Auto-Confirm

```tsx
import { useAutoConfirm } from '@/hooks/useCategorizeAnswer';

function AutoConfirmButton({ categoryId }: { categoryId: number }) {
  const { mutate: autoConfirm, isPending } = useAutoConfirm();

  const handleAutoConfirm = () => {
    autoConfirm({ 
      categoryId, 
      threshold: 0.95  // 95% confidence
    });
  };

  return (
    <button onClick={handleAutoConfirm} disabled={isPending}>
      {isPending ? 'Confirming...' : 'Auto-Confirm (>95%)'}
    </button>
  );
}
```

**Result:**
- ✅ Finds all high-confidence suggestions
- ✅ Auto-confirms them (sets status, code, date)
- ✅ Logs to audit trail
- ✅ Shows count confirmed

---

### Example 5: Combined Hook (All Functions)

```tsx
import { useAiCategorization } from '@/hooks/useCategorizeAnswer';

function AiPanel({ categoryId }: { categoryId: number }) {
  const ai = useAiCategorization();

  return (
    <div className="space-y-4">
      <button 
        onClick={() => ai.categorizeSingle(1)}
        disabled={ai.isAnyPending}
      >
        Categorize Single
      </button>

      <button 
        onClick={() => ai.categorizeCategory(categoryId, 100)}
        disabled={ai.isAnyPending}
      >
        Auto-Process 100
      </button>

      <button 
        onClick={() => ai.autoConfirm(categoryId, 0.95)}
        disabled={ai.isAnyPending}
      >
        Auto-Confirm (>95%)
      </button>

      {ai.isAnyPending && <p>Processing...</p>}
    </div>
  );
}
```

---

## API Reference

### `categorizeSingleAnswer(answerId: number)`

**Parameters:**
- `answerId`: ID of answer to categorize

**Returns:**
```typescript
Promise<AiCodeSuggestion[]>

interface AiCodeSuggestion {
  code_id: string;
  code_name: string;
  confidence: number;
  reasoning: string;
}
```

**Side Effects:**
- Updates `answers.ai_suggestions` in database
- Updates `answers.ai_suggested_code` with top suggestion
- Invalidates React Query cache

---

### `categorizeBatchAnswers(answerIds: number[])`

**Parameters:**
- `answerIds`: Array of answer IDs

**Returns:**
```typescript
Promise<{
  processed: number;
  errors: number;
  errorDetails: Array<{
    answerId: number;
    error: string;
  }>;
}>
```

---

### `categorizeCategoryAnswers(categoryId: number, limit?: number)`

**Parameters:**
- `categoryId`: Category to process
- `limit`: Max answers (default: 100)

**Returns:** Same as `categorizeBatchAnswers`

---

### `autoConfirmHighConfidence(categoryId?: number, threshold?: number)`

**Parameters:**
- `categoryId`: Category ID or null for all (default: null)
- `threshold`: Min confidence 0.0-1.0 (default: 0.95)

**Returns:**
```typescript
Promise<{
  confirmed: number;
  total: number;
}>
```

**Side Effects:**
- Updates answer status to 'Confirmed'
- Sets `selected_code`, `coding_date`, `confirmed_by`
- Logs to `ai_audit_log` table

---

## Hook API

### useCategorizeAnswer()

```typescript
const { 
  mutate,        // Function to call
  mutateAsync,   // Async version
  isPending,     // Loading state
  error,         // Error object
  data           // Result data
} = useCategorizeAnswer();

// Usage
mutate(answerId);  // Fire and forget
await mutateAsync(answerId);  // Wait for result
```

---

### useAiCategorization() (Combined Hook)

```typescript
const ai = useAiCategorization();

// All functions
ai.categorizeSingle(answerId);
ai.batchCategorize([1, 2, 3]);
ai.categorizeCategory(categoryId, 100);
ai.autoConfirm(categoryId, 0.95);

// Async versions
await ai.categorizeSingleAsync(answerId);
await ai.batchCategorizeAsync([1, 2, 3]);

// States
ai.isCategorizing     // Single answer loading
ai.isBatchCategorizing // Batch loading
ai.isCategoryProcessing // Category loading
ai.isAutoConfirming   // Auto-confirm loading
ai.isAnyPending       // Any operation loading

// Errors
ai.categorizeError
ai.batchError
ai.categoryError
ai.autoConfirmError
```

---

## Toast Notifications

All hooks show automatic toast notifications:

### Success Toasts

✅ "Got 3 AI suggestions!"  
✅ "Successfully categorized all 100 answers!"  
✅ "Auto-confirmed 45 out of 50 suggestions!"

### Loading Toasts

🤖 "Getting AI suggestions..."  
🤖 "Categorizing 100 answers..."  
🚀 "Auto-confirming high-confidence suggestions..."

### Error Toasts

❌ "Failed to generate AI suggestions"  
⚠️ "Batch complete: 95 succeeded, 5 failed"  
ℹ️ "No uncoded answers found to categorize"

---

## Integration with Existing Code

### Add to AnswerTable Component

```tsx
// src/components/AnswerTable.tsx
import { useCategorizeAnswer } from '@/hooks/useCategorizeAnswer';

export function AnswerTable() {
  const { mutate: categorize, isPending } = useCategorizeAnswer();

  return (
    <table>
      <tbody>
        {answers.map(answer => (
          <tr key={answer.id}>
            <td>{answer.answer_text}</td>
            <td>
              <button 
                onClick={() => categorize(answer.id)}
                disabled={isPending}
              >
                🤖 AI Suggest
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### Add to Category Page

```tsx
// src/pages/CategoriesPage.tsx
import { useCategorizeCategory, useAutoConfirm } from '@/hooks/useCategorizeAnswer';

export function CategoriesPage() {
  const categorize = useCategorizeCategory();
  const autoConfirm = useAutoConfirm();

  return (
    <div>
      <button onClick={() => categorize.mutate({ categoryId: 1, limit: 100 })}>
        🤖 Auto-Categorize 100
      </button>
      
      <button onClick={() => autoConfirm.mutate({ categoryId: 1, threshold: 0.95 })}>
        🚀 Auto-Confirm (>95%)
      </button>
    </div>
  );
}
```

---

## Error Handling

All hooks handle errors automatically:

```typescript
const { mutate, error } = useCategorizeAnswer();

// Error is automatically shown in toast
// But you can also access it:
useEffect(() => {
  if (error) {
    console.error('Categorization failed:', error);
    // Custom error handling
  }
}, [error]);
```

---

## Testing

### Manual Testing

```typescript
// In browser console
import { categorizeSingleAnswer } from './src/api/categorize';

// Test single answer
const result = await categorizeSingleAnswer(1);
console.log(result);

// Check database
const { data } = await supabase
  .from('answers')
  .select('ai_suggestions')
  .eq('id', 1)
  .single();

console.log(data.ai_suggestions);
```

---

### Unit Test Example

```typescript
// src/api/__tests__/categorize.test.ts
import { describe, it, expect, vi } from 'vitest';
import { categorizeSingleAnswer } from '../categorize';

describe('categorizeSingleAnswer', () => {
  it('categorizes answer and stores in database', async () => {
    const suggestions = await categorizeSingleAnswer(1);
    
    expect(suggestions).toBeInstanceOf(Array);
    expect(suggestions[0]).toHaveProperty('code_name');
    expect(suggestions[0]).toHaveProperty('confidence');
    expect(suggestions[0].confidence).toBeGreaterThan(0);
    expect(suggestions[0].confidence).toBeLessThanOrEqual(1);
  });
});
```

---

## Files Created

| File | Lines | Description |
|------|-------|-------------|
| `src/api/categorize.ts` | 256 | Complete API layer |
| `src/hooks/useCategorizeAnswer.ts` | 303 | 5 React Query hooks |

---

## Dependencies Used

- `@tanstack/react-query` - Mutations & cache
- `sonner` - Toast notifications
- `@supabase/supabase-js` - Database operations
- `openai` - AI categorization

---

## Next Steps

### Immediate (Implement UI)

1. 🔜 Add "Get AI Suggestion" button to AnswerTable
2. 🔜 Add "Auto-Categorize" button to CategoryDetails
3. 🔜 Add "Auto-Confirm" panel to CodingPage
4. 🔜 Display AI suggestions in modal/panel

### Short-term (Enhance)

5. 🔜 Add progress bar for batch operations
6. 🔜 Add confirmation modal before auto-confirm
7. 🔜 Add settings panel for confidence threshold
8. 🔜 Show AI suggestion badges in table

### Long-term (Advanced)

9. 🔜 Add analytics dashboard for AI performance
10. 🔜 Add A/B testing for different models
11. 🔜 Add feedback mechanism (thumbs up/down)
12. 🔜 Add custom templates per category

---

## Success Criteria

- [x] API layer created with 4 functions
- [x] 5 React Query hooks implemented
- [x] Toast notifications integrated
- [x] Error handling complete
- [x] TypeScript types correct
- [x] No linter errors
- [ ] UI components integrated (next step)
- [ ] Manual testing complete
- [ ] E2E tests added

---

## Quick Reference

### Import Hooks

```typescript
import { 
  useCategorizeAnswer,      // Single
  useBatchCategorize,       // Batch
  useCategorizeCategory,    // Category
  useAutoConfirm,           // Auto-confirm
  useAiCategorization       // All-in-one
} from '@/hooks/useCategorizeAnswer';
```

### Import API

```typescript
import { 
  categorizeSingleAnswer,
  categorizeBatchAnswers,
  categorizeCategoryAnswers,
  autoConfirmHighConfidence
} from '@/api/categorize';
```

### Basic Pattern

```tsx
function MyComponent() {
  const { mutate, isPending, error } = useCategorizeAnswer();

  return (
    <button onClick={() => mutate(answerId)} disabled={isPending}>
      {isPending ? 'Processing...' : 'Categorize'}
    </button>
  );
}
```

---

## Summary

You now have a complete API and hooks layer for AI categorization:

✅ **4 API functions** for all categorization scenarios  
✅ **5 React Query hooks** with loading states & errors  
✅ **Automatic toast notifications** for user feedback  
✅ **Cache invalidation** to keep UI fresh  
✅ **Audit logging** for auto-confirmations  
✅ **Full TypeScript** type safety  
✅ **Error handling** at every level  

**Ready to integrate into UI components!** 🚀

---

**Next:** Add buttons to UI components and test the complete workflow!


