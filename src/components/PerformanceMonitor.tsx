import { useEffect, useState } from 'react';

interface PerformanceStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageQueryTime: number;
  cacheSize: number;
}

export function PerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats>({
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryTime: 0,
    cacheSize: 0
  });

  useEffect(() => {
    // Simulate stats collection (real implementation would use performanceMonitor)
    const interval = setInterval(() => {
      // In a real implementation, this would fetch from performanceMonitor.getStats()
      const mockStats: PerformanceStats = {
        totalQueries: Math.floor(Math.random() * 100) + 50,
        cacheHits: Math.floor(Math.random() * 60) + 20,
        cacheMisses: Math.floor(Math.random() * 40) + 10,
        averageQueryTime: Math.random() * 200 + 50,
        cacheSize: Math.floor(Math.random() * 50) + 10
      };

      setStats(mockStats);
      console.log('📊 Performance Stats:', mockStats);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const cacheHitRate = stats.totalQueries > 0
    ? ((stats.cacheHits / stats.totalQueries) * 100).toFixed(1)
    : '0.0';

  // Development only - pokazuj stats w UI
  if (import.meta.env.DEV) {
    return (
      <div className="fixed bottom-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg font-mono shadow-xl z-50 backdrop-blur">
        <div className="font-bold mb-2 text-green-400">⚡ Performance Monitor</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Cache Hit Rate:</span>
            <span className="text-green-400 font-bold">{cacheHitRate}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Total Queries:</span>
            <span className="text-blue-400">{stats.totalQueries}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Cache Hits:</span>
            <span className="text-green-400">{stats.cacheHits}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Cache Misses:</span>
            <span className="text-red-400">{stats.cacheMisses}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Avg Query Time:</span>
            <span className="text-yellow-400">{stats.averageQueryTime.toFixed(0)}ms</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Cache Size:</span>
            <span className="text-purple-400">{stats.cacheSize} items</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-500">
          Updates every 30s
        </div>
      </div>
    );
  }

  return null;
}
