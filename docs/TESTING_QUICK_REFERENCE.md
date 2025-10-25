# Testing Quick Reference Guide

## 🚀 Quick Commands

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run with visual UI
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- useDebounce
npm test -- hooks/
npm test -- supabaseHelpers

# Run single test by name
npm test -- -t "should fetch codes"
```

---

## 📝 Writing Tests

### **1. Test a Hook**

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  beforeEach(() => {
    vi.useFakeTimers(); // If testing timers/debounce
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value', () => {
    const { result } = renderHook(() => useMyHook('initial'));
    
    expect(result.current.value).toBe('initial');
  });

  it('should update value', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.setValue('new value');
    });
    
    expect(result.current.value).toBe('new value');
  });

  it('should call callback', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useMyHook({ onChange: callback }));
    
    act(() => {
      result.current.doSomething();
    });
    
    expect(callback).toHaveBeenCalledWith('expected');
  });
});
```

---

### **2. Test a Component**

```typescript
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { describe, it, expect, vi } from 'vitest';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Hello" />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle button click', async () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    
    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);
    
    expect(onClick).toHaveBeenCalled();
  });

  it('should update input value', () => {
    render(<MyComponent />);
    
    const input = screen.getByPlaceholderText('Enter name');
    fireEvent.change(input, { target: { value: 'John' } });
    
    expect(input).toHaveValue('John');
  });

  it('should show error message', async () => {
    render(<MyComponent />);
    
    const button = screen.getByText('Submit');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });
  });
});
```

---

### **3. Test Async Functions**

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('myAsyncFunction', () => {
  it('should fetch data successfully', async () => {
    const result = await myAsyncFunction();
    
    expect(result).toEqual({ success: true });
  });

  it('should handle errors', async () => {
    mockAPI.mockRejectedValue(new Error('Failed'));
    
    await expect(myAsyncFunction()).rejects.toThrow('Failed');
  });
});
```

---

### **4. Mock Supabase in Tests**

```typescript
// In your test file
vi.mock('../supabase', () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    eq: mockEq,
  }));

  return {
    supabase: {
      from: mockFrom,
      _mocks: { select: mockSelect, eq: mockEq }, // Expose for assertions
    },
  };
});

// In your tests
it('should query database', async () => {
  const { supabase } = await import('../supabase');
  (supabase as any)._mocks.eq.mockResolvedValue({
    data: [{ id: 1 }],
    error: null,
  });

  const result = await myFunction();
  expect(result).toBeDefined();
});
```

---

## 🎯 Common Matchers

### **jest-dom Matchers:**
```typescript
// Element presence
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();

// Visibility
expect(element).toBeVisible();
expect(element).not.toBeVisible();

// Values
expect(input).toHaveValue('text');
expect(checkbox).toBeChecked();

// Attributes
expect(button).toHaveAttribute('disabled');
expect(link).toHaveAttribute('href', '/path');

// Classes
expect(div).toHaveClass('active');

// Text content
expect(element).toHaveTextContent('Hello');
```

### **Vitest Matchers:**
```typescript
// Equality
expect(value).toBe(expected);
expect(object).toEqual(expectedObject);
expect(array).toStrictEqual([1, 2, 3]);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();
expect(value).toBeUndefined();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThanOrEqual(10);

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ key: 'value' });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith('arg1', 'arg2');

// Async
await expect(promise).resolves.toBe('value');
await expect(promise).rejects.toThrow('error');
```

---

## ⏰ Testing Timers

```typescript
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

it('should debounce', () => {
  const { result } = renderHook(() => useDebounce('test', 500));
  
  // Fast-forward time
  act(() => {
    vi.advanceTimersByTime(500);
  });
  
  expect(result.current).toBe('test');
});

// Run all timers
act(() => {
  vi.runAllTimers();
});

// Run only pending timers
act(() => {
  vi.runOnlyPendingTimers();
});
```

---

## 🔍 Debugging Tests

### **1. Use console.log**
```typescript
it('should do something', () => {
  const { result } = renderHook(() => useMyHook());
  
  console.log('Current value:', result.current);
  
  expect(result.current).toBeDefined();
});
```

### **2. Use screen.debug()**
```typescript
it('should render', () => {
  render(<MyComponent />);
  
  screen.debug(); // Prints current DOM
  
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### **3. Use .only to focus**
```typescript
it.only('should test this one', () => {
  // Only this test will run
});
```

### **4. Use .skip to ignore**
```typescript
it.skip('not ready yet', () => {
  // This test will be skipped
});
```

---

## 🎨 Test Organization

### **Describe Blocks:**
```typescript
describe('MyComponent', () => {
  describe('rendering', () => {
    it('should render with props', () => {});
    it('should render without props', () => {});
  });

  describe('interactions', () => {
    it('should handle click', () => {});
    it('should handle input', () => {});
  });

  describe('edge cases', () => {
    it('should handle empty data', () => {});
    it('should handle errors', () => {});
  });
});
```

---

## 🐛 Common Pitfalls

### **1. Forgetting act()**
```typescript
// ❌ Wrong
result.current.setValue('new');
expect(result.current.value).toBe('new');

// ✅ Correct
act(() => {
  result.current.setValue('new');
});
expect(result.current.value).toBe('new');
```

### **2. Not clearing mocks**
```typescript
// ❌ Wrong - mocks persist between tests
it('test 1', () => {
  mockFn.mockReturnValue('a');
});
it('test 2', () => {
  // mockFn still returns 'a' !
});

// ✅ Correct
beforeEach(() => {
  vi.clearAllMocks();
});
```

### **3. Not cleaning up spies**
```typescript
// ❌ Wrong - spy persists after test
const spy = vi.spyOn(console, 'error');

// ✅ Correct
const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
// ... test code
spy.mockRestore();
```

### **4. Testing implementation details**
```typescript
// ❌ Wrong - testing internals
expect(component.state.value).toBe('test');

// ✅ Correct - testing behavior
expect(screen.getByText('test')).toBeInTheDocument();
```

---

## 🎯 Coverage Tips

### **Aim for:**
- ✅ **Hooks:** 90%+ (critical business logic)
- ✅ **Helpers:** 85%+ (utility functions)
- ✅ **Components:** 60%+ (UI behavior)
- ✅ **Pages:** 40%+ (integration points)

### **Don't obsess over:**
- ❌ 100% coverage (diminishing returns)
- ❌ Testing trivial code (getters/setters)
- ❌ Testing external libraries

### **Focus on:**
- ✅ Critical paths (auth, data flow)
- ✅ Edge cases (null, undefined, empty)
- ✅ Error handling
- ✅ User interactions
- ✅ Business logic

---

**Happy Testing! 🎉**

