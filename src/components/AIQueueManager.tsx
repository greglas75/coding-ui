// ═══════════════════════════════════════════════════════════════
// 🤖 AI Queue Manager - UI for managing AI processing queue
// ═══════════════════════════════════════════════════════════════

import {
  CheckCircle2,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  TrendingUp,
  X,
  XCircle,
  Zap
} from 'lucide-react';
import { memo } from 'react';
import { useAIQueue } from '../hooks/useAIQueue';

interface AIQueueManagerProps {
  autoStart?: boolean;
  maxConcurrent?: number;
  showStats?: boolean;
  compact?: boolean;
}

export const AIQueueManager = memo<AIQueueManagerProps>(({
  autoStart = false,
  maxConcurrent = 3,
  showStats = true,
  compact = false,
}) => {
  const {
    queue,
    stats,
    isProcessing,
    progress,
    eta,
    canStart,
    canPause,
    canResume,
    canRetry,
    start,
    pause,
    resume,
    cancelAll,
    retryAll,
    clearCompleted,
    clearFailed: _clearFailed,
    cancelTask,
  } = useAIQueue({
    autoStart,
    maxConcurrent,
  });

  // Format ETA
  const formatETA = (seconds: number | null): string => {
    if (!seconds) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (compact) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-3">
        <div className="flex items-center justify-between">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-zinc-600 dark:text-zinc-400">
                {stats.processing > 0 ? `Processing ${stats.processing}` : 'Idle'}
              </span>
            </div>

            {stats.pending > 0 && (
              <span className="text-zinc-500 dark:text-zinc-400">
                {stats.pending} pending
              </span>
            )}

            {progress > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500">{Math.round(progress)}%</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {canStart && (
              <button
                onClick={start}
                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                title="Start processing"
              >
                <Play size={16} />
              </button>
            )}

            {canPause && (
              <button
                onClick={pause}
                className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors"
                title="Pause processing"
              >
                <Pause size={16} />
              </button>
            )}

            {canRetry && (
              <button
                onClick={retryAll}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                title="Retry failed tasks"
              >
                <RotateCcw size={16} />
              </button>
            )}

            {queue.length > 0 && (
              <button
                onClick={cancelAll}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Cancel all pending"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap size={20} />
              AI Processing Queue
            </h3>
            <p className="text-sm text-purple-100 mt-1">
              {isProcessing ? '⚡ Processing...' : 'Ready to process'}
            </p>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {canStart && (
              <button
                onClick={start}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Play size={18} />
                Start
              </button>
            )}

            {canPause && (
              <button
                onClick={pause}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Pause size={18} />
                Pause
              </button>
            )}

            {canResume && (
              <button
                onClick={resume}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Play size={18} />
                Resume
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">
              {stats.total}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Total
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Pending
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Completed
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.failed}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Failed
            </div>
          </div>
        </div>
      )}

      {/* Queue Items */}
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {queue.length === 0 && stats.processing === 0 ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            <p className="text-sm">Queue is empty</p>
            <p className="text-xs mt-1">Add tasks to start processing</p>
          </div>
        ) : (
          queue.map(task => (
            <div
              key={task.id}
              className={`p-3 rounded-lg border transition-colors ${
                task.status === 'processing'
                  ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                  : task.status === 'completed'
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                  : task.status === 'failed'
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                  : 'border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      #{task.answerId}
                    </span>

                    {task.status === 'processing' && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        Processing {task.progress}%
                      </span>
                    )}

                    {task.status === 'completed' && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                        <CheckCircle2 size={12} className="mr-1" />
                        Completed
                      </span>
                    )}

                    {task.status === 'failed' && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                        <XCircle size={12} className="mr-1" />
                        Failed
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                    {task.answerText}
                  </p>

                  {task.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Error: {task.error}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => cancelTask(task.id)}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Cancel task"
                    >
                      <X size={16} />
                    </button>
                  )}

                  {task.status === 'failed' && (
                    <button
                      onClick={() => retryAll()}
                      className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Retry task"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar for processing tasks */}
              {task.status === 'processing' && (
                <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-zinc-900 px-6 py-3 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-4">
            {eta && (
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>ETA: {formatETA(eta)}</span>
              </div>
            )}

            {stats.averageTime > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp size={12} />
                <span>{(stats.averageTime / 1000).toFixed(1)}s avg</span>
              </div>
            )}

            {stats.successRate > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>{Math.round(stats.successRate)}% success</span>
              </div>
            )}
          </div>

          {/* Cleanup Actions */}
          <div className="flex items-center gap-2">
            {stats.completed > 0 && (
              <button
                onClick={clearCompleted}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                title="Clear completed"
              >
                <Trash2 size={14} />
              </button>
            )}

            {stats.failed > 0 && canRetry && (
              <button
                onClick={retryAll}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
              >
                Retry {stats.failed}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

AIQueueManager.displayName = 'AIQueueManager';

