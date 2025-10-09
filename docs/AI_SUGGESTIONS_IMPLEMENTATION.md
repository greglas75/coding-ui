# 🤖 AI Suggestions Implementation Guide

## Overview

The AI Suggestions feature allows the system to store multiple AI-generated code suggestions with confidence scores for each answer. This enables advanced features like:

- **Multi-code suggestions** with confidence rankings
- **Reasoning tracking** for each suggestion
- **Model versioning** to track which AI model made suggestions
- **Accuracy analytics** to compare AI suggestions vs. user selections
- **Auto-confirmation** of high-confidence suggestions

---

## Database Schema

### New Column

Added to `answers` table:

```sql
ai_suggestions JSONB
```

### JSONB Structure

```json
{
  "suggestions": [
    {
      "code_id": "123",
      "code_name": "Nike",
      "confidence": 0.95,
      "reasoning": "User explicitly mentioned 'nike sneakers' in their response"
    },
    {
      "code_id": "456",
      "code_name": "Adidas",
      "confidence": 0.72,
      "reasoning": "Secondary brand mentioned as alternative"
    }
  ],
  "model": "gpt-4.1-nano",
  "timestamp": "2025-10-07T12:00:00Z",
  "preset_used": "LLM Brand List"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `suggestions` | Array | List of AI-suggested codes with metadata |
| `suggestions[].code_id` | String | UUID or ID of the suggested code |
| `suggestions[].code_name` | String | Display name of the code (e.g., "Nike") |
| `suggestions[].confidence` | Number | Confidence score from 0.0 to 1.0 |
| `suggestions[].reasoning` | String | AI's explanation for this suggestion |
| `model` | String | AI model identifier (e.g., "gpt-4.1-nano") |
| `timestamp` | String | ISO 8601 timestamp when suggestions were generated |
| `preset_used` | String | Name of the prompt/preset used |

---

## TypeScript Types

Updated `src/types.ts`:

```typescript
export interface AiCodeSuggestion {
  code_id: string;
  code_name: string;
  confidence: number; // 0.0 to 1.0
  reasoning: string;
}

export interface AiSuggestions {
  suggestions: AiCodeSuggestion[];
  model: string;
  timestamp: string;
  preset_used: string;
}

export interface Answer {
  // ... existing fields ...
  ai_suggestions: AiSuggestions | null;
}
```

---

## Migration

### Apply Migration

```bash
# Run this SQL file in Supabase SQL Editor or via CLI
psql -f docs/sql/2025-10-07-add-ai-suggestions.sql
```

### Rollback (if needed)

```sql
ALTER TABLE answers DROP COLUMN ai_suggestions;
DROP INDEX IF EXISTS idx_answers_ai_suggestions;
DROP INDEX IF EXISTS idx_answers_ai_suggestions_model;
```

---

## Usage Examples

### 1. Store AI Suggestions

```typescript
// Example: Update answer with AI suggestions
const aiSuggestions: AiSuggestions = {
  suggestions: [
    {
      code_id: "123",
      code_name: "Nike",
      confidence: 0.95,
      reasoning: "User explicitly mentioned 'nike sneakers'"
    },
    {
      code_id: "456",
      code_name: "Adidas",
      confidence: 0.75,
      reasoning: "Alternative brand mentioned"
    }
  ],
  model: "gpt-4.1-nano",
  timestamp: new Date().toISOString(),
  preset_used: "LLM Brand List"
};

await supabase
  .from('answers')
  .update({ 
    ai_suggestions: aiSuggestions,
    ai_suggested_code: aiSuggestions.suggestions[0].code_name
  })
  .eq('id', answerId);
```

### 2. Query High-Confidence Suggestions

```typescript
// Get answers with high-confidence suggestions (>85%)
const { data: highConfidenceSuggestions } = await supabase
  .rpc('get_high_confidence_suggestions', {
    p_category_id: 1,
    p_min_confidence: 0.85,
    p_limit: 100
  });
```

### 3. Display Suggestions in UI

```tsx
// Component to display AI suggestions
function AiSuggestionsPanel({ answer }: { answer: Answer }) {
  if (!answer.ai_suggestions) return null;

  const { suggestions, model, timestamp } = answer.ai_suggestions;

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="font-semibold mb-2">🤖 AI Suggestions</h3>
      <p className="text-xs text-gray-500 mb-3">
        Model: {model} • Generated: {new Date(timestamp).toLocaleString()}
      </p>
      
      <div className="space-y-2">
        {suggestions.map((suggestion, idx) => (
          <div key={idx} className="bg-white p-3 rounded border">
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium">{suggestion.code_name}</span>
              <span className={`px-2 py-1 rounded text-xs ${
                suggestion.confidence > 0.9 ? 'bg-green-100 text-green-800' :
                suggestion.confidence > 0.7 ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {(suggestion.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
            <p className="text-sm text-gray-600">{suggestion.reasoning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Auto-Confirm High-Confidence Suggestions

```typescript
// Auto-confirm suggestions above threshold
async function autoConfirmHighConfidence(categoryId: number, threshold: number = 0.95) {
  const { data: suggestions } = await supabase
    .rpc('get_high_confidence_suggestions', {
      p_category_id: categoryId,
      p_min_confidence: threshold,
      p_limit: 1000
    });

  for (const suggestion of suggestions || []) {
    // Update answer with auto-confirmed code
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
        action: 'auto_confirm'
      });
  }
}
```

---

## Analytics & Helper Functions

### Get AI Suggestion Accuracy

```sql
-- Compare AI suggestions vs. user selections
SELECT * FROM get_ai_suggestion_accuracy(1, 30);
```

Returns:
- `total_suggestions`: Total number of answers with AI suggestions
- `correct_suggestions`: How many AI suggestions matched user selection
- `accuracy_rate`: Percentage of correct suggestions
- `avg_confidence`: Average confidence of suggestions

### Get Top Suggested Codes

```sql
-- Get most frequently suggested codes
SELECT * FROM get_top_ai_suggested_codes(1, 20);
```

### Get Recent High-Confidence Suggestions

```sql
-- Get answers needing review
SELECT * FROM get_high_confidence_suggestions(1, 0.85, 100);
```

---

## Integration with Existing Features

### 1. Answer Table Display

Add a badge/indicator for answers with AI suggestions:

```tsx
{answer.ai_suggestions && (
  <Badge className="bg-blue-100 text-blue-800">
    🤖 AI Suggested ({answer.ai_suggestions.suggestions.length})
  </Badge>
)}
```

### 2. Coding Modal

Show AI suggestions when user opens coding modal:

```tsx
function CodingModal({ answer }: { answer: Answer }) {
  const suggestions = answer.ai_suggestions?.suggestions || [];
  
  return (
    <Modal>
      {/* Existing code selection UI */}
      
      {suggestions.length > 0 && (
        <div className="mt-4">
          <h4>AI Suggestions</h4>
          {suggestions.map(s => (
            <button 
              onClick={() => selectCode(s.code_name)}
              className="suggestion-button"
            >
              {s.code_name} ({(s.confidence * 100).toFixed(0)}%)
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
```

### 3. Batch Processing

Process multiple answers with AI:

```typescript
async function batchProcessWithAI(answerIds: number[], preset: string) {
  const results = await Promise.all(
    answerIds.map(id => generateAISuggestions(id, preset))
  );
  
  // Bulk update
  await supabase
    .from('answers')
    .upsert(
      results.map((aiSuggestions, idx) => ({
        id: answerIds[idx],
        ai_suggestions: aiSuggestions,
        ai_suggested_code: aiSuggestions.suggestions[0].code_name
      }))
    );
}
```

---

## Performance Considerations

### Indexes

Two GIN indexes are created for efficient JSONB queries:

1. **General JSONB index**: For any JSONB operations
2. **Model path index**: For filtering by specific AI model

### Query Optimization

```sql
-- ✅ Efficient: Uses index
SELECT * FROM answers 
WHERE ai_suggestions->>'model' = 'gpt-4.1-nano';

-- ✅ Efficient: Uses JSONB operators
SELECT * FROM answers 
WHERE ai_suggestions @> '{"model": "gpt-4.1-nano"}'::jsonb;

-- ⚠️ Less efficient: Array element access without lateral join
SELECT * FROM answers 
WHERE (ai_suggestions->'suggestions'->0->>'confidence')::REAL > 0.9;
```

---

## Testing

### Unit Tests

```typescript
describe('AI Suggestions', () => {
  it('should store and retrieve AI suggestions', async () => {
    const suggestions: AiSuggestions = {
      suggestions: [{
        code_id: '123',
        code_name: 'Nike',
        confidence: 0.95,
        reasoning: 'Test reasoning'
      }],
      model: 'gpt-4.1-nano',
      timestamp: new Date().toISOString(),
      preset_used: 'Test Preset'
    };

    const { data } = await supabase
      .from('answers')
      .update({ ai_suggestions: suggestions })
      .eq('id', 1)
      .select()
      .single();

    expect(data.ai_suggestions).toEqual(suggestions);
  });
});
```

### E2E Tests

```typescript
test('displays AI suggestions in UI', async ({ page }) => {
  await page.goto('/coding?categoryId=1');
  
  // Should show AI suggestion badge
  await expect(page.getByText('🤖 AI Suggested')).toBeVisible();
  
  // Click to see suggestions
  await page.getByText('🤖 AI Suggested').click();
  
  // Should show confidence scores
  await expect(page.getByText(/\d+% confidence/)).toBeVisible();
});
```

---

## Monitoring & Maintenance

### Track Suggestion Quality

```sql
-- Weekly accuracy report
SELECT 
  DATE_TRUNC('week', a.updated_at) as week,
  COUNT(*) as total_suggestions,
  SUM(CASE WHEN a.selected_code = a.ai_suggested_code THEN 1 ELSE 0 END) as correct,
  ROUND(
    SUM(CASE WHEN a.selected_code = a.ai_suggested_code THEN 1 ELSE 0 END)::NUMERIC / 
    COUNT(*)::NUMERIC * 100, 
    2
  ) as accuracy_percentage
FROM answers a
WHERE 
  a.ai_suggestions IS NOT NULL
  AND a.selected_code IS NOT NULL
  AND a.updated_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', a.updated_at)
ORDER BY week DESC;
```

### Clean Up Old Suggestions

```sql
-- Remove suggestions older than 6 months (if needed)
UPDATE answers
SET ai_suggestions = NULL
WHERE 
  ai_suggestions IS NOT NULL
  AND (ai_suggestions->>'timestamp')::TIMESTAMPTZ < NOW() - INTERVAL '6 months';
```

---

## Next Steps

1. ✅ **Database schema updated** - `ai_suggestions` column added
2. ✅ **TypeScript types updated** - Full type safety
3. ✅ **Helper functions created** - Analytics & queries ready
4. 🔜 **UI Components** - Create `AiSuggestionsPanel` component
5. 🔜 **API Integration** - Connect to OpenAI/Claude API
6. 🔜 **Auto-Confirm Feature** - Implement batch auto-confirmation
7. 🔜 **Analytics Dashboard** - Show AI performance metrics

---

## Support & Questions

For issues or questions about AI suggestions:
- Check this documentation first
- Review SQL helper functions in migration file
- Check TypeScript types in `src/types.ts`
- Review example queries in migration file

---

**✅ AI Suggestions schema is now ready for use!**


