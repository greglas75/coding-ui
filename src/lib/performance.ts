// ═══════════════════════════════════════════════════════════════
// 📊 Performance Monitoring System
// Tracks Core Web Vitals and custom performance metrics
// ═══════════════════════════════════════════════════════════════

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { simpleLogger } from '../utils/logger';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
}

export interface CustomMark {
  name: string;
  startTime: number;
  duration?: number;
}

export interface APIPerformance {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
}

// ───────────────────────────────────────────────────────────────
// Configuration
// ───────────────────────────────────────────────────────────────

const PERFORMANCE_BUDGETS = {
  // Core Web Vitals thresholds (good/needs-improvement)
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (ms)

  // Custom budgets
  API_RESPONSE: 500, // Max API response time (ms)
  INITIAL_LOAD: 3000, // Max initial load time (ms)
  BUNDLE_SIZE: 500 * 1024, // Max bundle size (500KB)
} as const;

// Storage for metrics
const metrics: PerformanceMetric[] = [];
const apiMetrics: APIPerformance[] = [];
const customMarks = new Map<string, CustomMark>();

// ───────────────────────────────────────────────────────────────
// Core Web Vitals Tracking
// ───────────────────────────────────────────────────────────────

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const budget = PERFORMANCE_BUDGETS[name as keyof typeof PERFORMANCE_BUDGETS];

  if (typeof budget === 'object' && 'good' in budget && 'poor' in budget) {
    if (value <= budget.good) return 'good';
    if (value <= budget.poor) return 'needs-improvement';
    return 'poor';
  }

  return 'good';
}

function handleMetric(metric: Metric) {
  const performanceMetric: PerformanceMetric = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    timestamp: Date.now(),
    url: window.location.pathname,
  };

  metrics.push(performanceMetric);

  // Log in development
  if (import.meta.env.DEV) {
    const emoji =
      performanceMetric.rating === 'good'
        ? '✅'
        : performanceMetric.rating === 'needs-improvement'
          ? '⚠️'
          : '❌';
    simpleLogger.info(
      `${emoji} ${metric.name}: ${Math.round(metric.value)}ms (${performanceMetric.rating})`
    );
  }

  // Send to analytics in production
  if (import.meta.env.PROD) {
    sendToAnalytics(performanceMetric);
  }

  // Warn about poor performance
  if (performanceMetric.rating === 'poor') {
    simpleLogger.warn(`Poor ${metric.name} detected: ${Math.round(metric.value)}ms`, {
      threshold: PERFORMANCE_BUDGETS[metric.name as keyof typeof PERFORMANCE_BUDGETS],
      url: window.location.pathname,
    });
  }
}

export function initWebVitals() {
  if (typeof window === 'undefined') return;

  onCLS(handleMetric);
  onFCP(handleMetric);
  onLCP(handleMetric);
  onTTFB(handleMetric);
  onINP(handleMetric);

  simpleLogger.info('📊 Web Vitals monitoring initialized');
}

// ───────────────────────────────────────────────────────────────
// Custom Performance Marks
// ───────────────────────────────────────────────────────────────

export function mark(name: string) {
  if (typeof window === 'undefined' || !window.performance) return;

  const startTime = performance.now();
  customMarks.set(name, { name, startTime });

  if (import.meta.env.DEV) {
    simpleLogger.info(`⏱️ Performance mark: ${name}`);
  }
}

export function measure(name: string, startMark?: string): number | undefined {
  if (typeof window === 'undefined' || !window.performance) return;

  const endTime = performance.now();

  if (startMark) {
    const start = customMarks.get(startMark);
    if (start) {
      const duration = endTime - start.startTime;
      start.duration = duration;

      if (import.meta.env.DEV) {
        simpleLogger.info(`⏱️ ${name}: ${Math.round(duration)}ms`);
      }

      return duration;
    }
  }

  return;
}

// ───────────────────────────────────────────────────────────────
// API Performance Tracking
// ───────────────────────────────────────────────────────────────

export function trackAPICall(endpoint: string, method: string, duration: number, status: number) {
  const metric: APIPerformance = {
    endpoint,
    method,
    duration,
    status,
    timestamp: Date.now(),
  };

  apiMetrics.push(metric);

  // Warn if exceeds budget
  if (duration > PERFORMANCE_BUDGETS.API_RESPONSE) {
    simpleLogger.warn(`⚠️ Slow API call: ${method} ${endpoint} took ${Math.round(duration)}ms`, {
      budget: PERFORMANCE_BUDGETS.API_RESPONSE,
      actual: duration,
    });
  }

  if (import.meta.env.DEV) {
    const emoji = duration < PERFORMANCE_BUDGETS.API_RESPONSE ? '✅' : '⚠️';
    simpleLogger.info(`${emoji} API ${method} ${endpoint}: ${Math.round(duration)}ms`);
  }
}

// ───────────────────────────────────────────────────────────────
// Component Render Tracking
// ───────────────────────────────────────────────────────────────

export function trackComponentRender(
  componentName: string,
  duration: number,
  renderCount?: number
) {
  // Warn about slow renders (> 16ms = 60fps threshold)
  if (duration > 16) {
    simpleLogger.warn(`🐌 Slow render: ${componentName} took ${duration.toFixed(2)}ms`, {
      renderCount,
    });
  }

  if (import.meta.env.DEV && duration > 5) {
    simpleLogger.info(`🎨 ${componentName} rendered in ${duration.toFixed(2)}ms`, { renderCount });
  }
}

// ───────────────────────────────────────────────────────────────
// Analytics Integration
// ───────────────────────────────────────────────────────────────

function sendToAnalytics(metric: PerformanceMetric) {
  // TODO: Send to your analytics service (Google Analytics, Sentry, etc.)
  // Example with Google Analytics 4:
  // gtag('event', 'web_vitals', {
  //   event_category: 'Web Vitals',
  //   event_label: metric.name,
  //   value: Math.round(metric.value),
  //   metric_rating: metric.rating,
  // });

  // Example with custom endpoint:
  // fetch('/api/analytics/vitals', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(metric),
  // });

  if (import.meta.env.DEV) {
    simpleLogger.info('Would send to analytics:', metric);
  }
}

// ───────────────────────────────────────────────────────────────
// Getters for Monitoring
// ───────────────────────────────────────────────────────────────

export function getAllMetrics(): PerformanceMetric[] {
  return [...metrics];
}

export function getAPIMetrics(): APIPerformance[] {
  return [...apiMetrics];
}

export function getCustomMarks(): CustomMark[] {
  return Array.from(customMarks.values());
}

export function getMetricsByRating(
  rating: 'good' | 'needs-improvement' | 'poor'
): PerformanceMetric[] {
  return metrics.filter(m => m.rating === rating);
}

export function getSlowAPICalls(threshold = PERFORMANCE_BUDGETS.API_RESPONSE): APIPerformance[] {
  return apiMetrics.filter(m => m.duration > threshold);
}

// ───────────────────────────────────────────────────────────────
// Performance Report
// ───────────────────────────────────────────────────────────────

export function generatePerformanceReport(): {
  webVitals: {
    total: number;
    good: number;
    needsImprovement: number;
    poor: number;
  };
  api: {
    total: number;
    slow: number;
    avgDuration: number;
  };
  recommendations: string[];
} {
  const poorMetrics = getMetricsByRating('poor');
  const needsImprovementMetrics = getMetricsByRating('needs-improvement');
  const slowAPIs = getSlowAPICalls();

  const recommendations: string[] = [];

  // Web Vitals recommendations
  if (poorMetrics.some(m => m.name === 'LCP')) {
    recommendations.push(
      'Optimize Largest Contentful Paint: lazy load images, reduce server response time'
    );
  }
  if (poorMetrics.some(m => m.name === 'FID')) {
    recommendations.push('Reduce First Input Delay: minimize JavaScript execution time');
  }
  if (poorMetrics.some(m => m.name === 'CLS')) {
    recommendations.push('Fix Cumulative Layout Shift: add size attributes to images and videos');
  }

  // API recommendations
  if (slowAPIs.length > 0) {
    recommendations.push(
      `Optimize ${slowAPIs.length} slow API calls: implement caching, pagination`
    );
  }

  const avgApiDuration =
    apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length
      : 0;

  return {
    webVitals: {
      total: metrics.length,
      good: getMetricsByRating('good').length,
      needsImprovement: needsImprovementMetrics.length,
      poor: poorMetrics.length,
    },
    api: {
      total: apiMetrics.length,
      slow: slowAPIs.length,
      avgDuration: avgApiDuration,
    },
    recommendations,
  };
}

// ───────────────────────────────────────────────────────────────
// Export budgets for reference
// ───────────────────────────────────────────────────────────────

export { PERFORMANCE_BUDGETS };
