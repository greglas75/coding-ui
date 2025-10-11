# 📝 Centralized Logger - Complete Guide

## ✅ What Has Been Implemented

### 1. Centralized Logger

**Location:** `src/utils/logger.ts`

**Features:**
- ✅ **5 Log Levels** - debug, info, warn, error, fatal
- ✅ **Console Output** - Formatted with emojis and colors
- ✅ **Sentry Integration** - Automatic error reporting
- ✅ **LogRocket Ready** - Placeholder for future integration
- ✅ **Persistent Storage** - Logs saved to localStorage
- ✅ **Export** - Download logs as JSON or CSV
- ✅ **Breadcrumbs** - Track user actions for debugging
- ✅ **Component Loggers** - Pre-configured loggers per component
- ✅ **Performance Logging** - Track execution times

### 2. Integration

**Integrated with:**
- ✅ `apiClient.ts` - All API calls logged
- ✅ `ErrorBoundary.tsx` - Component errors logged
- ✅ `useErrorHandler.ts` - Hook errors logged
- ✅ Global error handlers - Uncaught errors logged

---

## 🚀 Quick Start

### Basic Logging

```typescript
import { logInfo, logError, logWarn } from './utils/logger';

// Info
logInfo('User logged in', {
  component: 'LoginForm',
  extra: { userId: '123' },
});

// Warning
logWarn('API response slow', {
  component: 'DataFetcher',
  extra: { duration: 3500 },
});

// Error
try {
  await riskyOperation();
} catch (error) {
  logError('Operation failed', {
    component: 'MyComponent',
    action: 'riskyOperation',
  }, error as Error);
}
```

### Component Logger

```typescript
import { createComponentLogger } from './utils/logger';

function MyComponent() {
  const logger = createComponentLogger('MyComponent');

  useEffect(() => {
    logger.info('Component mounted');

    return () => {
      logger.debug('Component unmounting');
    };
  }, []);

  const handleClick = async () => {
    try {
      logger.info('Button clicked');
      await performAction();
      logger.info('Action completed');
    } catch (error) {
      logger.error('Action failed', error as Error);
    }
  };

  return <button onClick={handleClick}>Action</button>;
}
```

### Default Logger Object

```typescript
import logger from './utils/logger';

// Use default logger
logger.info('Application started');
logger.warn('Deprecated feature used');
logger.error('Failed to load data', undefined, error);

// Get logs
const recentLogs = logger.getRecentLogs(20);
const errorLogs = logger.getLogsByLevel('error');

// Export logs
logger.downloadLogs('json');
logger.downloadLogs('csv');

// Clear logs
logger.clearLogs();
```

---

## 📊 Log Levels

### Debug (🔍)

**When:** Development-only detailed information
**Example:** Component lifecycle, prop changes
**Sent to Sentry:** No
**Console:** Yes (dev only)

```typescript
logDebug('Props updated', {
  component: 'DataTable',
  extra: { newProps: props },
});
```

### Info (ℹ️)

**When:** General informational messages
**Example:** User actions, successful operations
**Sent to Sentry:** No
**Console:** Yes

```typescript
logInfo('Data loaded successfully', {
  component: 'DataLoader',
  extra: { count: 50 },
});
```

### Warn (⚠️)

**When:** Potentially harmful situations
**Example:** Deprecated features, slow operations
**Sent to Sentry:** No
**Console:** Yes

```typescript
logWarn('API call took longer than expected', {
  component: 'API Client',
  extra: { duration: 3500, endpoint: '/api/data' },
});
```

### Error (❌)

**When:** Error conditions that should be fixed
**Example:** API failures, validation errors
**Sent to Sentry:** Yes
**Console:** Yes

```typescript
logError('Failed to save data', {
  component: 'SaveForm',
  action: 'save',
  tags: { severity: 'high' },
}, error);
```

### Fatal (💀)

**When:** Critical errors that may crash the app
**Example:** Unrecoverable errors, data corruption
**Sent to Sentry:** Yes (fatal level)
**Console:** Yes

```typescript
logFatal('Database connection lost', {
  component: 'DatabaseService',
  tags: { critical: 'true' },
}, error);
```

---

## 🎯 API Reference

### Core Functions

```typescript
// Debug (dev only)
logDebug(message: string, context?: LogContext): void

// Info
logInfo(message: string, context?: LogContext): void

// Warning
logWarn(message: string, context?: LogContext, error?: Error): void

// Error
logError(message: string, context?: LogContext, error?: Error): void

// Fatal
logFatal(message: string, context?: LogContext, error?: Error): void
```

### LogContext Interface

```typescript
interface LogContext {
  component?: string;          // Component name
  action?: string;             // Action being performed
  userId?: string;             // User ID (optional)
  sessionId?: string;          // Session ID (optional)
  tags?: Record<string, string>; // Sentry tags
  extra?: Record<string, any>;   // Additional data
}
```

### Utility Functions

```typescript
// Get logs
getLogs(): LogEntry[]
getLogsByLevel(level: LogLevel): LogEntry[]
getRecentLogs(count: number = 50): LogEntry[]

// Export logs
exportLogs(): string            // JSON
exportLogsCSV(): string         // CSV
downloadLogs(format: 'json' | 'csv'): void

// Clear logs
clearLogs(): void

// Configuration
configureLogger(config: Partial<LoggerConfig>): void
getLoggerConfig(): LoggerConfig
```

### Helper Functions

```typescript
// Component logger
createComponentLogger(componentName: string): ComponentLogger

// Performance logging
logAsync<T>(message: string, fn: () => Promise<T>, context?: LogContext): Promise<T>

// Timer
createTimer(label: string, context?: LogContext): {
  end: (message?: string) => number;
  fail: (error: Error, message?: string) => number;
}

// Breadcrumbs
addBreadcrumb(message: string, category?: string, level?: SeverityLevel, data?: any): void
```

---

## 📚 Usage Examples

### Example 1: API Call Logging

```typescript
import { createTimer } from './utils/logger';

async function fetchData() {
  const timer = createTimer('Fetch Data', {
    component: 'DataFetcher',
    action: 'fetch',
  });

  try {
    const data = await apiClient.get('/api/data');
    timer.end('Data loaded successfully');
    return data;
  } catch (error) {
    timer.fail(error as Error, 'Failed to load data');
    throw error;
  }
}
```

### Example 2: Form Submission

```typescript
import { createComponentLogger, addBreadcrumb } from './utils/logger';

function ContactForm() {
  const logger = createComponentLogger('ContactForm');

  const handleSubmit = async (formData) => {
    addBreadcrumb('Form submission started', 'form');
    logger.info('Submitting form', { email: formData.email });

    try {
      await apiClient.post('/contact', formData);
      logger.info('Form submitted successfully');
      addBreadcrumb('Form submission successful', 'form');
    } catch (error) {
      logger.error('Form submission failed', error as Error, formData);
      addBreadcrumb('Form submission failed', 'form', 'error');
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Example 3: Async Operation Logging

```typescript
import { logAsync } from './utils/logger';

const result = await logAsync(
  'Process large dataset',
  async () => {
    return await processData(largeDataset);
  },
  {
    component: 'DataProcessor',
    tags: { dataset: 'large' },
  }
);

// Console output:
// 🔍 [DataProcessor] Process large dataset - started
// ℹ️ [DataProcessor] Process large dataset - completed in 1234ms
```

### Example 4: Error Tracking with Context

```typescript
import { logError } from './utils/logger';

try {
  await saveUserProfile(userData);
} catch (error) {
  logError('Failed to save user profile', {
    component: 'UserProfile',
    action: 'save',
    userId: user.id,
    tags: {
      feature: 'profile',
      severity: 'high',
    },
    extra: {
      userData,
      previousData,
    },
  }, error as Error);
}

// Sent to Sentry with all context!
```

---

## 🔧 Configuration

### Configure Logger

```typescript
import { configureLogger } from './utils/logger';

configureLogger({
  enableConsole: true,
  enableSentry: true,
  enableLogRocket: false,
  minLevel: 'info',      // Only log info and above
  maxStoredLogs: 1000,
  persistLogs: true,
});
```

### Environment-Based Configuration

```typescript
// In main.tsx
import logger from './utils/logger';

logger.configure({
  enableConsole: import.meta.env.DEV,
  enableSentry: import.meta.env.PROD,
  minLevel: import.meta.env.DEV ? 'debug' : 'info',
});
```

---

## 📊 Log Management

### View Logs

```typescript
import { getLogs, getRecentLogs } from './utils/logger';

// All logs
const allLogs = getLogs();
console.table(allLogs);

// Recent 20 logs
const recent = getRecentLogs(20);

// Errors only
const errors = getLogsByLevel('error');
```

### Export Logs

```typescript
import { downloadLogs, exportLogs } from './utils/logger';

// Download as JSON
downloadLogs('json');

// Download as CSV
downloadLogs('csv');

// Get as string
const jsonLogs = exportLogs();
const csvLogs = exportLogsCSV();
```

### Clear Logs

```typescript
import { clearLogs } from './utils/logger';

// Clear all logs
clearLogs();

// Logs are removed from memory and localStorage
```

---

## 🎯 Integration Examples

### Integrated with API Client

```typescript
// apiClient.ts (already integrated!)
import { logAPICall, logError } from '../utils/logger';

// Success
logAPICall('GET', '/api/users', 234, 200, true);

// Failure
logAPICall('POST', '/api/users', 567, 500, false);
logError('API call failed', { component: 'API Client' }, error);
```

### Integrated with ErrorBoundary

```typescript
// ErrorBoundary.tsx (already integrated!)
import { logError, logFatal } from '../utils/logger';

componentDidCatch(error, errorInfo) {
  if (isFatal) {
    logFatal('Component error', { component: 'ErrorBoundary' }, error);
  } else {
    logError('Component error', { component: 'ErrorBoundary' }, error);
  }
}
```

### Integrated with useErrorHandler

```typescript
// useErrorHandler.ts (already integrated!)
import { logError } from '../utils/logger';

handleError(error) {
  logError(error.message, {
    component: finalContext,
    tags: tags,
  }, error);
}
```

---

## 🔍 Console Output

### Format

```
🔍 [ComponentName]{action} Message
ℹ️ [ComponentName]{action} Message
⚠️ [ComponentName]{action} Message
❌ [ComponentName]{action} Message
💀 [ComponentName]{action} Message
```

### Examples

```
ℹ️ [LoginForm]{submit} User logged in
⚠️ [API Client]{GET /api/data} API response slow - 3500ms
❌ [SaveForm]{save} Failed to save data
💀 [DatabaseService] Database connection lost
```

### With Colors

- **Debug** - Gray
- **Info** - Blue
- **Warn** - Orange
- **Error** - Red
- **Fatal** - Bold Red

---

## 📤 Sentry Integration

### Automatic Sending

Errors and fatal logs are automatically sent to Sentry with:

```typescript
{
  level: 'error' | 'fatal',
  tags: {
    component: 'MyComponent',
    action: 'myAction',
    ...customTags
  },
  contexts: {
    custom: {
      ...extra data
    }
  }
}
```

### With Breadcrumbs

```typescript
import { addBreadcrumb, logError } from './utils/logger';

// Track user journey
addBreadcrumb('User opened modal', 'ui');
addBreadcrumb('User filled form', 'ui');
addBreadcrumb('User clicked submit', 'ui');

// If error occurs, Sentry will show all breadcrumbs!
try {
  await submit();
} catch (error) {
  logError('Submit failed', { component: 'Form' }, error);
  // Sentry shows all breadcrumbs leading to error
}
```

---

## 🎨 Best Practices

### 1. Use Appropriate Levels

```typescript
// ✅ Good
logDebug('Cache hit');                    // Development info
logInfo('Data loaded');                   // Normal operation
logWarn('Deprecated API used');           // Should fix
logError('Save failed');                  // Needs attention
logFatal('Database unavailable');         // Critical

// ❌ Bad
logError('User clicked button');          // Should be info
logInfo('Critical system failure');       // Should be fatal
```

### 2. Provide Context

```typescript
// ✅ Good - rich context
logError('Failed to load', {
  component: 'UserList',
  action: 'fetchUsers',
  userId: user.id,
  tags: { feature: 'users' },
  extra: { filters, page },
}, error);

// ❌ Bad - no context
logError('Failed to load', undefined, error);
```

### 3. Use Component Loggers

```typescript
// ✅ Good - DRY
const logger = createComponentLogger('MyComponent');
logger.info('Started');
logger.error('Failed', error);

// ❌ Bad - repetitive
logInfo('Started', { component: 'MyComponent' });
logError('Failed', { component: 'MyComponent' }, error);
```

### 4. Add Breadcrumbs for User Journey

```typescript
// ✅ Good - track journey
addBreadcrumb('Page loaded', 'navigation');
addBreadcrumb('Filter applied', 'ui', 'info', { filter: 'active' });
addBreadcrumb('Item selected', 'ui', 'info', { itemId: 123 });
addBreadcrumb('Save clicked', 'ui');

// If error occurs, Sentry shows full journey!
```

---

## 📊 Log Storage

### LocalStorage

Logs are automatically persisted to localStorage:

- **Key:** `app-logs`
- **Max logs:** 1000 (configurable)
- **Format:** JSON array
- **Auto-cleanup:** Old logs removed when limit reached

### Access Stored Logs

```typescript
// In console or DevTools
import { getLogs } from './utils/logger';

const logs = getLogs();
console.table(logs);
```

### Disable Persistence

```typescript
import { configureLogger } from './utils/logger';

configureLogger({
  persistLogs: false,
});
```

---

## 🎯 Advanced Features

### Performance Logging

```typescript
import { logAsync, createTimer } from './utils/logger';

// Async wrapper
const result = await logAsync('Fetch and process data', async () => {
  const data = await fetchData();
  return processData(data);
}, { component: 'DataPipeline' });

// Timer
const timer = createTimer('Export operation', {
  component: 'ExportService',
});

try {
  await exportLargeDataset();
  timer.end('Export completed');
} catch (error) {
  timer.fail(error as Error, 'Export failed');
}
```

### Conditional Logging

```typescript
import logger from './utils/logger';

// Log only in development
if (import.meta.env.DEV) {
  logger.debug('Development mode active');
}

// Log only in production
if (import.meta.env.PROD) {
  logger.info('Production mode active');
}

// Configure minimum level
logger.configure({
  minLevel: import.meta.env.DEV ? 'debug' : 'warn',
});
```

---

## 🔍 Debugging with Logs

### View in Console

All logs appear in console with:
- Emoji for level
- Component name in brackets
- Action in braces
- Colored output
- Extra data collapsed

### Export for Analysis

```typescript
import { downloadLogs } from './utils/logger';

// Export as JSON for analysis tools
downloadLogs('json');

// Export as CSV for Excel
downloadLogs('csv');
```

### Search Logs

```typescript
import { getLogs } from './utils/logger';

// Find all errors from specific component
const componentErrors = getLogs().filter(
  log => log.level === 'error' && log.context?.component === 'DataTable'
);

// Find logs with specific action
const saveActions = getLogs().filter(
  log => log.context?.action === 'save'
);

// Find recent errors
const recentErrors = getLogs()
  .filter(log => log.level === 'error')
  .slice(-10);
```

---

## 🎨 Real-World Example

```typescript
import logger from './utils/logger';
import { createComponentLogger, addBreadcrumb } from './utils/logger';

function UserDashboard() {
  const componentLogger = createComponentLogger('UserDashboard');

  useEffect(() => {
    componentLogger.info('Dashboard mounted');

    return () => {
      componentLogger.debug('Dashboard unmounting');
    };
  }, []);

  const loadData = async () => {
    addBreadcrumb('User clicked refresh', 'ui');

    const timer = logger.createTimer('Load dashboard data', {
      component: 'UserDashboard',
    });

    try {
      const data = await logger.logAsync('Fetch dashboard data', async () => {
        return await apiClient.get('/api/dashboard');
      }, { component: 'UserDashboard' });

      timer.end('Dashboard data loaded');
      addBreadcrumb('Dashboard data loaded', 'data', 'info', { count: data.length });

      return data;
    } catch (error) {
      timer.fail(error as Error, 'Failed to load dashboard');
      componentLogger.error('Load failed', error as Error, {
        attemptedAction: 'loadData',
      });
      throw error;
    }
  };

  const handleExport = async () => {
    componentLogger.info('Export started');
    addBreadcrumb('User clicked export', 'ui');

    try {
      await exportData();
      componentLogger.info('Export completed');
      addBreadcrumb('Export completed', 'export', 'info');
    } catch (error) {
      componentLogger.error('Export failed', error as Error);
      addBreadcrumb('Export failed', 'export', 'error');
    }
  };

  return (
    <div>
      <button onClick={loadData}>Load</button>
      <button onClick={handleExport}>Export</button>
    </div>
  );
}
```

---

## 🚦 Log Flow

```
logError() called
  ↓
Create LogEntry
  ↓
├─→ Store in memory array
│   └─→ Persist to localStorage (if enabled)
│
├─→ Console output (if enabled)
│   └─→ Formatted with emoji, color, context
│
├─→ Sentry (if enabled && error/fatal)
│   └─→ Send with tags, contexts, breadcrumbs
│
└─→ LogRocket (future)
    └─→ Custom integration
```

---

## 📊 Monitoring in Production

### Sentry Dashboard

All errors and fatal logs appear in Sentry with:
- Full stack trace
- Component and action tags
- Extra context data
- User breadcrumbs
- Session replay (if LogRocket enabled)

### Log Analysis

Download logs periodically and analyze:

```typescript
// In admin panel
import { downloadLogs } from './utils/logger';

<button onClick={() => downloadLogs('json')}>
  Download Logs
</button>
```

Then analyze with tools like:
- Excel (CSV format)
- LogStash
- Splunk
- Custom analytics

---

## ✅ Summary

✅ **Centralized logger** created in `src/utils/logger.ts`
✅ **5 log levels** - debug, info, warn, error, fatal
✅ **Console output** - formatted with emojis and colors
✅ **Sentry integration** - automatic error reporting
✅ **Persistent storage** - localStorage with max limit
✅ **Export functionality** - JSON and CSV formats
✅ **Integrated** with apiClient, ErrorBoundary, useErrorHandler
✅ **Breadcrumbs** for user journey tracking
✅ **Component loggers** for easy per-component logging
✅ **Performance logging** - timers and async wrappers

### Benefits:
- 📝 **Centralized** - One place for all logging
- 🔍 **Searchable** - Find logs by level, component, action
- 📤 **Exportable** - Download for offline analysis
- 🐛 **Debuggable** - Rich context and breadcrumbs
- 📊 **Monitorable** - Sentry integration for production

**Logger system is production-ready!** 📝

---

**Quick Start:**
```typescript
import { logInfo, logError } from './utils/logger';

logInfo('Operation started', { component: 'MyComponent' });
logError('Operation failed', { component: 'MyComponent' }, error);
```

Done! All logs are now centralized and ready for Sentry/LogRocket. 🎉

