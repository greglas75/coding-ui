import { RefreshCw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { errorLogger } from '../lib/errorLogger';

export function ErrorLogsViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState(errorLogger.getLogs());

  if (!import.meta.env.DEV) return null;

  const handleClear = () => {
    errorLogger.clearLogs();
    setLogs([]);
  };

  const handleRefresh = () => {
    setLogs(errorLogger.getLogs());
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => {
          handleRefresh();
          setIsOpen(true);
        }}
        className="fixed bottom-4 left-4 p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-40"
        title="View Error Logs"
      >
        🔴 {logs.length}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Error Logs ({logs.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
                <button
                  onClick={handleClear}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Clear
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-y-auto p-4">
              {logs.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No errors logged
                </p>
              ) : (
                <div className="space-y-4">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-semibold text-red-800 dark:text-red-300">
                          {log.message}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p>URL: {log.url}</p>
                        {log.stack && (
                          <details>
                            <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                              Stack trace
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-zinc-800 rounded text-xs overflow-auto max-h-64">
                              {log.stack}
                            </pre>
                          </details>
                        )}
                        {log.componentStack && (
                          <details>
                            <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                              Component stack
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-zinc-800 rounded text-xs overflow-auto max-h-64">
                              {log.componentStack}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
