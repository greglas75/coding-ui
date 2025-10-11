// ═══════════════════════════════════════════════════════════════
// 📊 Performance Monitor - Dev Panel for performance metrics
// Shows in bottom-right corner in development mode
// ═══════════════════════════════════════════════════════════════

import {
  Activity,
  AlertCircle,
  ChevronDown,
  Clock,
  RefreshCw,
  Trash2,
  Zap
} from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import {
  clearAllMetrics,
  getAllMetrics,
} from '../lib/performanceMonitor';

interface PerformanceMonitorProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  updateInterval?: number; // ms
  autoHide?: boolean;
}

export const PerformanceMonitor = memo<PerformanceMonitorProps>(({
  position = 'bottom-right',
  updateInterval = 1000,
  autoHide = false,
}) => {
  const [isOpen, setIsOpen] = useState(!autoHide);
  const [activeTab, setActiveTab] = useState<'api' | 'renders' | 'errors' | 'memory'>('api');
  const [metrics, setMetrics] = useState(getAllMetrics());

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getAllMetrics());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  // Don't show in production
  if (!import.meta.env.DEV) return null;

    return (
    <div className={`fixed ${positionClasses[position]} z-[9999]`}>
      {/* Collapsed State */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
          title="Open Performance Monitor"
        >
          <Activity size={20} />
        </button>
      )}

      {/* Expanded State */}
      {isOpen && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl border border-zinc-200 dark:border-zinc-700 w-96 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={18} />
              <h3 className="font-semibold text-sm">Performance Monitor</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  clearAllMetrics();
                  setMetrics(getAllMetrics());
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Clear metrics"
              >
                <Trash2 size={14} />
              </button>

              <button
                onClick={() => setMetrics(getAllMetrics())}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Collapse"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
            <button
              onClick={() => setActiveTab('api')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'api'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 bg-white dark:bg-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              API
            </button>

            <button
              onClick={() => setActiveTab('renders')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'renders'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 bg-white dark:bg-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Renders
            </button>

            <button
              onClick={() => setActiveTab('errors')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'errors'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 bg-white dark:bg-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Errors {metrics.errors.total > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {metrics.errors.total}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('memory')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'memory'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 bg-white dark:bg-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Memory
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-96 overflow-y-auto text-sm">
            {/* API Tab */}
            {activeTab === 'api' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="text-xs text-blue-600 dark:text-blue-400">Total Calls</div>
                    <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {metrics.api.stats.totalCalls}
                    </div>
                  </div>

                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <div className="text-xs text-green-600 dark:text-green-400">Success</div>
                    <div className="text-lg font-bold text-green-900 dark:text-green-100">
                      {metrics.api.stats.successfulCalls}
                    </div>
                  </div>

                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <div className="text-xs text-red-600 dark:text-red-400">Failed</div>
                    <div className="text-lg font-bold text-red-900 dark:text-red-100">
                      {metrics.api.stats.failedCalls}
                    </div>
                  </div>

                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <div className="text-xs text-purple-600 dark:text-purple-400">Avg Time</div>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {metrics.api.stats.averageDuration.toFixed(0)}ms
                    </div>
                  </div>
                </div>

                {/* Recent Calls */}
                <div>
                  <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Recent API Calls:
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {metrics.api.recentCalls.slice(-10).reverse().map((call, idx) => (
                      <div
                        key={idx}
                        className={`text-xs p-2 rounded ${
                          call.success
                            ? 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300'
                            : 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-mono">{call.method} {call.endpoint}</span>
                          <span>{call.duration.toFixed(0)}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slowest/Fastest */}
                {metrics.api.stats.slowestCall && (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <div>🐌 Slowest: {metrics.api.stats.slowestCall.endpoint} ({metrics.api.stats.slowestCall.duration.toFixed(0)}ms)</div>
                    {metrics.api.stats.fastestCall && (
                      <div>⚡ Fastest: {metrics.api.stats.fastestCall.endpoint} ({metrics.api.stats.fastestCall.duration.toFixed(0)}ms)</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Renders Tab */}
            {activeTab === 'renders' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="text-xs text-blue-600 dark:text-blue-400">Total</div>
                    <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {metrics.renders.stats.totalRenders}
                    </div>
                  </div>

                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">Slow (&gt;16ms)</div>
                    <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                      {metrics.renders.stats.slowRenders}
                    </div>
                  </div>

                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded col-span-2">
                    <div className="text-xs text-purple-600 dark:text-purple-400">Avg Duration</div>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {metrics.renders.stats.averageDuration.toFixed(2)}ms
                    </div>
                  </div>
                </div>

                {/* Top Components by Render Count */}
                <div>
                  <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Top Components:
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {metrics.renders.stats.componentCounts.slice(0, 10).map((item) => (
                      <div
                        key={item.component}
                        className="flex justify-between items-center text-xs p-2 bg-zinc-50 dark:bg-zinc-800 rounded"
                      >
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {item.component}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-full">
                          {item.count}×
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slow Renders */}
                {metrics.renders.slowRenders.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                      ⚠️ Slow Renders ({metrics.renders.slowRenders.length}):
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {metrics.renders.slowRenders.slice(-5).reverse().map((render, idx) => (
                        <div
                          key={idx}
                          className="text-xs p-2 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-300 rounded"
                        >
                          {render.component}: {render.duration.toFixed(2)}ms
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Errors Tab */}
            {activeTab === 'errors' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <div className="text-xs text-red-600 dark:text-red-400">Total</div>
                    <div className="text-lg font-bold text-red-900 dark:text-red-100">
                      {metrics.errors.total}
                    </div>
                  </div>

                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <div className="text-xs text-orange-600 dark:text-orange-400">API</div>
                    <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                      {metrics.errors.byType.api}
                    </div>
                  </div>

                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">Runtime</div>
                    <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                      {metrics.errors.byType.runtime}
                    </div>
                  </div>
                </div>

                {/* Recent Errors */}
                {metrics.errors.recent.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                      Recent Errors:
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {metrics.errors.recent.reverse().map((error, idx) => (
                        <div
                          key={idx}
                          className="text-xs p-2 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 rounded"
                        >
                          <div className="font-semibold">{error.type.toUpperCase()}</div>
                          <div className="truncate">{error.message}</div>
                          {error.context && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {error.context}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">
                    <p className="text-xs">No errors recorded</p>
                  </div>
                )}
              </div>
            )}

            {/* Memory Tab */}
            {activeTab === 'memory' && (
              <div className="space-y-3">
                {metrics.memory ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <span className="text-xs text-blue-600 dark:text-blue-400">Heap Used</span>
                        <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                          {metrics.memory.usedJSHeapSize}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                        <span className="text-xs text-purple-600 dark:text-purple-400">Heap Total</span>
                        <span className="text-sm font-bold text-purple-900 dark:text-purple-100">
                          {metrics.memory.totalJSHeapSize}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Heap Limit</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {metrics.memory.jsHeapSizeLimit}
                        </span>
                      </div>
                    </div>

                    {/* Web Vitals */}
                    {metrics.performance.metrics.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                          Web Vitals:
                        </h4>
                        <div className="space-y-1">
                          {metrics.performance.metrics.map((metric, idx) => (
                            <div
                              key={idx}
                              className={`flex justify-between items-center text-xs p-2 rounded ${
                                metric.rating === 'good'
                                  ? 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300'
                                  : metric.rating === 'needs-improvement'
                                  ? 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-300'
                                  : 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300'
                              }`}
                            >
                              <span>{metric.name}</span>
                              <span className="font-mono">
                                {metric.name === 'CLS'
                                  ? metric.value.toFixed(3)
                                  : `${Math.round(metric.value)}ms`
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Overall Score */}
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded text-center">
                      <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                        Performance Score
                      </div>
                      <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                        {metrics.performance.score}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        {metrics.performance.summary}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">
                    <p className="text-xs">Memory metrics not available</p>
                    <p className="text-xs mt-1">Use Chrome/Edge for memory tracking</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mini Stats Footer */}
          <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Zap size={12} />
                <span>{metrics.api.stats.totalCalls} API</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{metrics.renders.stats.totalRenders} renders</span>
              </div>
              {metrics.errors.total > 0 && (
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <AlertCircle size={12} />
                  <span>{metrics.errors.total} errors</span>
                </div>
              )}
          </div>

            <div className="text-xs font-mono">
              {new Date().toLocaleTimeString()}
          </div>
          </div>
        </div>
      )}
      </div>
    );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';
