import { AlertCircle, CheckCircle, Clock, Pause, Play, X, XCircle, Zap } from 'lucide-react';
import type { BatchProgress } from '../lib/batchAIProcessor';

interface Props {
  progress: BatchProgress;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onClose: () => void;
  timeRemaining: number | null;
  speed: number;
}

export function BatchProgressModal({
  progress,
  onPause,
  onResume,
  onCancel,
  onClose,
  timeRemaining,
  speed
}: Props) {
  const percentage = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatSpeed = (answersPerSecond: number) => {
    if (answersPerSecond < 1) {
      return `${Math.round(answersPerSecond * 60 * 60)} answers/hour`;
    }
    return `${answersPerSecond.toFixed(1)} answers/second`;
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'running': return 'text-blue-600 dark:text-blue-400';
      case 'paused': return 'text-yellow-600 dark:text-yellow-400';
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'running': return <Zap className="h-5 w-5 animate-pulse text-blue-600 dark:text-blue-400" />;
      case 'paused': return <Pause className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Batch AI Processing
            </h2>
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={progress.status === 'running'}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress
              </span>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {progress.processed} / {progress.total}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {percentage}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock size={20} className="text-gray-600 dark:text-gray-400" />
                {progress.processed}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Processed
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle size={20} />
                {progress.succeeded}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                Succeeded
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle size={20} />
                {progress.failed}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                Failed
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Zap size={20} />
                {progress.total - progress.processed}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Remaining
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Processing Speed
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatSpeed(speed)}
              </div>
            </div>

            {timeRemaining !== null && progress.status === 'running' && (
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Time Remaining
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatTime(timeRemaining)}
                </div>
              </div>
            )}
          </div>

          {/* Current Answer */}
          {progress.currentAnswerId && progress.status === 'running' && (
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                Currently Processing:
              </div>
              <div className="font-mono text-sm text-blue-900 dark:text-blue-300">
                Answer ID: {progress.currentAnswerId}
              </div>
            </div>
          )}

          {/* Errors */}
          {progress.errors.length > 0 && (
            <div className="border border-red-200 dark:border-red-900 rounded-lg p-4 bg-red-50 dark:bg-red-950/30">
              <div className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                <AlertCircle size={16} />
                Errors ({progress.errors.length})
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {progress.errors.slice(-10).map((err, idx) => (
                  <div key={idx} className="text-xs bg-red-100 dark:bg-red-900/50 rounded p-2">
                    <div className="font-mono text-red-800 dark:text-red-200">
                      ID: {err.answerId}
                    </div>
                    <div className="text-red-700 dark:text-red-300 mt-1">
                      {err.error}
                    </div>
                  </div>
                ))}
                {progress.errors.length > 10 && (
                  <div className="text-xs text-red-600 dark:text-red-400 text-center">
                    ... and {progress.errors.length - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Summary */}
          {progress.status === 'completed' && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
              <div className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                <CheckCircle size={16} />
                Batch Processing Complete!
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                Successfully processed <span className="font-semibold">{progress.succeeded}</span> out of{' '}
                <span className="font-semibold">{progress.total}</span> answers.
                {progress.failed > 0 && (
                  <span className="block mt-1">
                    {progress.failed} answers failed to process.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-neutral-800">
          {progress.status === 'running' && (
            <>
              <button
                onClick={onPause}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <Pause size={16} />
                Pause
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <XCircle size={16} />
                Cancel
              </button>
            </>
          )}

          {progress.status === 'paused' && (
            <>
              <button
                onClick={onResume}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <Play size={16} />
                Resume
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <XCircle size={16} />
                Cancel
              </button>
            </>
          )}

          {(progress.status === 'completed' || progress.status === 'error') && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
