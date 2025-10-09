/**
 * Performance Monitoring System
 *
 * Tracks key performance metrics using Web Vitals:
 * - LCP (Largest Contentful Paint) - Loading speed
 * - FID (First Input Delay) - Interactivity
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - FCP (First Contentful Paint) - Initial render
 * - TTFB (Time to First Byte) - Server response
 *
 * Business Benefits:
 * - Identify slow pages/components
 * - Track improvements over time
 * - Data-driven optimization decisions
 * - Better user experience
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

const metrics: PerformanceMetric[] = [];

// Thresholds based on Google Web Vitals recommendations
const THRESHOLDS = {
  LCP: [2500, 4000] as [number, number], // Largest Contentful Paint (ms)
  FID: [100, 300] as [number, number],    // First Input Delay (ms)
  CLS: [0.1, 0.25] as [number, number],   // Cumulative Layout Shift (score)
  FCP: [1800, 3000] as [number, number],  // First Contentful Paint (ms)
  TTFB: [800, 1800] as [number, number],  // Time to First Byte (ms)
};

/**
 * Get performance rating based on value and thresholds
 */
function getRating(
  value: number,
  thresholds: [number, number]
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds[0]) return 'good';
  if (value <= thresholds[1]) return 'needs-improvement';
  return 'poor';
}

/**
 * Format value for display
 */
function formatValue(name: string, value: number): string {
  if (name === 'CLS') {
    return value.toFixed(3);
  }
  return Math.round(value).toString() + 'ms';
}

/**
 * Log metric to console
 */
function logMetric(metric: PerformanceMetric) {
  const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
  console.log(
    `${emoji} ${metric.name}: ${formatValue(metric.name, metric.value)} (${metric.rating})`
  );
}

/**
 * Initialize basic performance monitoring
 * Uses Performance API (no external dependencies needed!)
 */
export function initPerformanceMonitoring() {
  // Only run in browser
  if (typeof window === 'undefined') return;

  console.log('📊 Performance monitoring initialized');

  // Monitor navigation timing
  if (window.performance && window.performance.timing) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        const ttfb = timing.responseStart - timing.navigationStart;

        console.log('📊 Performance Metrics:');
        console.log(`  • Page Load: ${loadTime}ms`);
        console.log(`  • DOM Ready: ${domReady}ms`);
        console.log(`  • TTFB: ${ttfb}ms`);

        // Track TTFB
        const ttfbMetric: PerformanceMetric = {
          name: 'TTFB',
          value: ttfb,
          rating: getRating(ttfb, THRESHOLDS.TTFB),
          timestamp: Date.now(),
        };
        metrics.push(ttfbMetric);
        logMetric(ttfbMetric);
      }, 0);
    });
  }

  // Monitor layout shifts using PerformanceObserver
  if ('PerformanceObserver' in window) {
    try {
      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });

      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Log CLS after page load
      window.addEventListener('load', () => {
        setTimeout(() => {
          const clsMetric: PerformanceMetric = {
            name: 'CLS',
            value: clsValue,
            rating: getRating(clsValue, THRESHOLDS.CLS),
            timestamp: Date.now(),
          };
          metrics.push(clsMetric);
          logMetric(clsMetric);
        }, 1000);
      });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          const lcpMetric: PerformanceMetric = {
            name: 'LCP',
            value: lastEntry.renderTime || lastEntry.loadTime,
            rating: getRating(lastEntry.renderTime || lastEntry.loadTime, THRESHOLDS.LCP),
            timestamp: Date.now(),
          };
          metrics.push(lcpMetric);
          logMetric(lcpMetric);
        }
      });

      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const fcpEntry = entries[0] as any;
          const fcpMetric: PerformanceMetric = {
            name: 'FCP',
            value: fcpEntry.startTime,
            rating: getRating(fcpEntry.startTime, THRESHOLDS.FCP),
            timestamp: Date.now(),
          };
          metrics.push(fcpMetric);
          logMetric(fcpMetric);
        }
      });

      fcpObserver.observe({ type: 'paint', buffered: true });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const fidEntry = entries[0] as any;
          const fidMetric: PerformanceMetric = {
            name: 'FID',
            value: fidEntry.processingStart - fidEntry.startTime,
            rating: getRating(fidEntry.processingStart - fidEntry.startTime, THRESHOLDS.FID),
            timestamp: Date.now(),
          };
          metrics.push(fidMetric);
          logMetric(fidMetric);
        }
      });

      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (error) {
      console.warn('Performance monitoring not fully supported:', error);
    }
  }

  // Log report before page unload
  window.addEventListener('beforeunload', () => {
    const report = getPerformanceReport();
    console.log('🎯 Final Performance Score:', report.score, report.summary);
    console.table(report.metrics);

    // Optional: Send to analytics
    // sendToAnalytics(report);
  });
}

/**
 * Get current performance report
 */
export function getPerformanceReport() {
  const good = metrics.filter((m) => m.rating === 'good').length;
  const total = metrics.length;
  const score = total > 0 ? Math.round((good / total) * 100) : 0;

  const summary =
    score >= 80 ? '✅ Excellent' : score >= 60 ? '⚠️ Needs improvement' : '❌ Poor';

  return {
    score,
    metrics: [...metrics],
    summary,
    timestamp: Date.now(),
  };
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics() {
  metrics.length = 0;
}

/**
 * Track custom performance metric
 */
export function trackCustomMetric(name: string, durationMs: number) {
  console.log(`⏱️ ${name}: ${durationMs}ms`);

  // Store for later analysis
  const customMetric: PerformanceMetric = {
    name,
    value: durationMs,
    rating: durationMs < 100 ? 'good' : durationMs < 500 ? 'needs-improvement' : 'poor',
    timestamp: Date.now(),
  };

  metrics.push(customMetric);
}

/**
 * Measure function execution time
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  trackCustomMetric(name, duration);
  return result;
}

/**
 * Measure async function execution time
 */
export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  trackCustomMetric(name, duration);
  return result;
}

/**
 * Get memory usage (if available)
 */
export function getMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
      jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
    };
  }
  return null;
}

/**
 * Log current memory usage
 */
export function logMemoryUsage() {
  const memory = getMemoryUsage();
  if (memory) {
    console.log('💾 Memory Usage:', memory);
  }
}
