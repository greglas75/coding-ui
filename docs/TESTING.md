# 🧪 Testing Guide

**Last Updated:** October 23, 2025
**Coverage Target:** 80% unit, 70% integration, 100% E2E critical flows

---

## 📋 Test Infrastructure

### Frameworks Used

- **Unit & Integration:** Vitest 3.2.4 + React Testing Library
- **E2E:** Playwright 1.40.0 (286 tests)
- **Mocking:** MSW (Mock Service Worker) 2.0.0

---

## 🚀 Running Tests

```bash
# Unit tests (watch mode)
npm run test

# Unit tests (run once)
npm run test:run

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# All tests
npm run test:all
```

---

## 📁 Test Structure

```
src/
├── __tests__/
│   ├── lib/
│   │   ├── openai.test.ts ✅
│   │   ├── batchAIProcessor.test.ts ✅
│   │   └── performanceMonitor.test.ts
│   ├── hooks/
│   │   ├── useAcceptSuggestion.test.ts ✅
│   │   ├── useCategorizeAnswer.test.ts ✅
│   │   └── useFilters.test.ts
│   ├── api/
│   │   └── categorize.test.ts ✅
│   └── components/
│       ├── CodingGrid.test.tsx
│       └── FiltersBar.test.tsx
├── test/
│   ├── setup.ts ✅ (MSW configured)
│   └── mocks/
│       ├── handlers.ts ✅
│       └── server.ts ✅

tests/integration/
├── setup.ts ✅
└── categorization-workflow.test.ts ✅

e2e/
└── tests/ (286 existing tests) ✅
```

---

## ✅ Created Tests

### Unit Tests

- `lib/openai.test.ts` - 8 tests (API logic)
- `lib/batchAIProcessor.test.ts` - 10 tests (batch processing)
- `api/categorize.test.ts` - 3 tests (API layer)

### Hooks Tests

- `hooks/useAcceptSuggestion.test.ts` - 2 tests
- `hooks/useCategorizeAnswer.test.ts` - 2 tests

### Integration Tests

- `integration/categorization-workflow.test.ts` - 2 tests

---

## 🎯 Testing Strategy

### Unit Tests (60% of effort)

Test pure functions, utilities, hooks in isolation.

**Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { categorizeAnswer } from '@/lib/openai';

describe('categorizeAnswer', () => {
  it('should return suggestions', async () => {
    const result = await categorizeAnswer({
      answer: 'Nike shoes',
      categoryName: 'Brands',
      codes: [{ id: '1', name: 'Nike' }],
      context: {},
    });

    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests (30% of effort)

Test workflows across multiple components/services.

**Example:**

```typescript
describe('Categorization Workflow', () => {
  it('should complete full flow', async () => {
    const category = await createTestCategory();
    const answer = await createTestAnswer(category.id);

    // Categorize
    await categorizeSingleAnswer(answer.id);

    // Verify
    const { data } = await testSupabase
      .from('answers')
      .select('ai_suggestions')
      .eq('id', answer.id)
      .single();

    expect(data.ai_suggestions).toBeDefined();
  });
});
```

### E2E Tests (10% of effort)

Test critical user journeys in real browser.

**Existing:** 286 Playwright tests covering all major flows ✅

---

## 📊 Coverage Goals

| Type        | Target         | Current      | Status         |
| ----------- | -------------- | ------------ | -------------- |
| Unit Tests  | 80%            | ~15%         | 🔄 In Progress |
| Integration | 70%            | ~5%          | 🔄 In Progress |
| E2E         | Critical flows | ✅ 286 tests | ✅ Complete    |

---

## 🔧 MSW Mock Setup

### How it works

MSW intercepts HTTP requests and returns mock responses.

**Configuration:** `src/test/mocks/handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Supabase
  http.get('*/rest/v1/answers*', () => {
    return HttpResponse.json(mockAnswers);
  }),

  // Mock OpenAI
  http.post('*/v1/chat/completions', () => {
    return HttpResponse.json(mockOpenAIResponse);
  }),
];
```

### Adding new mocks

```typescript
// In handlers.ts
http.post('*/your-endpoint', async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json({ success: true });
}),
```

---

## 🎯 Test Examples

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('useAcceptSuggestion', () => {
  it('should accept suggestion', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAcceptSuggestion(), { wrapper });

    result.current.mutate({
      answerId: 1,
      codeId: '1',
      codeName: 'Nike',
      confidence: 0.95,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

### Testing Components

```typescript
import { render, screen, userEvent } from '@testing-library/react';

describe('CodingGrid', () => {
  it('should render answers', () => {
    render(<CodingGrid answers={mockAnswers} />);

    expect(screen.getByText('Nike shoes')).toBeInTheDocument();
  });

  it('should handle row selection', async () => {
    const user = userEvent.setup();
    render(<CodingGrid answers={mockAnswers} />);

    const checkbox = screen.getAllByRole('checkbox')[0];
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
  });
});
```

---

## 📝 Test Writing Guidelines

### DO

✅ Test business logic thoroughly
✅ Test error cases
✅ Test edge cases (empty arrays, null values)
✅ Use descriptive test names
✅ Keep tests focused (one assertion per test ideally)
✅ Mock external dependencies (API calls, DB)

### DON'T

❌ Test implementation details
❌ Test library code
❌ Make real API calls in tests
❌ Share state between tests
❌ Use magic numbers (define constants)

---

## 🎯 TODO: Additional Tests Needed

### High Priority

1. **Complete lib tests** (target 90%)
   - openai.ts (expand existing 8 tests)
   - batchAIProcessor.ts (expand existing 10 tests)
   - performanceMonitor.ts (new)
   - rateLimit.ts (test TokenBucket)

2. **Hooks tests** (target 75%)
   - useFilters.test.ts
   - useOfflineSync.test.ts
   - useBatchSelection.test.ts

3. **Component tests** (target 70%)
   - CodingGrid.test.tsx
   - FiltersBar.test.tsx
   - AnalyticsDashboard.test.tsx

### Medium Priority

4. **Integration tests**
   - batch-processing.test.ts
   - import-export.test.ts
   - offline-sync.test.ts

---

## 🏃 Quick Start

```bash
# 1. Run unit tests
npm run test

# 2. Check coverage
npm run test:coverage
# Open coverage/index.html in browser

# 3. Run E2E tests
npm run test:e2e

# 4. Generate coverage report
npm run test:coverage -- --reporter=html
```

---

## 📚 Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Docs](https://mswjs.io/)
- [Playwright Docs](https://playwright.dev/)
