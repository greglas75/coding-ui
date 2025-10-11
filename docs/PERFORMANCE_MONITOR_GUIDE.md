# 📊 Performance Monitor - Complete Guide

## ✅ What Has Been Implemented

### 1. Enhanced Performance Monitor Library

**Location:** `src/lib/performanceMonitor.ts`

**Features:**
- ✅ **Web Vitals** - LCP, FID, CLS, FCP, TTFB
- ✅ **API Call Tracking** - Duration, success rate, slowest/fastest
- ✅ **Render Tracking** - Component renders, slow renders
- ✅ **Error Tracking** - API, render, runtime errors
- ✅ **Memory Monitoring** - Heap usage (Chrome/Edge)
- ✅ **Custom Metrics** - Track any performance metric

### 2. PerformanceMonitor DevPanel

**Location:** `src/components/PerformanceMonitor.tsx`

**Features:**
- ✅ **Dev-only** - Only shows in development mode
- ✅ **4 Tabs** - API, Renders, Errors, Memory
- ✅ **Real-time** - Updates every second
- ✅ **Collapsible** - Can minimize to button
- ✅ **Positionable** - 4 corner positions
- ✅ **Actions** - Clear metrics, refresh

### 3. Render Tracking Hook

**Location:** `src/hooks/useRenderTracking.ts`

**Features:**
- ✅ Automatic render counting
- ✅ Slow render detection
- ✅ Props tracking (dev only)
- ✅ HOC for easy integration

### 4. API Client Integration

**Location:** `src/services/apiClient.ts`

**Features:**
- ✅ Automatic tracking of all API calls
- ✅ Duration measurement
- ✅ Success/failure tracking
- ✅ Response size tracking

---

## 🚀 Usage

### Add PerformanceMonitor to App

```typescript
import { PerformanceMonitor } from './components/PerformanceMonitor';

function App() {
  return (
    <>
      <YourApp />

      {/* Only shows in development */}
      <PerformanceMonitor position="bottom-right" />
    </>
  );
}
```

That's it! The monitor will now track:
- ✅ All API calls automatically
- ✅ Component renders (when using useRenderTracking)
- ✅ Errors
- ✅ Memory usage
- ✅ Web Vitals

### Track Component Renders

```typescript
import { useRenderTracking } from './hooks/useRenderTracking';

function MyComponent({ data }) {
  // Add this one line!
  useRenderTracking('MyComponent');

  return <div>{/* your component */}</div>;
}
```

### Track Custom Metrics

```typescript
import { trackCustomMetric } from './lib/performanceMonitor';

function heavyComputation() {
  const start = performance.now();

  // Your heavy operation
  const result = processData();

  const duration = performance.now() - start;
  trackCustomMetric('Data Processing', duration);

  return result;
}
```

### Track Async Operations

```typescript
import { measurePerformanceAsync } from './lib/performanceMonitor';

const result = await measurePerformanceAsync('Fetch Users', async () => {
  return await apiClient.get('/users');
});
// Automatically logged: ⏱️ Fetch Users: 234ms
```

---

## 📊 DevPanel Features

### API Tab

Shows:
- Total API calls
- Success count
- Failed count
- Average duration
- Recent 10 calls with status
- Slowest & fastest calls

**Example:**
```
Total Calls:   45
Success:       42
Failed:        3
Avg Time:      156ms

Recent API Calls:
✅ GET /api/categories  120ms
❌ POST /api/codes      2400ms (SLOW!)
✅ GET /api/answers     89ms
```

### Renders Tab

Shows:
- Total renders
- Slow renders (>16ms)
- Average render duration
- Top 10 components by render count
- Recent slow renders

**Example:**
```
Total:         1,234
Slow (>16ms):  15
Avg Duration:  4.23ms

Top Components:
CodingGrid     245×
CodeListTable  123×
FilterBar      89×

⚠️ Slow Renders:
CodingGrid: 24.56ms
DataTable: 18.92ms
```

### Errors Tab

Shows:
- Total errors
- Errors by type (API, Runtime)
- Recent 20 errors with details

**Example:**
```
Total:   7
API:     3
Runtime: 4

Recent Errors:
API - Failed to fetch categories
Runtime - Cannot read property 'id'
```

### Memory Tab

Shows:
- JS Heap used
- JS Heap total
- JS Heap limit
- Web Vitals (LCP, FID, CLS, etc.)
- Overall performance score

**Example:**
```
Heap Used:   45 MB
Heap Total:  89 MB
Heap Limit:  2048 MB

Web Vitals:
✅ LCP: 1200ms (good)
✅ FID: 50ms (good)
⚠️ CLS: 0.15 (needs improvement)

Performance Score: 85
✅ Excellent
```

---

## 🎯 API Reference

### performanceMonitor.ts

```typescript
// Track API call
trackAPICall({
  endpoint: '/api/users',
  method: 'GET',
  duration: 234,
  status: 200,
  success: true,
  timestamp: Date.now(),
  size: 1024, // bytes (optional)
});

// Track render
trackRender('MyComponent', 12.5, { propName: 'value' });

// Track error
trackError(new Error('Failed'), 'api', 'fetchUsers');

// Track custom metric
trackCustomMetric('Image Processing', 567);

// Get all metrics
const allMetrics = getAllMetrics();

// Clear all metrics
clearAllMetrics();
```

### useRenderTracking Hook

```typescript
function MyComponent(props) {
  const { renderCount, trackProps } = useRenderTracking('MyComponent', {
    enabled: true,
    logSlowRenders: true,
    slowThreshold: 16,
    trackProps: true,
  });

  // Optionally track props changes
  useEffect(() => {
    trackProps(props);
  }, [props]);

  console.log(`Rendered ${renderCount} times`);

  return <div>...</div>;
}
```

### HOC for Render Tracking

```typescript
import { withRenderTracking } from './hooks/useRenderTracking';

function MyComponent() {
  return <div>...</div>;
}

// Wrap component
export default withRenderTracking(MyComponent, 'MyComponent');
```

### PerformanceMonitor Component

```typescript
<PerformanceMonitor
  position="bottom-right"  // or bottom-left, top-right, top-left
  updateInterval={1000}     // Update every 1 second
  autoHide={false}          // Start collapsed
/>
```

---

## 📈 Metrics Explained

### API Metrics

| Metric | Description | Good Value |
|--------|-------------|------------|
| Total Calls | All API calls made | N/A |
| Success | Successful calls (2xx) | High |
| Failed | Failed calls (4xx, 5xx) | Low |
| Average Duration | Mean response time | < 500ms |
| Slowest Call | Longest API call | < 3000ms |

### Render Metrics

| Metric | Description | Good Value |
|--------|-------------|------------|
| Total Renders | All component renders | N/A |
| Slow Renders | Renders > 16ms | Low |
| Avg Duration | Mean render time | < 10ms |
| Component Count | Renders per component | Moderate |

### Memory Metrics

| Metric | Description | Good Value |
|--------|-------------|------------|
| Heap Used | Current memory usage | < 50 MB |
| Heap Total | Allocated memory | < 100 MB |
| Heap Limit | Maximum available | Usually 2048 MB |

### Web Vitals

| Metric | Description | Good | Needs Improvement | Poor |
|--------|-------------|------|-------------------|------|
| LCP | Largest Contentful Paint | ≤ 2.5s | 2.5-4.0s | > 4.0s |
| FID | First Input Delay | ≤ 100ms | 100-300ms | > 300ms |
| CLS | Cumulative Layout Shift | ≤ 0.1 | 0.1-0.25 | > 0.25 |
| FCP | First Contentful Paint | ≤ 1.8s | 1.8-3.0s | > 3.0s |
| TTFB | Time to First Byte | ≤ 800ms | 800-1800ms | > 1800ms |

---

## 🎯 Best Practices

### 1. Track Important Components

```typescript
// ✅ Good - track heavy components
function DataTable() {
  useRenderTracking('DataTable');
  // ...
}

// ❌ Skip - too simple
function Button() {
  useRenderTracking('Button'); // Overkill
  // ...
}
```

### 2. Monitor API Performance

API calls are automatically tracked! Just check the monitor:

```typescript
// This is automatically tracked:
await get('/api/data');

// No manual tracking needed!
```

### 3. Track Custom Operations

```typescript
// ✅ Good - track expensive operations
const result = await measurePerformanceAsync('Export Excel', async () => {
  return await exportToExcel(data);
});

// Shows: ⏱️ Export Excel: 1234ms
```

### 4. Review Metrics Regularly

Check Performance Monitor to identify:
- 🐌 Slow API calls (> 3s)
- 🐌 Slow renders (> 16ms)
- ⚠️ Excessive renders (same component > 100x)
- ❌ API failures
- 💾 Memory leaks (growing heap)

---

## 🔍 Debugging Performance Issues

### Issue: Slow API Calls

**Monitor shows:**
```
🐌 Slow API call: GET /api/answers took 5234ms
```

**Solutions:**
1. Add pagination/lazy loading
2. Optimize database queries
3. Add caching
4. Use CDN for static assets

### Issue: Excessive Renders

**Monitor shows:**
```
⚠️ CodingGrid has rendered 245 times
```

**Solutions:**
1. Add `memo()` to component
2. Use `useMemo()` for expensive calculations
3. Use `useCallback()` for functions passed as props
4. Check if props are changing unnecessarily

### Issue: Slow Renders

**Monitor shows:**
```
🐌 Slow render: DataTable took 24.56ms
```

**Solutions:**
1. Use virtualization (`react-window`)
2. Lazy load heavy components
3. Reduce component complexity
4. Profile with React DevTools

### Issue: Memory Leaks

**Monitor shows:**
```
Heap Used growing: 45MB → 89MB → 134MB
```

**Solutions:**
1. Clean up useEffect subscriptions
2. Cancel pending API calls on unmount
3. Clear intervals/timeouts
4. Remove event listeners

---

## 🎨 Integration Examples

### Example: Production App

```typescript
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { initPerformanceMonitoring } from './lib/performanceMonitor';

function App() {
  useEffect(() => {
    // Initialize Web Vitals tracking
    initPerformanceMonitoring();
  }, []);

  return (
    <ErrorBoundary>
      <YourApp />

      {/* DevPanel - only in development */}
      {import.meta.env.DEV && (
        <PerformanceMonitor position="bottom-right" />
      )}
    </ErrorBoundary>
  );
}
```

### Example: Heavy Component

```typescript
import { memo } from 'react';
import { useRenderTracking } from './hooks/useRenderTracking';

const DataTable = memo(function DataTable({ data }) {
  // Track renders
  useRenderTracking('DataTable', {
    logSlowRenders: true,
    slowThreshold: 16,
  });

  // ... heavy rendering logic

  return <table>...</table>;
});
```

### Example: API Integration

API tracking is automatic! Just use the API client:

```typescript
import { get } from './services/apiClient';

// This is automatically tracked in Performance Monitor
const data = await get('/api/users');

// Check DevPanel → API tab to see:
// - How long it took
// - If it succeeded
// - Response size
```

---

## 📊 Performance Optimization Workflow

### Step 1: Enable Performance Monitor

```typescript
<PerformanceMonitor position="bottom-right" />
```

### Step 2: Use Your App

Navigate through pages, perform actions, load data.

### Step 3: Check Metrics

Open Performance Monitor and review:

**API Tab:**
- Are any calls > 3s? → Optimize backend or add caching
- High failure rate? → Check error handling

**Renders Tab:**
- Components rendering > 100x? → Add memo()
- Slow renders > 16ms? → Use virtualization

**Errors Tab:**
- Any errors? → Fix them!

**Memory Tab:**
- Heap growing? → Memory leak, add cleanup
- Poor Web Vitals? → Optimize loading

### Step 4: Optimize

Based on findings:
- Add virtualization for large lists
- Add memo() to heavy components
- Optimize API calls
- Fix memory leaks

### Step 5: Verify

Clear metrics, use app again, check improvements!

---

## 🎯 What to Monitor

### Critical Metrics

1. **API Average Duration** - Should be < 500ms
2. **API Failure Rate** - Should be < 5%
3. **Slow Renders** - Should be < 10% of total
4. **Memory Growth** - Should be stable (not growing)
5. **LCP** - Should be < 2.5s
6. **CLS** - Should be < 0.1

### Warning Signs

🚨 **Immediate Action Needed:**
- API calls > 10s
- Renders > 100ms
- Memory growing continuously
- Error rate > 20%

⚠️ **Should Investigate:**
- API calls 3-10s
- Renders 16-50ms
- Component renders > 100x
- Error rate 5-20%

✅ **Healthy:**
- API calls < 3s
- Renders < 16ms
- Stable memory usage
- Error rate < 5%

---

## 📚 API Reference

### trackAPICall()

```typescript
trackAPICall({
  endpoint: string;      // e.g., '/api/users'
  method: string;        // GET, POST, etc.
  duration: number;      // milliseconds
  status: number;        // HTTP status code
  success: boolean;      // true if 2xx
  timestamp: number;     // Date.now()
  size?: number;         // Response size in bytes
});
```

### trackRender()

```typescript
trackRender(
  componentName: string,  // e.g., 'CodingGrid'
  duration: number,       // milliseconds
  props?: any            // Component props (dev only)
);
```

### trackError()

```typescript
trackError(
  error: Error,
  type: 'api' | 'render' | 'runtime',
  context?: string
);
```

### trackCustomMetric()

```typescript
trackCustomMetric(
  name: string,      // e.g., 'Image Processing'
  durationMs: number // milliseconds
);
```

### getAllMetrics()

```typescript
const metrics = getAllMetrics();

// Returns:
{
  performance: {
    score: number,
    metrics: PerformanceMetric[],
    summary: string,
  },
  api: {
    stats: { totalCalls, successfulCalls, ... },
    recentCalls: APICallMetric[],
  },
  renders: {
    stats: { totalRenders, slowRenders, ... },
    recentRenders: RenderMetric[],
    slowRenders: RenderMetric[],
  },
  errors: {
    total: number,
    byType: { api, render, runtime },
    recent: ErrorMetric[],
  },
  memory: {
    usedJSHeapSize: string,
    totalJSHeapSize: string,
    jsHeapSizeLimit: string,
  } | null
}
```

---

## 🎨 DevPanel UI

### Collapsed State

```
┌────────┐
│   📊   │  ← Click to expand
└────────┘
```

### Expanded State

```
┌─────────────────────────────────┐
│ 📊 Performance Monitor    🗑️ ↻ ▼ │
├─────────────────────────────────┤
│  API | Renders | Errors | Memory│
├─────────────────────────────────┤
│                                  │
│  Total Calls:  45                │
│  Success:      42                │
│  Failed:       3                 │
│  Avg Time:     156ms             │
│                                  │
│  Recent API Calls:               │
│  ✅ GET /categories  120ms       │
│  ❌ POST /codes      2400ms      │
│  ✅ GET /answers     89ms        │
│                                  │
├─────────────────────────────────┤
│ ⚡ 45 API  ⏰ 1234 renders  17:58 │
└─────────────────────────────────┘
```

---

## 🔧 Configuration

### Position

```typescript
<PerformanceMonitor position="bottom-right" />  // Default
<PerformanceMonitor position="bottom-left" />
<PerformanceMonitor position="top-right" />
<PerformanceMonitor position="top-left" />
```

### Update Interval

```typescript
<PerformanceMonitor updateInterval={500} />   // Update every 500ms
<PerformanceMonitor updateInterval={2000} />  // Update every 2s
```

### Auto-Hide

```typescript
<PerformanceMonitor autoHide={true} />  // Start collapsed
<PerformanceMonitor autoHide={false} /> // Start expanded
```

---

## 📊 Real-World Example

```typescript
import { useEffect } from 'react';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { initPerformanceMonitoring } from './lib/performanceMonitor';
import { useRenderTracking } from './hooks/useRenderTracking';

function App() {
  useEffect(() => {
    initPerformanceMonitoring();
  }, []);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/coding" element={<CodingPage />} />
        </Routes>
      </Router>

      {/* Dev Panel */}
      <PerformanceMonitor position="bottom-right" />
    </>
  );
}

function CodingPage() {
  // Track this component's renders
  useRenderTracking('CodingPage');

  const { data } = useQuery('answers', async () => {
    // API call is automatically tracked!
    return await get('/api/answers');
  });

  return (
    <div>
      <h1>Coding Page</h1>
      {/* Your content */}
    </div>
  );
}
```

---

## 🎯 Optimization Checklist

Use Performance Monitor to check:

### API Performance
- [ ] Average API time < 500ms?
- [ ] No calls > 5s?
- [ ] Success rate > 95%?
- [ ] Using caching where appropriate?

### Render Performance
- [ ] Average render < 10ms?
- [ ] Slow renders < 10% of total?
- [ ] Heavy components memoized?
- [ ] Using virtualization for long lists?

### Memory
- [ ] Heap usage stable (not growing)?
- [ ] Heap used < 100 MB?
- [ ] No memory leaks?
- [ ] Cleanup in useEffect?

### Web Vitals
- [ ] LCP < 2.5s?
- [ ] FID < 100ms?
- [ ] CLS < 0.1?
- [ ] FCP < 1.8s?
- [ ] TTFB < 800ms?

---

## 🐛 Troubleshooting

### Issue: DevPanel not showing

**Solution:**
- Check that you're in development mode (`npm run dev`)
- Check that component is rendered: `<PerformanceMonitor />`

### Issue: No API metrics

**Solution:**
- Ensure you're using `apiClient` from `services/apiClient.ts`
- Check that `trackAPICall` is imported and called

### Issue: No render metrics

**Solution:**
- Add `useRenderTracking()` to components you want to track
- Or use `withRenderTracking()` HOC

### Issue: Memory metrics not showing

**Solution:**
- Memory API only available in Chrome and Edge
- Use Chrome DevTools for more detailed memory profiling

---

## ✅ Summary

✅ **performanceMonitor.ts enhanced** with API, render, error tracking
✅ **PerformanceMonitor.tsx created** - Full DevPanel UI
✅ **useRenderTracking hook created** - Easy component tracking
✅ **API Client integrated** - Automatic API tracking
✅ **Examples created** - `src/components/examples/PerformanceMonitorExample.tsx`
✅ **Documentation complete**

### Benefits:
- 📊 **Real-time metrics** - See performance as you develop
- 🐛 **Easier debugging** - Identify bottlenecks quickly
- ⚡ **Better optimization** - Data-driven decisions
- 📈 **Track improvements** - Measure before/after

**Performance monitoring is production-ready!** 📊

---

**Quick Start:**
```typescript
import { PerformanceMonitor } from './components/PerformanceMonitor';

<App>
  <YourApp />
  <PerformanceMonitor />
</App>
```

Done! Check the bottom-right corner for the dev panel. 🎉

