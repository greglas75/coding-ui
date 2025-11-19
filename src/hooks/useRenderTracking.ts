// ═══════════════════════════════════════════════════════════════
// 📊 useRenderTracking - Track component render performance
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { simpleLogger } from '../utils/logger';
import { trackRender } from '../lib/performanceMonitor';

export interface RenderTrackingOptions {
  enabled?: boolean;
  logSlowRenders?: boolean;
  slowThreshold?: number; // ms
  trackProps?: boolean;
}

export function useRenderTracking(
  componentName: string,
  options: RenderTrackingOptions = {}
) {
  const {
    enabled = import.meta.env.DEV,
    logSlowRenders = true,
    slowThreshold = 16, // 60fps budget
    trackProps = import.meta.env.DEV,
  } = options;

  const renderCountRef = useRef(0);
  const renderStartRef = useRef(performance.now());
  const propsRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current++;
    const renderDuration = performance.now() - renderStartRef.current;

    // Track this render
    trackRender(componentName, renderDuration, trackProps ? propsRef.current : undefined);

    // Log slow renders
    if (logSlowRenders && renderDuration > slowThreshold) {
      simpleLogger.warn(
        `🐌 Slow render #${renderCountRef.current}: ${componentName} took ${renderDuration.toFixed(2)}ms`
      );
    }

    // Reset timer for next render
    renderStartRef.current = performance.now();
  });

  // Store props for tracking
  const trackPropsUpdate = (props: Record<string, unknown>) => {
    propsRef.current = props;
  };

  return {
    renderCount: renderCountRef.current,
    trackProps: trackPropsUpdate,
  };
}

// ───────────────────────────────────────────────────────────────
// HOC for automatic render tracking
// ───────────────────────────────────────────────────────────────

export function withRenderTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const TrackedComponent = (props: P) => {
    useRenderTracking(componentName || Component.displayName || Component.name || 'Unknown');
    return React.createElement(Component, props);
  };

  TrackedComponent.displayName = `withRenderTracking(${componentName || Component.displayName || Component.name})`;

  return TrackedComponent;
}

