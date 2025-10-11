// ═══════════════════════════════════════════════════════════════
// 📚 Performance Monitor Examples
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRenderTracking } from '../../hooks/useRenderTracking';
import { trackCustomMetric } from '../../lib/performanceMonitor';
import { get } from '../../services/apiClient';
import { PerformanceMonitor } from '../PerformanceMonitor';

/**
 * Example 1: Basic PerformanceMonitor
 */
export function BasicPerformanceMonitorExample() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Performance Monitor Demo</h2>
      <p className="text-sm text-gray-600 mb-6">
        Check the bottom-right corner for the performance monitor panel
      </p>

      <div className="space-y-4">
        <button
          onClick={async () => {
            // This will be tracked automatically!
            try {
              await get('/api/health');
            } catch (error) {
              console.error('API call failed');
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Make API Call (tracked!)
        </button>

        <button
          onClick={() => {
            // Track custom metric
            const start = performance.now();

            // Simulate heavy computation
            for (let i = 0; i < 1000000; i++) {
              Math.sqrt(i);
            }

            const duration = performance.now() - start;
            trackCustomMetric('Heavy Computation', duration);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded"
        >
          Heavy Computation (tracked!)
        </button>
      </div>

      {/* Performance Monitor will show in corner */}
      <PerformanceMonitor position="bottom-right" />
    </div>
  );
}

/**
 * Example 2: Component with Render Tracking
 */
function TrackedComponent({ count }: { count: number }) {
  // Track renders automatically
  useRenderTracking('TrackedComponent', {
    enabled: true,
    logSlowRenders: true,
    slowThreshold: 16,
  });

  // Simulate some work
  useEffect(() => {
    const start = performance.now();

    // Simulate processing
    Array.from({ length: 1000 }, (_, i) => i * count);

    const duration = performance.now() - start;
    trackCustomMetric(`TrackedComponent effect (count=${count})`, duration);
  }, [count]);

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
      <p className="text-sm">This component tracks its renders!</p>
      <p className="text-xs text-gray-600">Count: {count}</p>
    </div>
  );
}

export function RenderTrackingExample() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Render Tracking Example</h2>

      <div className="space-y-4">
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Increment (triggers re-render)
        </button>

        <TrackedComponent count={count} />

        <p className="text-sm text-gray-600">
          Check the Performance Monitor → Renders tab to see render stats
        </p>
      </div>

      <PerformanceMonitor position="bottom-right" />
    </div>
  );
}

/**
 * Example 3: All Positions
 */
export function PositionExample() {
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Performance Monitor Positions</h2>

      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setPosition('bottom-right')}
            className={`px-3 py-2 rounded ${position === 'bottom-right' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Bottom Right
          </button>
          <button
            onClick={() => setPosition('bottom-left')}
            className={`px-3 py-2 rounded ${position === 'bottom-left' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Bottom Left
          </button>
          <button
            onClick={() => setPosition('top-right')}
            className={`px-3 py-2 rounded ${position === 'top-right' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Top Right
          </button>
          <button
            onClick={() => setPosition('top-left')}
            className={`px-3 py-2 rounded ${position === 'top-left' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Top Left
          </button>
        </div>
      </div>

      <PerformanceMonitor position={position} />
    </div>
  );
}

/**
 * All examples combined
 */
export function AllPerformanceMonitorExamples() {
  const [activeExample, setActiveExample] = useState<'basic' | 'tracking' | 'positions'>('basic');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex gap-2 p-4 bg-gray-100 dark:bg-zinc-800">
        <button
          onClick={() => setActiveExample('basic')}
          className={`px-4 py-2 rounded ${
            activeExample === 'basic' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-700'
          }`}
        >
          Basic
        </button>
        <button
          onClick={() => setActiveExample('tracking')}
          className={`px-4 py-2 rounded ${
            activeExample === 'tracking' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-700'
          }`}
        >
          Render Tracking
        </button>
        <button
          onClick={() => setActiveExample('positions')}
          className={`px-4 py-2 rounded ${
            activeExample === 'positions' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-700'
          }`}
        >
          Positions
        </button>
      </div>

      {/* Examples */}
      {activeExample === 'basic' && <BasicPerformanceMonitorExample />}
      {activeExample === 'tracking' && <RenderTrackingExample />}
      {activeExample === 'positions' && <PositionExample />}
    </div>
  );
}

