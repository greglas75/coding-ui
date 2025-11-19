/**
 * ⚡ Performance Monitoring System
 *
 * Tracks performance metrics and sends to Sentry/analytics
 * Only active in development for debugging, silent in production
 */

import * as Sentry from '@sentry/react';
import { simpleLogger } from '../utils/logger';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  category: 'render' | 'api' | 'db' | 'ai' | 'import' | 'export' | 'other';
  metadata?: Record<string, unknown>;
}

class PerformanceMonitorClass {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;

  /**
   * Measure execution time of a function
   *
   * @example
   * const measure = PerformanceMonitor.measure('AI Categorization');
   * await categorizeAnswer(...);
   * const duration = measure.end();
   */
  measure(
    name: string,
    category: PerformanceMetric['category'] = 'other',
    metadata?: Record<string, unknown>
  ) {
    const start = performance.now();
    const startMark = `${name}-start`;

    // Use Performance API for precise timing
    performance.mark(startMark);

    return {
      end: () => {
        const endMark = `${name}-end`;
        performance.mark(endMark);

        try {
          performance.measure(name, startMark, endMark);
        } catch {
          // Measure might not exist
        }

        const duration = performance.now() - start;

        this.record({
          name,
          duration,
          timestamp: Date.now(),
          category,
          metadata,
        });

        // Log in development
        if (import.meta.env.DEV) {
          const emoji = this.getCategoryEmoji(category);
          simpleLogger.info(`${emoji} ${name}: ${duration.toFixed(2)}ms`, metadata || '');

          // Warn if slow
          if (duration > 1000) {
            simpleLogger.warn(`⚠️ SLOW: ${name} took ${duration.toFixed(0)}ms`);
          }
        }

        // Send to Sentry in production (only if > 1s)
        if (import.meta.env.PROD && duration > 1000) {
          Sentry.addBreadcrumb({
            category: 'performance',
            message: name,
            level: 'warning',
            data: {
              duration,
              category,
              ...metadata,
            },
          });
        }

        return duration;
      },

      fail: (error: Error) => {
        const duration = performance.now() - start;

        this.record({
          name: `${name} (FAILED)`,
          duration,
          timestamp: Date.now(),
          category,
          metadata: { ...metadata, error: error.message },
        });

        // Always log errors
        simpleLogger.error(`❌ ${name} failed after ${duration.toFixed(0)}ms:`, error);

        return duration;
      },
    };
  }

  /**
   * Measure async function execution
   *
   * @example
   * const result = await PerformanceMonitor.measureAsync(
   *   'Fetch Categories',
   *   () => fetchCategories(),
   *   'api'
   * );
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    category: PerformanceMetric['category'] = 'other',
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const measure = this.measure(name, category, metadata);

    try {
      const result = await fn();
      measure.end();
      return result;
    } catch (error) {
      measure.fail(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Record performance metric
   */
  private record(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only last N metrics (prevent memory leak)
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * Get slow operations (> threshold ms)
   */
  getSlowOperations(thresholdMs: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  /**
   * Calculate statistics for a metric name
   */
  getStats(name: string) {
    const filtered = this.metrics.filter(m => m.name === name);

    if (filtered.length === 0) {
      return null;
    }

    const durations = filtered.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    // Calculate median
    const sorted = [...durations].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    // Calculate p95 (95th percentile)
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index] || max;

    return {
      count: filtered.length,
      avg: Number(avg.toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      median: Number(median.toFixed(2)),
      p95: Number(p95.toFixed(2)),
      total: Number(sum.toFixed(2)),
    };
  }

  /**
   * Get summary of all performance metrics
   */
  getSummary() {
    const byCategory: Record<string, number> = {};
    let totalDuration = 0;

    for (const metric of this.metrics) {
      byCategory[metric.category] = (byCategory[metric.category] || 0) + metric.duration;
      totalDuration += metric.duration;
    }

    return {
      totalMetrics: this.metrics.length,
      totalDuration: Number(totalDuration.toFixed(2)),
      byCategory,
      slowOps: this.getSlowOperations().length,
    };
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    performance.clearMarks();
    performance.clearMeasures();
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Download metrics as file
   */
  download() {
    const content = this.export();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-metrics-${new Date().toISOString()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Get emoji for category
   */
  private getCategoryEmoji(category: PerformanceMetric['category']): string {
    const emojis: Record<PerformanceMetric['category'], string> = {
      render: '🎨',
      api: '📡',
      db: '🗄️',
      ai: '🤖',
      import: '📥',
      export: '📤',
      other: '⚡',
    };
    return emojis[category] || '⚡';
  }

  /**
   * Start performance observer for Core Web Vitals
   */
  observeCoreWebVitals() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const lcp = entry as PerformanceEntry;
          this.record({
            name: 'LCP (Largest Contentful Paint)',
            duration: lcp.startTime,
            timestamp: Date.now(),
            category: 'render',
            metadata: { entryType: lcp.entryType },
          });

          if (import.meta.env.DEV) {
            simpleLogger.info(`🎯 LCP: ${lcp.startTime.toFixed(0)}ms`);
          }
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      // Observer not supported
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const fid = entry as PerformanceEventTiming;
          const delay = fid.processingStart - fid.startTime;

          this.record({
            name: 'FID (First Input Delay)',
            duration: delay,
            timestamp: Date.now(),
            category: 'render',
          });

          if (import.meta.env.DEV) {
            simpleLogger.info(`⚡ FID: ${delay.toFixed(0)}ms`);
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      // Observer not supported
    }
  }
}

// Singleton instance
export const PerformanceMonitor = new PerformanceMonitorClass();

// Helper exports for easier importing
export const getAllMetrics = () => PerformanceMonitor.getMetrics();
export const clearAllMetrics = () => PerformanceMonitor.clear();
export const getMetricsSummary = () => PerformanceMonitor.getSummary();
export const trackCustomMetric = (
  name: string,
  category: PerformanceMetric['category'] = 'other'
) => PerformanceMonitor.measure(name, category);

// Initialize performance monitoring (called from main.tsx)
export const initPerformanceMonitoring = () => {
  if (typeof window !== 'undefined') {
    PerformanceMonitor.observeCoreWebVitals();
    if (import.meta.env.DEV) {
      simpleLogger.info('⚡ Performance monitoring initialized');
    }
  }
};

// Auto-start Core Web Vitals monitoring
if (typeof window !== 'undefined') {
  PerformanceMonitor.observeCoreWebVitals();
}

// Expose to window for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as Window & { PerformanceMonitor: PerformanceMonitorClass }).PerformanceMonitor = PerformanceMonitor;
  simpleLogger.info('💡 Performance Monitor available: window.PerformanceMonitor');
  simpleLogger.info('   - .getMetrics() - all metrics');
  simpleLogger.info('   - .getSummary() - summary');
  simpleLogger.info('   - .getStats("metric-name") - statistics');
  simpleLogger.info('   - .download() - export JSON');
}

// Export trackAPICall function
export const trackAPICall = (name: string, category: PerformanceMetric['category'] = 'api') =>
  PerformanceMonitor.measure(name, category);

export default PerformanceMonitor;
