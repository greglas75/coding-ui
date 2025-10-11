// ═══════════════════════════════════════════════════════════════
// 🤖 useAIQueue - Hook for managing AI processing queue
// Simplifies interaction with useAIQueueStore
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { selectAIIsProcessing, selectAIQueue, selectAIStats, useAIQueueStore } from '../store';

export interface AIQueueOptions {
  autoStart?: boolean;
  maxConcurrent?: number;
  retryAttempts?: number;
  onTaskComplete?: (taskId: string, result: any) => void;
  onTaskFailed?: (taskId: string, error: string) => void;
  onQueueEmpty?: () => void;
}

export function useAIQueue(options: AIQueueOptions = {}) {
  const {
    autoStart = false,
    maxConcurrent = 3,
    retryAttempts = 2,
    onTaskComplete: _onTaskComplete,
    onTaskFailed: _onTaskFailed,
    onQueueEmpty,
  } = options;

  // TODO: Implement task completion callbacks
  // const onTaskComplete = _onTaskComplete;
  // const onTaskFailed = _onTaskFailed;

  // Select data from store
  const queue = useAIQueueStore(selectAIQueue);
  const stats = useAIQueueStore(selectAIStats);
  const isProcessing = useAIQueueStore(selectAIIsProcessing);

  // Actions from store
  const {
    addTask,
    addSingleTask,
    removeTask,
    clearQueue,
    clearCompleted,
    clearFailed,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    retryFailed,
    updateConfig,
    getTask,
  } = useAIQueueStore();

  // Local state
  const [recentlyCompleted, setRecentlyCompleted] = useState<string[]>([]);
  const [recentlyFailed, setRecentlyFailed] = useState<string[]>([]);

  // Update configuration on mount
  useEffect(() => {
    updateConfig({
      maxConcurrent,
      retryAttempts,
    });
  }, [maxConcurrent, retryAttempts, updateConfig]);

  // Auto-start processing if enabled
  useEffect(() => {
    if (autoStart && queue.length > 0 && !isProcessing) {
      startProcessing();
    }
  }, [autoStart, queue.length, isProcessing, startProcessing]);

  // Monitor task completion
  useEffect(() => {
    const completedTasks = stats.completed;
    const failedTasks = stats.failed;

    // Check for newly completed tasks
    if (completedTasks > recentlyCompleted.length) {
      const newCompletions = completedTasks - recentlyCompleted.length;
      toast.success(`✅ ${newCompletions} task(s) completed`);
    }

    // Check for newly failed tasks
    if (failedTasks > recentlyFailed.length) {
      const newFailures = failedTasks - recentlyFailed.length;
      toast.error(`❌ ${newFailures} task(s) failed`);
    }

    setRecentlyCompleted(Array(completedTasks).fill(''));
    setRecentlyFailed(Array(failedTasks).fill(''));
  }, [stats.completed, stats.failed, recentlyCompleted.length, recentlyFailed.length]);

  // Monitor queue empty
  useEffect(() => {
    if (queue.length === 0 && stats.processing === 0 && stats.total > 0) {
      onQueueEmpty?.();
    }
  }, [queue.length, stats.processing, stats.total, onQueueEmpty]);

  // ───────────────────────────────────────────────────────────────
  // Enhanced Actions
  // ───────────────────────────────────────────────────────────────

  const addToQueue = useCallback((answerIds: number[], categoryId: number, answerTexts?: string[]) => {
    addTask(answerIds, categoryId, answerTexts);
    toast.info(`Added ${answerIds.length} task(s) to queue`);

    if (autoStart) {
      startProcessing();
    }
  }, [addTask, autoStart, startProcessing]);

  const addSingle = useCallback((answerId: number, answerText: string, categoryId: number) => {
    addSingleTask(answerId, answerText, categoryId);
    toast.info('Task added to queue');

    if (autoStart) {
      startProcessing();
    }
  }, [addSingleTask, autoStart, startProcessing]);

  const cancelTask = useCallback((taskId: string) => {
    const task = getTask(taskId);
    if (task) {
      removeTask(taskId);
      toast.info(`Cancelled task for answer #${task.answerId}`);
    }
  }, [getTask, removeTask]);

  const cancelAll = useCallback(() => {
    const count = queue.length;
    clearQueue();
    pauseProcessing();
    toast.info(`Cancelled ${count} pending task(s)`);
  }, [queue.length, clearQueue, pauseProcessing]);

  const retryAll = useCallback(() => {
    retryFailed();
    toast.info('Retrying failed tasks...');

    if (autoStart) {
      startProcessing();
    }
  }, [retryFailed, autoStart, startProcessing]);

  const start = useCallback(async () => {
    toast.info('Starting AI processing...');
    await startProcessing();
  }, [startProcessing]);

  const pause = useCallback(() => {
    pauseProcessing();
    toast.info('Processing paused');
  }, [pauseProcessing]);

  const resume = useCallback(() => {
    resumeProcessing();
    toast.info('Processing resumed');
  }, [resumeProcessing]);

  // ───────────────────────────────────────────────────────────────
  // Computed values
  // ───────────────────────────────────────────────────────────────

  const progress = stats.total > 0
    ? ((stats.completed + stats.failed) / stats.total) * 100
    : 0;

  const eta = stats.averageTime > 0 && stats.pending > 0
    ? stats.averageTime * stats.pending
    : null;

  const canStart = queue.length > 0 && !isProcessing;
  const canPause = isProcessing;
  const canResume = queue.length > 0 && !isProcessing;
  const canRetry = stats.failed > 0;

  // ───────────────────────────────────────────────────────────────
  // Return
  // ───────────────────────────────────────────────────────────────

  return {
    // Data
    queue,
    stats,
    isProcessing,
    progress,
    eta,

    // Capabilities
    canStart,
    canPause,
    canResume,
    canRetry,

    // Actions
    addToQueue,
    addSingle,
    cancelTask,
    cancelAll,
    retryAll,
    start,
    pause,
    resume,
    clearCompleted,
    clearFailed,

    // Advanced
    getTask,
    updateConfig,
  };
}

