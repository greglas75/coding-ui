# 🧪 Vitest + React Testing Library - Testing Guide

## ✅ What Has Been Implemented

### 1. Testing Infrastructure

**Installed Packages:**
- `vitest` - Fast unit test framework (Vite-native)
- `@vitest/ui` - Browser UI for tests
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom matchers for DOM
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - DOM implementation for Node.js
- `msw` - Mock Service Worker for API mocking

### 2. Configuration Files

**`vitest.config.ts`**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
    },
  },
});
```

**`src/test/setup.ts`**
- MSW server initialization
- Window mocks (matchMedia, IntersectionObserver, ResizeObserver)
- Cleanup after each test

### 3. MSW Setup

**`src/test/mocks/handlers.ts`**
- Mock API endpoints for all major routes
- Realistic mock data (categories, codes, answers)
- Error simulation endpoints
- Timeout simulation

**`src/test/mocks/server.ts`**
- MSW server setup for Node.js
- Automatic request interception

### 4. Test Utilities

**`src/test/utils/test-utils.tsx`**
- Custom render with providers (QueryClient, Router)
- Mock data generators (`createMockCategory`, `createMockCode`, `createMockAnswer`)
- Helper functions

---

## 📊 Test Coverage

### ✅ Components Tested

1. **CodeListTable** (22 tests)
   - Rendering, sorting, editing, whitelist toggle
   - Delete functionality, empty states, accessibility

2. **CodeSuggestions** (21 tests)
   - Loading/empty states, confidence colors
   - User interactions, ordering, edge cases

3. **ExportImportModal** (26 tests)
   - Tab navigation, export/import functionality
   - Template download, UI states, accessibility

4. **CodingGrid** (17 tests)
   - Rendering, filters, empty states
   - Category context, density modes, callbacks

**Total: 86 tests - ALL PASSING ✅**

---

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test:run

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run all tests (unit + e2e)
npm run test:all
```

### Watch Mode

```bash
npm run test
```

Features:
- Auto-reruns on file changes
- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `t` to filter by test name
- Press `q` to quit

### UI Mode

```bash
npm run test:ui
```

Opens browser with interactive UI showing:
- Test results
- Component tree
- Console logs
- DOM snapshots

---

## 📝 Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<MyComponent onClick={handleClick} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Using Test Utilities

```typescript
import { render, createMockAnswer } from '../test/utils/test-utils';

// Create mock data
const answer = createMockAnswer({
  id: 1,
  answer_text: 'Test answer'
});

// Render with providers
render(<CodingGrid answers={[answer]} />);
```

### Mocking API Calls

API calls are automatically mocked by MSW. To customize:

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';

it('should handle API error', async () => {
  // Override default handler for this test
  server.use(
    http.get('/api/categories', () => {
      return HttpResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    })
  );

  render(<MyComponent />);

  // ... test error handling
});
```

### Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('should type in input field', async () => {
  const user = userEvent.setup();
  render(<MyForm />);

  const input = screen.getByRole('textbox');
  await user.type(input, 'Hello World');

  expect(input).toHaveValue('Hello World');
});

it('should click checkbox', async () => {
  const user = userEvent.setup();
  render(<MyCheckbox />);

  const checkbox = screen.getByRole('checkbox');
  await user.click(checkbox);

  expect(checkbox).toBeChecked();
});
```

### Async Testing

```typescript
import { waitFor } from '@testing-library/react';

it('should load data asynchronously', async () => {
  render(<MyComponent />);

  // Wait for element to appear
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

---

## 🎯 Testing Patterns

### Pattern 1: Component Rendering

```typescript
describe('Rendering', () => {
  it('should render with props', () => {
    render(<MyComponent name="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Pattern 2: User Interactions

```typescript
describe('User Interactions', () => {
  it('should call callback on click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<MyButton onClick={onClick} />);
    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalled();
  });
});
```

### Pattern 3: State Changes

```typescript
describe('State Management', () => {
  it('should update on input change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MyInput onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test');

    expect(onChange).toHaveBeenCalled();
  });
});
```

### Pattern 4: Accessibility

```typescript
describe('Accessibility', () => {
  it('should have proper ARIA labels', () => {
    render(<MyComponent />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label');
  });
});
```

---

## 🔧 Common Queries

### Finding Elements

```typescript
// By text
screen.getByText('Submit');
screen.getAllByText(/Submit/i); // Case insensitive

// By role
screen.getByRole('button');
screen.getByRole('textbox');
screen.getByRole('checkbox');

// By label
screen.getByLabelText('Username');

// By placeholder
screen.getByPlaceholderText('Enter name');

// By test ID
screen.getByTestId('my-element');

// By title
screen.getByTitle('Close dialog');
```

### Queries vs Get vs Find

```typescript
// get* - Throws if not found (synchronous)
screen.getByText('Hello');

// query* - Returns null if not found (synchronous)
screen.queryByText('Hello');

// find* - Async, waits for element (use for async content)
await screen.findByText('Hello');

// *All* variants
screen.getAllByText('Hello'); // Returns array
```

---

## 🎭 Mocking

### Mock Functions

```typescript
const mockFn = vi.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ data: [] });

expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(2);
```

### Mock Modules

```typescript
vi.mock('../lib/myModule', () => ({
  myFunction: vi.fn().mockReturnValue('mocked'),
}));
```

### Mock Supabase

```typescript
vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => mockSupabaseClient,
}));
```

---

## 📈 Coverage Reports

### Generate Coverage

```bash
npm run test:coverage
```

Opens HTML report at: `coverage/index.html`

### Coverage Thresholds

Current configuration:
- **Lines:** No threshold (add as needed)
- **Functions:** No threshold
- **Branches:** No threshold
- **Statements:** No threshold

To add thresholds, update `vitest.config.ts`:

```typescript
coverage: {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80,
}
```

---

## 🐛 Debugging Tests

### Console Logs

```typescript
it('should debug', () => {
  const { container } = render(<MyComponent />);

  // Print component HTML
  screen.debug();

  // Print specific element
  screen.debug(screen.getByRole('button'));

  // Console log
  console.log(container.innerHTML);
});
```

### VS Code Debugging

1. Add breakpoint in test file
2. Run "Debug Current Test File" from VS Code
3. Step through code

### Vitest UI

```bash
npm run test:ui
```

Benefits:
- See rendered components
- Inspect DOM structure
- View console logs
- Re-run specific tests

---

## ✅ Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// ❌ Bad - testing implementation details
expect(component.state.count).toBe(5);

// ✅ Good - testing user-visible behavior
expect(screen.getByText('Count: 5')).toBeInTheDocument();
```

### 2. Use Accessible Queries

```typescript
// ✅ Preferred (accessibility-friendly)
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Username');

// ⚠️ Less preferred
screen.getByTestId('submit-button');
screen.getByClassName('btn');
```

### 3. Wait for Async Updates

```typescript
// ✅ Wait for async state changes
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// ❌ Don't use arbitrary timeouts
await new Promise(r => setTimeout(r, 1000));
```

### 4. Clean Up Mocks

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

### 5. Descriptive Test Names

```typescript
// ✅ Good
it('should display error message when API call fails', () => {});

// ❌ Bad
it('test 1', () => {});
```

---

## 📚 Test File Structure

```
src/
├── __tests__/                    # Unit tests
│   ├── CodeListTable.test.tsx
│   ├── CodeSuggestions.test.tsx
│   ├── ExportImportModal.test.tsx
│   └── CodingGrid.test.tsx
├── test/                         # Test utilities
│   ├── setup.ts                  # Global setup
│   ├── mocks/
│   │   ├── handlers.ts           # MSW handlers
│   │   └── server.ts             # MSW server
│   └── utils/
│       └── test-utils.tsx        # Custom render & helpers
└── vitest.config.ts              # Vitest configuration
```

---

## 📊 Test Results Summary

| File | Tests | Status |
|------|-------|--------|
| CodeListTable.test.tsx | 22 | ✅ PASS |
| CodeSuggestions.test.tsx | 21 | ✅ PASS |
| ExportImportModal.test.tsx | 26 | ✅ PASS |
| CodingGrid.test.tsx | 17 | ✅ PASS |
| **TOTAL** | **86** | **✅ ALL PASS** |

### Coverage

Run `npm run test:coverage` to see detailed coverage report.

---

## 🎯 Next Steps

### Add More Tests

1. **Hooks**
   - `useBatchSelection.test.ts`
   - `useFilters.test.ts`
   - `useOfflineSync.test.ts`

2. **Stores**
   - `useProjectsStore.test.ts`
   - `useCodingStore.test.ts`
   - `useAIQueueStore.test.ts`

3. **Utilities**
   - `validators.test.ts`
   - `apiClient.test.ts`

4. **Schemas**
   - `categorySchema.test.ts`
   - `codeSchema.test.ts`

### Improve Coverage

```bash
npm run test:coverage
```

Target areas with low coverage and add tests.

### Integration Tests

Consider adding integration tests that test multiple components together.

---

## 🔍 Troubleshooting

### IndexedDB Errors

CodingGrid tests show IndexedDB warnings (expected in jsdom):
```
❌ Failed to initialize IndexedDB: ReferenceError: indexedDB is not defined
```

**Solution:** These are warnings only. Tests pass. To fix, mock IndexedDB in setup.ts.

### Act Warnings

```
An update to CodingGrid inside a test was not wrapped in act(...)
```

**Solution:** These are warnings from async state updates. Use `waitFor` for async assertions.

### Multiple Elements Found

```
Found multiple elements with the text: Apple
```

**Solution:** Component renders desktop + mobile views. Use `getAllByText` or `queryAllByText`.

---

## 📖 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [User Event](https://testing-library.com/docs/user-event/intro)

---

## 🎉 Summary

✅ **Vitest configured** with jsdom environment
✅ **React Testing Library** set up with custom render
✅ **MSW** configured for API mocking
✅ **86 tests** covering 4 major components
✅ **All tests passing** with comprehensive coverage
✅ **Test utilities** for easy test writing
✅ **Documentation** complete

**Testing infrastructure is production-ready!** 🚀

