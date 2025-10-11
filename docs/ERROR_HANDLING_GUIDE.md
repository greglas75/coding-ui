# 🛡️ Error Handling & ErrorBoundary Guide

## ✅ What Has Been Implemented

### 1. Enhanced ErrorBoundary Component

**Location:** `src/components/ErrorBoundary.tsx`

**New Features:**
- ✅ **Sentry Integration** - Automatic error reporting
- ✅ **Reload App Button** - Full application reload
- ✅ **Report Error Button** - Interactive Sentry feedback dialog
- ✅ **Event ID Display** - For support tracking
- ✅ **Custom Callbacks** - `onError` and `onReport` props
- ✅ **Configurable Buttons** - `showReloadButton`, `showReportButton`

### 2. Enhanced useErrorHandler Hook

**Location:** `src/hooks/useErrorHandler.ts`

**New Features:**
- ✅ **Sentry Reporting** - Automatic error capture
- ✅ **Error State Tracking** - `lastError`, `errorCount`
- ✅ **Context Tags** - Better error categorization
- ✅ **Toast Notifications** - User-friendly error messages
- ✅ **Async Wrapper** - `wrapAsync` for automatic try/catch
- ✅ **Error Clearing** - `clearError`, `resetErrorCount`

---

## 🚀 ErrorBoundary Usage

### Basic Usage

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### With Custom Callbacks

```typescript
<ErrorBoundary
  onError={(error, errorInfo) => {
    console.log('Error occurred:', error);
    // Custom logging, analytics, etc.
  }}
  onReport={async (error, errorInfo) => {
    // Custom report handling
    await sendToCustomService(error);
  }}
  showReloadButton={true}
  showReportButton={true}
>
  <YourComponent />
</ErrorBoundary>
```

### With Custom Fallback

```typescript
<ErrorBoundary
  fallback={
    <div className="p-8 text-center">
      <h2>Custom Error UI</h2>
      <p>Something went wrong</p>
    </div>
  }
>
  <YourComponent />
</ErrorBoundary>
```

### Nested Boundaries (Granular Error Handling)

```typescript
function App() {
  return (
    <ErrorBoundary>
      <Header />

      <ErrorBoundary onError={(e) => console.log('Sidebar error:', e)}>
        <Sidebar />
      </ErrorBoundary>

      <ErrorBoundary onError={(e) => console.log('Content error:', e)}>
        <MainContent />
      </ErrorBoundary>

      <Footer />
    </ErrorBoundary>
  );
}
```

---

## 🎯 useErrorHandler Usage

### Basic Async Error Handling

```typescript
import { useErrorHandler } from './hooks/useErrorHandler';

function MyComponent() {
  const { wrapAsync } = useErrorHandler({
    context: 'MyComponent',
  });

  const fetchData = wrapAsync(async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  }, 'fetchData');

  return (
    <button onClick={fetchData}>
      Fetch Data
    </button>
  );
}
```

### Manual Error Handling

```typescript
function MyComponent() {
  const { handleError } = useErrorHandler({
    context: 'MyComponent',
    fallbackMessage: 'Operation failed',
  });

  const doSomething = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      handleError(error, 'doSomething');
      // Component continues working
    }
  };

  return <button onClick={doSomething}>Do Something</button>;
}
```

### With Error State

```typescript
function MyComponent() {
  const {
    handleError,
    lastError,
    errorCount,
    clearError
  } = useErrorHandler({
    context: 'MyComponent',
  });

  return (
    <div>
      {lastError && (
        <div className="error-banner">
          Error: {lastError.message}
          <button onClick={clearError}>×</button>
        </div>
      )}

      {errorCount > 0 && (
        <p className="text-yellow-600">
          {errorCount} error(s) occurred
        </p>
      )}

      {/* Your component */}
    </div>
  );
}
```

### With Custom Tags and Context

```typescript
const { handleError } = useErrorHandler({
  context: 'UserProfile',
  reportToSentry: true,
  tags: {
    feature: 'user-management',
    severity: 'high',
    userId: user.id,
  },
});

try {
  await updateProfile(data);
} catch (error) {
  handleError(error, 'updateProfile');
}
```

---

## 🔧 Configuration Options

### ErrorBoundary Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | - | Components to wrap |
| `fallback` | ReactNode | undefined | Custom error UI |
| `onError` | Function | undefined | Called when error occurs |
| `onReport` | Function | undefined | Called when user reports error |
| `showReloadButton` | boolean | true | Show "Reload App" button |
| `showReportButton` | boolean | true | Show "Report Error" button |

### useErrorHandler Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showToast` | boolean | true | Show error toast notification |
| `logError` | boolean | true | Log to console and errorLogger |
| `fallbackMessage` | string | 'An error occurred' | Default error message |
| `onError` | Function | undefined | Custom error callback |
| `reportToSentry` | boolean | true | Send to Sentry |
| `context` | string | undefined | Error context for categorization |
| `tags` | Object | {} | Sentry tags |

---

## 📊 Sentry Integration

### ErrorBoundary → Sentry

When an error is caught:

1. **Captured** with `Sentry.captureException()`
2. **Tagged** with `errorBoundary: 'true'`
3. **Context** includes component stack
4. **Event ID** returned and displayed to user
5. **Report Dialog** available via "Report Error" button

### useErrorHandler → Sentry

When `handleError` is called:

1. **Captured** with `Sentry.captureException()`
2. **Tagged** with custom tags + context
3. **Metadata** includes error count, timestamp
4. **Console Log** with event ID

---

## 🎯 Best Practices

### 1. Wrap Async Functions

```typescript
// ✅ Good - automatic error handling
const { wrapAsync } = useErrorHandler({ context: 'MyComponent' });

const fetchData = wrapAsync(async () => {
  const response = await fetch('/api/data');
  return await response.json();
}, 'fetchData');

// ❌ Bad - manual try/catch everywhere
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    return await response.json();
  } catch (error) {
    console.error(error);
    toast.error('Failed');
    // ... repeated error handling
  }
};
```

### 2. Use ErrorBoundary at Strategic Points

```typescript
// ✅ Good - boundaries around major sections
<App>
  <Header />
  <ErrorBoundary><Sidebar /></ErrorBoundary>
  <ErrorBoundary><MainContent /></ErrorBoundary>
  <Footer />
</App>

// ❌ Bad - one boundary around everything
<ErrorBoundary>
  <EntireApp />
</ErrorBoundary>
```

### 3. Provide Context

```typescript
// ✅ Good - descriptive context
const { handleError } = useErrorHandler({
  context: 'UserProfileUpdate',
  tags: { feature: 'profile', action: 'update' },
});

// ❌ Bad - generic context
const { handleError } = useErrorHandler();
```

### 4. Handle Errors Gracefully

```typescript
// ✅ Good - component continues working
try {
  await saveData();
  toast.success('Saved!');
} catch (error) {
  handleError(error);
  // Component still functional
}

// ❌ Bad - component breaks
await saveData(); // Uncaught error crashes component
```

---

## 🔍 Error Flow

### Component Error (Render Error)

```
Component throws error
  ↓
ErrorBoundary catches
  ↓
Sentry.captureException()
  ↓
console.error()
  ↓
onError callback (if provided)
  ↓
Show error UI with actions:
  - Try Again (reset state)
  - Reload App (window.location.reload)
  - Go Home (navigate to /)
  - Report Error (Sentry feedback dialog)
```

### Async Error (useErrorHandler)

```
Async function throws
  ↓
wrapAsync catches
  ↓
handleError()
  ↓
Sentry.captureException() (if enabled)
  ↓
console.error() + errorLogger.log()
  ↓
toast.error() (if enabled)
  ↓
onError callback (if provided)
  ↓
Return error to caller
```

---

## 📝 Examples

### Example 1: API Call with Error Handling

```typescript
import { useErrorHandler } from './hooks/useErrorHandler';

function UserList() {
  const [users, setUsers] = useState([]);
  const { wrapAsync, lastError, clearError } = useErrorHandler({
    context: 'UserList',
    tags: { feature: 'users' },
  });

  const loadUsers = wrapAsync(async () => {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error('Failed to load users');
    const data = await response.json();
    setUsers(data);
  }, 'loadUsers');

  useEffect(() => {
    loadUsers();
  }, []);

  if (lastError) {
    return (
      <div>
        <p>Error: {lastError.message}</p>
        <button onClick={clearError}>Retry</button>
      </div>
    );
  }

  return <div>{/* render users */}</div>;
}
```

### Example 2: Form Submission

```typescript
function ContactForm() {
  const { wrapAsync } = useErrorHandler({
    context: 'ContactForm',
    fallbackMessage: 'Failed to send message',
  });

  const handleSubmit = wrapAsync(async (formData) => {
    await api.post('/contact', formData);
    toast.success('Message sent!');
  }, 'submitForm');

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### Example 3: Multiple Error Handlers

```typescript
function ComplexComponent() {
  // Different handlers for different operations
  const fetchHandler = useErrorHandler({
    context: 'DataFetching',
    tags: { operation: 'read' },
  });

  const saveHandler = useErrorHandler({
    context: 'DataSaving',
    tags: { operation: 'write' },
    fallbackMessage: 'Failed to save changes',
  });

  const loadData = fetchHandler.wrapAsync(async () => {
    // ... fetch logic
  });

  const saveData = saveHandler.wrapAsync(async () => {
    // ... save logic
  });

  return (
    <div>
      <button onClick={loadData}>Load</button>
      <button onClick={saveData}>Save</button>
    </div>
  );
}
```

---

## 🎨 Error UI Components

### ErrorBoundary Default UI

- **Icon:** Large warning triangle
- **Title:** "Oops! Something went wrong"
- **Message:** Reassuring user data is safe
- **Error Details:** (DEV only) Error message and stack
- **Actions:**
  - **Try Again** - Reset component state
  - **Reload App** - Full page reload
  - **Go Home** - Navigate to `/`
  - **Report Error** - Sentry feedback dialog
- **Event ID:** For support reference
- **Help Text:** Contact support message

### Custom Toast (useErrorHandler)

In development:
```
❌ Error title
Context: MyComponent
[Details button]
```

In production:
```
❌ Error title
```

---

## 📊 Error Monitoring

### Sentry Dashboard

All errors are sent to Sentry with:

- **Stack trace**
- **Component stack** (for ErrorBoundary)
- **Context tags** (feature, operation, etc.)
- **Error count**
- **Timestamp**
- **User info** (if configured)

### Local Logging

All errors are also logged to:

1. **Console** - `console.error()`
2. **ErrorLogger** - `errorLogger.log()` (saved to localStorage)

Access logs:
```typescript
import { errorLogger } from './lib/errorLogger';

const logs = errorLogger.getLogs();
console.log(logs);
```

---

## 🔒 Error Privacy

### Development

- Shows full error messages
- Shows component stack
- Shows event ID
- Shows context in toast

### Production

- Shows user-friendly messages
- Hides technical details
- Still reports to Sentry
- Shows event ID for support

---

## 🎯 Common Patterns

### Pattern 1: API Calls

```typescript
const { wrapAsync } = useErrorHandler({ context: 'API' });

const api = {
  getUsers: wrapAsync(async () => {
    return await apiClient.get('/users');
  }, 'getUsers'),

  createUser: wrapAsync(async (data) => {
    return await apiClient.post('/users', data);
  }, 'createUser'),
};
```

### Pattern 2: Form Validation

```typescript
const { handleError } = useErrorHandler({
  context: 'FormValidation',
  showToast: false, // Handle toast manually
});

const validate = (data: FormData) => {
  try {
    if (!data.email) throw new Error('Email required');
    if (!data.email.includes('@')) throw new Error('Invalid email');
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};
```

### Pattern 3: Silent Errors (No Toast)

```typescript
const { handleError } = useErrorHandler({
  showToast: false,
  logError: true, // Still log to console
});

try {
  await backgroundOperation();
} catch (error) {
  handleError(error, 'backgroundOp');
  // Logged to Sentry but no user notification
}
```

### Pattern 4: Critical Errors

```typescript
const { handleError } = useErrorHandler({
  context: 'CriticalOperation',
  tags: { severity: 'critical' },
  reportToSentry: true,
  onError: (error) => {
    // Additional actions for critical errors
    logoutUser();
    redirectToErrorPage();
  },
});
```

---

## 📚 API Reference

### ErrorBoundary

```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  onReport?: (error: Error, errorInfo: any) => void;
  showReloadButton?: boolean;
  showReportButton?: boolean;
}
```

**Methods:**
- `handleReset()` - Clear error state
- `handleReload()` - Reload application
- `handleReport()` - Show Sentry report dialog

### useErrorHandler

```typescript
function useErrorHandler(options?: ErrorHandlerOptions): {
  handleError: (error: unknown, context?: string) => Error;
  wrapAsync: <T>(fn: T, context?: string) => T;
  lastError: Error | null;
  errorCount: number;
  clearError: () => void;
  resetErrorCount: () => void;
}
```

**Options:**
- `showToast` - Show error toast (default: true)
- `logError` - Log to console (default: true)
- `fallbackMessage` - Default message (default: 'An error occurred')
- `onError` - Custom error callback
- `reportToSentry` - Send to Sentry (default: true)
- `context` - Default context string
- `tags` - Sentry tags object

---

## 🧪 Testing Error Handling

### Test ErrorBoundary

```typescript
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowError() {
  throw new Error('Test error');
}

it('should catch and display error', () => {
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  expect(screen.getByText('Try Again')).toBeInTheDocument();
});
```

### Test useErrorHandler

```typescript
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from './useErrorHandler';

it('should handle errors', () => {
  const { result } = renderHook(() => useErrorHandler());

  act(() => {
    result.current.handleError(new Error('Test error'));
  });

  expect(result.current.lastError?.message).toBe('Test error');
  expect(result.current.errorCount).toBe(1);
});
```

---

## 🎨 Error UI Customization

### Custom Error Page

```typescript
<ErrorBoundary
  fallback={
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
      <div className="max-w-md p-8 bg-white rounded-2xl shadow-2xl">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Uh oh! 😱
        </h1>
        <p className="text-gray-700 mb-6">
          Our hamsters stopped running. We're waking them up!
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-bold"
        >
          Wake the Hamsters 🐹
        </button>
      </div>
    </div>
  }
>
  <App />
</ErrorBoundary>
```

---

## 🔍 Debugging

### View Error Logs

```typescript
import { errorLogger } from './lib/errorLogger';

// In console
errorLogger.getLogs();

// Clear logs
errorLogger.clearLogs();
```

### Sentry Dashboard

1. Go to Sentry dashboard
2. Find error by Event ID
3. See full stack trace, breadcrumbs, user context
4. View user feedback if they used Report Error button

### Console Logs

All errors logged with emoji prefixes:
```
🔴 Error caught by boundary: Error: Something failed
📍 Component stack: ...
📤 Error reported to Sentry: abc123
❌ Error in MyComponent: Error: ...
```

---

## 📖 Complete Example

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';
import { useErrorHandler } from './hooks/useErrorHandler';

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Custom error tracking
        analytics.track('error_boundary_triggered', {
          error: error.message,
        });
      }}
      onReport={async (error) => {
        // Custom reporting
        await sendToSlack({
          message: `Error: ${error.message}`,
          channel: '#errors',
        });
      }}
    >
      <MyApp />
    </ErrorBoundary>
  );
}

function MyApp() {
  const { wrapAsync, lastError, clearError } = useErrorHandler({
    context: 'MyApp',
    tags: { version: '1.0.0' },
  });

  const loadData = wrapAsync(async () => {
    const response = await apiClient.get('/data');
    return response.data;
  }, 'loadData');

  useEffect(() => {
    loadData();
  }, []);

  if (lastError) {
    return (
      <div>
        <p>Error loading data: {lastError.message}</p>
        <button onClick={clearError}>Try Again</button>
      </div>
    );
  }

  return <div>{/* app content */}</div>;
}
```

---

## 🎉 Benefits

### For Users:
- ✅ App doesn't crash completely
- ✅ Clear error messages
- ✅ Easy recovery options
- ✅ Can report problems

### For Developers:
- ✅ All errors tracked in Sentry
- ✅ Component stacks for debugging
- ✅ Context tags for categorization
- ✅ Less boilerplate code

### For Product:
- ✅ Better reliability
- ✅ Error insights
- ✅ User feedback on errors
- ✅ Faster bug fixes

---

## 📚 Resources

- [Sentry React Integration](https://docs.sentry.io/platforms/javascript/guides/react/)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Handling Best Practices](https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react)

---

## ✅ Summary

✅ **ErrorBoundary enhanced** with Sentry, Reload App, Report Error
✅ **useErrorHandler improved** with state tracking, tags, Sentry
✅ **Examples created** in `src/components/examples/ErrorHandlingExample.tsx`
✅ **Documentation complete**

**Error handling is now production-ready!** 🛡️

