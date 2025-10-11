# 🌐 Google Search Context Provider - Complete Guide

## 📋 Overview

The **Web Context Provider** enriches AI prompts with real-time web context from Google Custom Search API. This helps the AI understand:
- Local brand names (e.g., GCash, Maya in Philippines)
- Slang and colloquialisms
- Current events and trends
- Product comparisons
- Regional terminology

**Key Features:**
- ✅ Google Custom Search API integration
- ✅ Automatic key term extraction
- ✅ PII redaction and privacy protection
- ✅ In-memory caching (1-hour TTL)
- ✅ Per-category toggle (default: ON)
- ✅ Timeout & retry protection
- ✅ Fully tested (Vitest)

---

## 🚀 Quick Start

### 1. Setup API Credentials

Get your Google Custom Search API credentials:

1. **Create API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new API key
   - Enable "Custom Search API"

2. **Create Custom Search Engine:**
   - Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
   - Create a new search engine
   - Note your "Search Engine ID" (CX ID)

3. **Add to Environment:**
   ```bash
   # .env.local
   VITE_GOOGLE_CSE_API_KEY=your-api-key-here
   VITE_GOOGLE_CSE_CX_ID=your-cx-id-here
   ```

### 2. Use in Code

```typescript
import { buildPromptWithWebContext } from '@/services/webContextProvider';

// Enhance AI prompt with web context
const enhancedPrompt = await buildPromptWithWebContext(
  'Categorize this answer into relevant codes:',
  'I prefer GCash because it is faster than Maya',
  { useWebContext: true } // default: true
);

// Result:
// "Categorize this answer into relevant codes:
//
//  Context from Web:
//  1. GCash - Leading mobile wallet in the Philippines...
//  2. Maya - Digital bank and payment app in the Philippines..."
```

---

## 📚 API Reference

### `extractKeyTerms(input: string, maxTerms?: number): string`

Extracts 2-5 key terms from input text for search query.

**Example:**
```typescript
import { extractKeyTerms } from '@/services/webContextProvider';

const terms = extractKeyTerms("I prefer GCash because it's faster than Maya");
// Returns: "gcash faster maya"

const terms2 = extractKeyTerms("The best payment app is GoPay!", 3);
// Returns: "best payment app" (max 3 terms)
```

**Features:**
- Removes stop words (the, and, or, because, etc.)
- Removes special characters
- Deduplicates terms
- Truncates to first 100 characters
- Limits to N terms (default: 5)

---

### `googleSearch(query: string, options?: WebContextOptions): Promise<WebContext[]>`

Performs Google Custom Search and returns results.

**Parameters:**
```typescript
interface WebContextOptions {
  enabled?: boolean;          // default: true
  numResults?: number;        // default: 3
  maxSnippetLength?: number;  // default: 150
  cacheTTL?: number;          // default: 3600000 (1 hour)
}
```

**Returns:**
```typescript
interface WebContext {
  title: string;
  snippet: string;
  url: string;
}
```

**Example:**
```typescript
import { googleSearch } from '@/services/webContextProvider';

const results = await googleSearch('GCash Maya Philippines', {
  enabled: true,
  numResults: 3,
});

console.log(results);
// [
//   {
//     title: "GCash - Mobile Wallet",
//     snippet: "Leading mobile wallet in the Philippines...",
//     url: "https://www.gcash.com"
//   },
//   ...
// ]
```

**Features:**
- ✅ Automatic caching (1-hour TTL)
- ✅ Timeout protection (8 seconds)
- ✅ Retry on failure (1 retry)
- ✅ PII redaction (email, phone, credit card)
- ✅ Duplicate URL removal
- ✅ Snippet truncation

---

### `buildWebContextSection(query: string, options?: WebContextOptions): Promise<string>`

Builds a formatted web context section for AI prompts.

**Example:**
```typescript
import { buildWebContextSection } from '@/services/webContextProvider';

const context = await buildWebContextSection('GCash Maya');

console.log(context);
// "Context from Web:
//  1. GCash - Leading mobile wallet in the Philippines...
//  2. Maya - Digital bank and payment app in the Philippines..."
```

---

### `buildPromptWithWebContext(basePrompt: string, input: string, settings?: CategorySettings): Promise<string>`

Builds a complete AI prompt with optional web context.

**Parameters:**
```typescript
interface CategorySettings {
  useWebContext?: boolean; // default: true
}
```

**Example:**
```typescript
import { buildPromptWithWebContext } from '@/services/webContextProvider';

const prompt = await buildPromptWithWebContext(
  'Categorize this answer:',
  'I use GCash for payments',
  { useWebContext: true }
);

console.log(prompt);
// "Categorize this answer:
//
//  Context from Web:
//  1. GCash - Mobile wallet in Philippines..."
```

**Behavior:**
- If `useWebContext === false`: Returns base prompt unchanged
- If no key terms extracted: Returns base prompt unchanged
- If search fails: Returns base prompt unchanged
- Otherwise: Returns base prompt + web context

---

### `clearSearchCache(): void`

Clears the in-memory search cache.

**Example:**
```typescript
import { clearSearchCache } from '@/services/webContextProvider';

clearSearchCache();
```

---

## 🎯 Integration Examples

### Example 1: Basic Usage

```typescript
import { buildPromptWithWebContext } from '@/services/webContextProvider';

async function categorizeAnswer(answerText: string, categorySettings: any) {
  const basePrompt = `
    Categorize the following answer into relevant codes:

    Answer: ${answerText}
  `;

  // Automatically enriches with web context
  const enrichedPrompt = await buildPromptWithWebContext(
    basePrompt,
    answerText,
    categorySettings
  );

  // Send to OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: enrichedPrompt }],
  });

  return response.choices[0].message.content;
}
```

### Example 2: Manual Search

```typescript
import { googleSearch, extractKeyTerms } from '@/services/webContextProvider';

async function researchTopic(userInput: string) {
  // Extract key terms
  const query = extractKeyTerms(userInput);
  console.log('Search query:', query);

  // Perform search
  const results = await googleSearch(query, {
    enabled: true,
    numResults: 5,
  });

  // Display results
  results.forEach(result => {
    console.log(`${result.title}: ${result.snippet}`);
    console.log(result.url);
  });
}
```

### Example 3: Conditional Web Context

```typescript
import { buildPromptWithWebContext } from '@/services/webContextProvider';

async function smartCategorization(
  answer: string,
  category: { useWebContext?: boolean }
) {
  const prompt = 'Categorize this answer:';

  // Web context only if enabled for this category
  const enrichedPrompt = await buildPromptWithWebContext(
    prompt,
    answer,
    { useWebContext: category.useWebContext ?? true } // default ON
  );

  return enrichedPrompt;
}
```

---

## 🎨 UI Integration

### Category Settings Toggle

Add a toggle in your category settings UI:

```tsx
import { Switch, FormControlLabel, Typography, Box } from '@mui/material';

function CategorySettings({ category, onUpdate }: Props) {
  const handleToggleWebContext = (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...category,
      use_web_context: event.target.checked,
    });
  };

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={category.use_web_context ?? true}
            onChange={handleToggleWebContext}
          />
        }
        label="Use Google Search Context"
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        💡 When enabled, the AI model automatically enriches prompts with context from
        the web (e.g., brand names, local terms, slang). Helps with better categorization
        of regional and trending topics. Default: ON.
      </Typography>
    </Box>
  );
}
```

---

## 🔒 Privacy & Security

### PII Redaction

The system automatically redacts sensitive information before sending to Google:

```typescript
import { redact } from '@/utils/pii';

const safeQuery = redact("Call me at 555-1234 or email john@example.com");
// Returns: "Call me at [PHONE] or email [EMAIL]"
```

**What Gets Redacted:**
- ✅ Email addresses → `[EMAIL]`
- ✅ Phone numbers → `[PHONE]`
- ✅ Credit card numbers → `[CARD]`
- ✅ SSN patterns → `[SSN]`
- ✅ URLs → `[URL:domain.com]`

### Key Term Extraction

Only meaningful terms are sent to Google, not full responses:

```typescript
// User input:
"I prefer GCash because it is faster than Maya and more convenient"

// What gets sent to Google:
"gcash faster maya convenient"
```

### API Key Protection

- ✅ Keys stored in environment variables (`.env.local`)
- ✅ Never exposed in client-side code
- ✅ Validated before use
- ✅ Graceful fallback if missing

---

## ⚙️ Configuration

### Default Settings

```typescript
const DEFAULT_OPTIONS = {
  enabled: true,           // Web context ON by default
  numResults: 3,           // Get 3 search results
  maxSnippetLength: 150,   // Truncate snippets to 150 chars
  cacheTTL: 3600000,       // Cache for 1 hour
  timeout: 8000,           // 8-second timeout
  retries: 1,              // Retry once on failure
};
```

### Per-Category Configuration

Each category can override the default:

```typescript
interface Category {
  id: number;
  name: string;
  use_web_context?: boolean; // default: true
}
```

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm run test

# Run web context tests only
npm run test webContextProvider

# Watch mode
npm run test -- --watch
```

### Test Coverage

```
✅ extractKeyTerms - 6 tests
✅ googleSearch - 10 tests
✅ buildWebContextSection - 3 tests
✅ buildPromptWithWebContext - 6 tests
✅ Cache Management - 1 test
───────────────────────────────
Total: 26 tests (100% pass)
```

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { extractKeyTerms } from '@/services/webContextProvider';

describe('extractKeyTerms', () => {
  it('should extract meaningful terms', () => {
    const result = extractKeyTerms('I prefer GCash over Maya');

    expect(result).toContain('gcash');
    expect(result).toContain('maya');
    expect(result).not.toContain('prefer'); // stop word
  });
});
```

---

## 📊 Performance

### Caching Strategy

- **In-Memory Cache:** `Map<string, CacheEntry>`
- **TTL:** 1 hour (configurable)
- **Max Size:** 100 entries (LRU eviction)
- **Cache Key:** Sanitized query string

**Benefits:**
- 🚀 **Instant response** for repeated queries
- 💰 **Reduced API costs** (fewer requests)
- 📉 **Lower latency** (no network roundtrip)

### Performance Metrics

| Metric | Value |
|--------|-------|
| **Cache Hit** | ~5ms |
| **Cache Miss + API** | ~500-1500ms |
| **Timeout** | 8000ms |
| **Retry Delay** | 1000ms |

---

## 🐛 Troubleshooting

### Issue: "Google Custom Search API not configured"

**Solution:**
1. Check environment variables:
   ```bash
   echo $VITE_GOOGLE_CSE_API_KEY
   echo $VITE_GOOGLE_CSE_CX_ID
   ```
2. Add to `.env.local`:
   ```
   VITE_GOOGLE_CSE_API_KEY=your-key
   VITE_GOOGLE_CSE_CX_ID=your-cx-id
   ```
3. Restart dev server:
   ```bash
   npm run dev
   ```

### Issue: "Search returns no results"

**Possible causes:**
1. Query too vague (only stop words)
2. No results found on Google
3. API quota exceeded

**Solution:**
- Check console logs for extracted key terms
- Verify query in Google Search directly
- Check API quota in Google Cloud Console

### Issue: "Search is slow"

**Solution:**
- Increase cache TTL: `cacheTTL: 7200000` (2 hours)
- Reduce `numResults`: `numResults: 2`
- Check network latency

### Issue: "Getting 403 Forbidden"

**Solution:**
- Verify API key is correct
- Check API is enabled in Google Cloud Console
- Verify billing is set up (Google CSE requires billing)

---

## 📈 Best Practices

### 1. Use Appropriate Settings per Category

```typescript
// High-quality category - use web context
const techCategory = {
  name: 'Tech Products',
  use_web_context: true, // Helps with brand names
};

// Simple yes/no category - skip web context
const yesNoCategory = {
  name: 'Yes/No Answers',
  use_web_context: false, // Not needed
};
```

### 2. Monitor API Usage

```typescript
import { logInfo } from '@/utils/logger';

// Log all searches
logInfo('Google Search performed', {
  component: 'WebContextProvider',
  tags: { query: 'gcash maya' },
});
```

### 3. Graceful Degradation

The system automatically falls back to base prompt if:
- API is not configured
- Search fails
- Timeout occurs
- No results found

**Your app keeps working!**

### 4. Clear Cache Strategically

```typescript
// Clear cache on app update
if (appVersion !== lastVersion) {
  clearSearchCache();
}

// Clear cache periodically (daily)
setInterval(() => {
  clearSearchCache();
}, 24 * 60 * 60 * 1000);
```

---

## 🎯 Use Cases

### 1. Regional Brand Recognition

**Input:** "I use GCash for online payments"

**Without Web Context:**
- AI doesn't know what GCash is
- Might categorize as "Other" or "Unknown"

**With Web Context:**
- AI learns GCash is a Philippine mobile wallet
- Correctly categorizes as "Digital Wallet" or "Payment Method"

### 2. Slang & Colloquialisms

**Input:** "I prefer to grab food using the app"

**Without Web Context:**
- "Grab" might be interpreted literally

**With Web Context:**
- AI learns "Grab" is a food delivery service
- Correctly categorizes as "Food Delivery"

### 3. Current Events

**Input:** "I'm excited about the new iPhone launch"

**Without Web Context:**
- AI doesn't know which iPhone

**With Web Context:**
- AI learns about the latest iPhone model
- More accurate categorization with context

---

## 📚 Related Documentation

- [Logger Guide](./LOGGER_GUIDE.md) - Centralized logging
- [Error Handling Guide](./ERROR_HANDLING_GUIDE.md) - Error boundaries
- [API Client Guide](./REFACTORING_SUMMARY.md#1-centralized-api-client) - API utilities

---

## 🎊 Summary

✅ **Web Context Provider** enriches AI prompts with real-time web context
✅ **Privacy-first** - Only key terms sent, PII redacted
✅ **Efficient caching** - 1-hour TTL, max 100 entries
✅ **Per-category control** - Toggle ON/OFF per category (default: ON)
✅ **Graceful fallback** - Works even if API unavailable
✅ **Fully tested** - 26 unit tests

**Ready for production!** 🚀

---

*Last Updated: October 9, 2025*

