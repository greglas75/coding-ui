// ═══════════════════════════════════════════════════════════════
// 📚 Store Usage Example - How to use Zustand stores in components
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import {
    selectAnswers,
    selectCodingIsLoading,
    selectCodingStats,
    useCodingStore
} from '../../store';

/**
 * Example component showing how to use Zustand stores
 *
 * Replace local useState/useEffect with store hooks
 */
export function StoreUsageExample() {
  // ✅ Option 1: Use selectors (recommended for performance)
  const answers = useCodingStore(selectAnswers);
  const isLoading = useCodingStore(selectCodingIsLoading);
  const stats = useCodingStore(selectCodingStats);

  // ✅ Option 2: Destructure actions (stable, won't cause re-renders)
  const {
    fetchAnswers,
    assignCode,
    updateAnswerStatus,
    clearError
  } = useCodingStore();

  // ✅ Option 3: Select specific nested state
  const errorMessage = useCodingStore(state => state.error);
  const currentCategory = useCodingStore(state => state.currentCategory);

  // Fetch data on mount
  useEffect(() => {
    if (currentCategory) {
      fetchAnswers(currentCategory.id);
    }
  }, [currentCategory?.id, fetchAnswers]);

  // Handle actions
  const handleAssignCode = async (answerId: number, codeId: number) => {
    await assignCode(answerId, codeId);
    // No need for try/catch - store handles errors internally
    // Check errorMessage state to display errors
  };

  const handleUpdateStatus = async (answerId: number, status: string) => {
    await updateAnswerStatus(answerId, status);
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        <span className="ml-3">Loading answers...</span>
      </div>
    );
  }

  // Render error state
  if (errorMessage) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Error: {errorMessage}</p>
        <button
          onClick={clearError}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Render content
  return (
    <div className="space-y-4">
      {/* Statistics from store */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{stats.totalAnswers}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Categorized</div>
          <div className="text-2xl font-bold">{stats.categorized}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Uncategorized</div>
          <div className="text-2xl font-bold">{stats.uncategorized}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Whitelisted</div>
          <div className="text-2xl font-bold">{stats.whitelisted}</div>
        </div>
      </div>

      {/* Answers list */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Answers ({answers.length})</h2>
        {answers.map(answer => (
          <div
            key={answer.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
          >
            <p className="font-medium">{answer.answer_text}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleAssignCode(answer.id, 1)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Assign Code
              </button>
              <button
                onClick={() => handleUpdateStatus(answer.id, 'whitelist')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Whitelist
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🤖 AI Queue Example
// ═══════════════════════════════════════════════════════════════

import {
    selectAIIsProcessing,
    selectAIQueue,
    selectAIStats,
    useAIQueueStore
} from '../../store';

export function AIQueueExample() {
  const queue = useAIQueueStore(selectAIQueue);
  const stats = useAIQueueStore(selectAIStats);
  const isProcessing = useAIQueueStore(selectAIIsProcessing);
  const {
    addTask,
    startProcessing,
    pauseProcessing,
    clearCompleted
  } = useAIQueueStore();

  const handleBatchAI = (answerIds: number[]) => {
    addTask(answerIds, 1, answerIds.map(id => `Answer ${id}`));
    startProcessing();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Processing Queue</h2>
        <div className="flex gap-2">
          {isProcessing ? (
            <button
              onClick={pauseProcessing}
              className="px-3 py-1 bg-yellow-600 text-white rounded"
            >
              ⏸️ Pause
            </button>
          ) : (
            <button
              onClick={() => handleBatchAI([1, 2, 3])}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              ▶️ Start Processing
            </button>
          )}
          <button
            onClick={clearCompleted}
            className="px-3 py-1 bg-gray-600 text-white rounded"
          >
            Clear Completed
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-gray-50 p-3 rounded text-center">
          <div className="text-xs text-gray-600">Pending</div>
          <div className="text-xl font-bold">{stats.pending}</div>
        </div>
        <div className="bg-blue-50 p-3 rounded text-center">
          <div className="text-xs text-gray-600">Processing</div>
          <div className="text-xl font-bold">{stats.processing}</div>
        </div>
        <div className="bg-green-50 p-3 rounded text-center">
          <div className="text-xs text-gray-600">Completed</div>
          <div className="text-xl font-bold">{stats.completed}</div>
        </div>
        <div className="bg-red-50 p-3 rounded text-center">
          <div className="text-xs text-gray-600">Failed</div>
          <div className="text-xl font-bold">{stats.failed}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded text-center">
          <div className="text-xs text-gray-600">Success Rate</div>
          <div className="text-xl font-bold">{stats.successRate.toFixed(0)}%</div>
        </div>
      </div>

      {/* Queue items */}
      <div className="space-y-2">
        {queue.map(task => (
          <div
            key={task.id}
            className="border border-gray-200 rounded p-3 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium">{task.answerText}</p>
              <p className="text-xs text-gray-500">
                Status: {task.status} • Progress: {task.progress}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              {task.status === 'processing' && (
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              )}
              {task.status === 'completed' && (
                <span className="text-green-600">✓</span>
              )}
              {task.status === 'failed' && (
                <span className="text-red-600">✗</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

