# 📊 Performance Monitoring & Optimization

Comprehensive performance monitoring system with Core Web Vitals tracking, bundle analysis, and performance budgets.

## 🎯 Core Web Vitals Tracked

The application automatically tracks all Core Web Vitals metrics:

- **LCP (Largest Contentful Paint)** - Main content load time
  - Good: ≤ 2.5s | Needs Improvement: ≤ 4s | Poor: > 4s
- **CLS (Cumulative Layout Shift)** - Visual stability
  - Good: ≤ 0.1 | Needs Improvement: ≤ 0.25 | Poor: > 0.25
- **FCP (First Contentful Paint)** - First content render
  - Good: ≤ 1.8s | Needs Improvement: ≤ 3s | Poor: > 3s
- **TTFB (Time to First Byte)** - Server response time
  - Good: ≤ 800ms | Needs Improvement: ≤ 1.8s | Poor: > 1.8s
- **INP (Interaction to Next Paint)** - Input responsiveness
  - Good: ≤ 200ms | Needs Improvement: ≤ 500ms | Poor: > 500ms

**Note**: FID (First Input Delay) has been deprecated and replaced by INP in web-vitals v5.

## 🛠️ How It Works

### 1. Automatic Initialization

Performance monitoring starts automatically when the app loads:

```typescript
// src/main.tsx
import { initPerformanceMonitoring } from './lib/performanceMonitor';

// Initialize on app start
initPerformanceMonitoring();
```

### 2. Development Monitor (Dev Only)

A floating performance monitor appears in development mode:

```tsx
// src/App.tsx
{
  import.meta.env.DEV && <PerformanceMonitor />;
}
```

Features:

- Real-time Core Web Vitals display
- API call tracking with timing
- Component render performance
- Error tracking
- Memory usage (Chrome/Edge only)

### 3. Production Monitoring

In production:

- Metrics are sent to Sentry for monitoring
- Only poor-performing metrics are reported to reduce noise
- No UI is displayed (silent monitoring)

## 📦 Bundle Analysis

### Running Bundle Analysis

```bash
# Generate interactive bundle size visualization
npm run build:analyze

# Or manually:
ANALYZE=true npm run build
```

This creates `dist/stats.html` showing:

- Bundle size by chunk
- Gzipped and Brotli sizes
- Treemap visualization
- Module dependencies

### Performance Budgets

Current budgets (enforced via warnings):

- **Total Bundle Size**: 500KB (initial load)
- **API Response Time**: 500ms max
- **Initial Page Load**: 3s max
- **Component Render**: 16ms (60fps)

### Code Splitting Strategy

```typescript
// vite.config.ts - Manual chunks for optimal loading
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'query-vendor': ['@tanstack/react-query'],
  'excel-vendor': ['exceljs', 'xlsx', 'papaparse'],
  'charts-vendor': ['recharts'],
  'ai-vendor': ['openai', '@anthropic-ai/sdk'],
}
```

Benefits:

- Parallel downloads
- Better caching
- Faster initial load

## 🔍 Tracking Custom Metrics

### Measuring Function Performance

```typescript
import { PerformanceMonitor } from './lib/performanceMonitor';

// Sync function
const measure = PerformanceMonitor.measure('My Operation', 'api');
// ... do work ...
const duration = measure.end(); // logs duration

// Async function
const result = await PerformanceMonitor.measureAsync('Fetch Data', () => fetchData(), 'api');
```

### Tracking API Calls

```typescript
import { trackAPICall } from './lib/performanceMonitor';

const start = Date.now();
const response = await fetch('/api/data');
const duration = Date.now() - start;

trackAPICall('GET /api/data', 'api');
```

### Component Render Tracking

```typescript
import { trackComponentRender } from './lib/performance';

function MyComponent() {
  useEffect(() => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      trackComponentRender('MyComponent', duration);
    };
  }, []);
}
```

## 📈 Performance Optimization Tips

### 1. Lazy Loading

Already implemented for all major pages:

```typescript
// Reduces initial bundle by ~80%
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
```

### 2. Image Optimization

- Use `loading="lazy"` for images
- Implement proper image sizes
- Use modern formats (WebP, AVIF)

### 3. Code Optimization

- Memoize expensive computations with `useMemo`
- Use `React.memo` for pure components
- Implement virtualization for long lists (already done with react-window)

### 4. Bundle Optimization

```bash
# Check bundle size regularly
npm run build:analyze

# Look for:
# - Duplicate dependencies
# - Large unnecessary imports
# - Missing tree-shaking opportunities
```

## 🐛 Debugging Performance Issues

### View Live Metrics (Development)

1. Open the app in development mode
2. Click the floating performance button (bottom-right)
3. View real-time metrics across tabs:
   - **API**: Call counts, durations, failures
   - **Renders**: Component render times
   - **Errors**: Recent errors
   - **Memory**: Heap usage, Web Vitals

### Console Access (Development)

```javascript
// Access performance monitor from console
window.PerformanceMonitor;

// Get all metrics
window.PerformanceMonitor.getMetrics();

// Get statistics for specific metric
window.PerformanceMonitor.getStats('LCP');

// Get summary
window.PerformanceMonitor.getSummary();

// Export as JSON
window.PerformanceMonitor.download();
```

### Identifying Slow Operations

```javascript
// Get operations slower than 1000ms
window.PerformanceMonitor.getSlowOperations(1000);

// Get API metrics
window.PerformanceMonitor.getMetricsByCategory('api');
```

## 📊 Monitoring in Production

### Sentry Integration

Performance metrics are automatically sent to Sentry:

```typescript
// Poor metrics trigger Sentry breadcrumbs
if (rating === 'poor') {
  Sentry.addBreadcrumb({
    category: 'web-vitals',
    message: `Poor ${metric.name}`,
    level: 'warning',
    data: { value: metric.value, rating },
  });
}
```

### Custom Analytics (Optional)

Extend `src/lib/performance.ts` to send to your analytics:

```typescript
function sendToAnalytics(metric: PerformanceMetric) {
  // Example: Send to Google Analytics
  gtag('event', 'web_vitals', {
    event_category: 'Web Vitals',
    event_label: metric.name,
    value: Math.round(metric.value),
    metric_rating: metric.rating,
  });
}
```

## 🎯 Performance Goals

Current targets:

| Metric       | Target  | Current Status |
| ------------ | ------- | -------------- |
| LCP          | < 2.5s  | ✅ Good        |
| FID          | < 100ms | ✅ Good        |
| CLS          | < 0.1   | ✅ Good        |
| Bundle       | < 500KB | ✅ Optimized   |
| Initial Load | < 3s    | ✅ Fast        |

## 🔧 Configuration Files

- `src/lib/performanceMonitor.ts` - Main monitoring system
- `src/lib/performance.ts` - Core Web Vitals utilities
- `src/components/PerformanceMonitor.tsx` - Dev UI
- `vite.config.ts` - Bundle optimization & analysis
- `package.json` - Scripts: `build:analyze`

## 📚 Resources

- [Web Vitals](https://web.dev/vitals/)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Bundle Analysis](https://github.com/btd/rollup-plugin-visualizer)
