// ═══════════════════════════════════════════════════════════════
// 🤖 AI Queue Store - Global state management for AI processing queue
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { simpleLogger } from '../utils/logger';

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────

interface AITask {
  id: string;
  answerId: number;
  answerText: string;
  categoryId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  result?: {
    suggestions: Array<{
      code_id: string;
      code_name: string;
      confidence: number;
      reasoning: string;
    }>;
    model: string;
    timestamp: string;
  };
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface AIQueueState {
  // Data
  queue: AITask[];
  processing: AITask[];
  completed: AITask[];
  failed: AITask[];

  // Stats
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    successRate: number;
    averageTime: number;
  };

  // Configuration
  config: {
    maxConcurrent: number;
    retryAttempts: number;
    retryDelay: number;
    rateLimit: number; // requests per minute
  };

  // State
  isProcessing: boolean;
  isPaused: boolean;

  // Actions
  addTask: (answerIds: number[], categoryId: number, answerTexts?: string[]) => void;
  addSingleTask: (answerId: number, answerText: string, categoryId: number) => void;
  removeTask: (taskId: string) => void;
  clearQueue: () => void;
  clearCompleted: () => void;
  clearFailed: () => void;

  // Processing
  startProcessing: () => Promise<void>;
  pauseProcessing: () => void;
  resumeProcessing: () => void;
  retryFailed: () => void;

  // Task management
  updateTask: (taskId: string, updates: Partial<AITask>) => void;
  moveToProcessing: (taskId: string) => void;
  moveToCompleted: (taskId: string, result: AITask['result']) => void;
  moveToFailed: (taskId: string, error: string) => void;

  // Configuration
  updateConfig: (config: Partial<AIQueueState['config']>) => void;

  // Utility
  getTask: (taskId: string) => AITask | undefined;
  refreshStats: () => void;
}

// ───────────────────────────────────────────────────────────────
// Store
// ───────────────────────────────────────────────────────────────

export const useAIQueueStore = create<AIQueueState>()(
  devtools(
    (set, get) => ({
      // Initial state
      queue: [],
      processing: [],
      completed: [],
      failed: [],
      stats: {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        successRate: 0,
        averageTime: 0,
      },
      config: {
        maxConcurrent: 3,
        retryAttempts: 2,
        retryDelay: 1000,
        rateLimit: 10, // 10 requests per minute
      },
      isProcessing: false,
      isPaused: false,

      // Add multiple tasks
      addTask: (answerIds, categoryId, answerTexts) => {
        const newTasks: AITask[] = answerIds.map((answerId, index) => ({
          id: `task-${Date.now()}-${answerId}`,
          answerId,
          answerText: answerTexts?.[index] || `Answer ${answerId}`,
          categoryId,
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
        }));

        set(state => ({
          queue: [...state.queue, ...newTasks]
        }), false, 'aiQueue/addTask');

        simpleLogger.info(`✅ Added ${newTasks.length} tasks to AI queue`);
        get().refreshStats();
      },

      // Add single task
      addSingleTask: (answerId, answerText, categoryId) => {
        const task: AITask = {
          id: `task-${Date.now()}-${answerId}`,
          answerId,
          answerText,
          categoryId,
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
        };

        set(state => ({
          queue: [...state.queue, task]
        }), false, 'aiQueue/addSingleTask');

        simpleLogger.info('✅ Added task to AI queue:', task.id);
        get().refreshStats();
      },

      // Remove task
      removeTask: (taskId) => {
        set(state => ({
          queue: state.queue.filter(t => t.id !== taskId),
          processing: state.processing.filter(t => t.id !== taskId),
        }), false, 'aiQueue/removeTask');

        get().refreshStats();
      },

      // Clear queue
      clearQueue: () => {
        set({
          queue: [],
          processing: [],
        }, false, 'aiQueue/clearQueue');

        simpleLogger.info('🧹 Queue cleared');
        get().refreshStats();
      },

      // Clear completed
      clearCompleted: () => {
        set({ completed: [] }, false, 'aiQueue/clearCompleted');
        get().refreshStats();
      },

      // Clear failed
      clearFailed: () => {
        set({ failed: [] }, false, 'aiQueue/clearFailed');
        get().refreshStats();
      },

      // Start processing queue
      startProcessing: async () => {
        if (get().isProcessing) {
          simpleLogger.warn('⚠️ Processing already in progress');
          return;
        }

        set({ isProcessing: true, isPaused: false }, false, 'aiQueue/startProcessing');
        simpleLogger.info('🚀 Starting AI queue processing');

        const processNext = async () => {
          const state = get();

          if (state.isPaused || state.queue.length === 0) {
            set({ isProcessing: false }, false, 'aiQueue/processingComplete');
            simpleLogger.info('✅ Queue processing complete');
            return;
          }

          // Check concurrent limit
          if (state.processing.length >= state.config.maxConcurrent) {
            // Wait and try again
            setTimeout(processNext, 500);
            return;
          }

          // Get next task
          const task = state.queue[0];
          if (!task) {
            set({ isProcessing: false }, false, 'aiQueue/processingComplete');
            return;
          }

          // Move to processing
          get().moveToProcessing(task.id);

          try {
            // NOTE: AI API integration pending - using mock implementation
            // const result = await apiClient.post<AITask['result']>(
            //   `/api/ai/categorize`,
            //   {
            //     answerId: task.answerId,
            //     answerText: task.answerText,
            //     categoryId: task.categoryId,
            //   }
            // );

            // Simulate processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            const mockResult: AITask['result'] = {
              suggestions: [
                {
                  code_id: '1',
                  code_name: 'Example Code',
                  confidence: 0.85,
                  reasoning: 'Mock AI result',
                }
              ],
              model: 'gpt-4o-mini',
              timestamp: new Date().toISOString(),
            };

            get().moveToCompleted(task.id, mockResult);

            // Process next
            processNext();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'AI processing failed';
            get().moveToFailed(task.id, errorMessage);

            // Process next
            processNext();
          }
        };

        // Start multiple workers (up to maxConcurrent)
        const workers = Math.min(get().config.maxConcurrent, get().queue.length);
        for (let i = 0; i < workers; i++) {
          processNext();
        }
      },

      // Pause processing
      pauseProcessing: () => {
        set({ isPaused: true }, false, 'aiQueue/pauseProcessing');
        simpleLogger.info('⏸️ Queue processing paused');
      },

      // Resume processing
      resumeProcessing: () => {
        set({ isPaused: false }, false, 'aiQueue/resumeProcessing');
        simpleLogger.info('▶️ Queue processing resumed');
        get().startProcessing();
      },

      // Retry failed tasks
      retryFailed: () => {
        const failedTasks = get().failed.map(task => ({
          ...task,
          status: 'pending' as const,
          progress: 0,
          error: undefined,
        }));

        set(state => ({
          queue: [...state.queue, ...failedTasks],
          failed: [],
        }), false, 'aiQueue/retryFailed');

        simpleLogger.info(`🔄 Retrying ${failedTasks.length} failed tasks`);
        get().refreshStats();
      },

      // Update task
      updateTask: (taskId, updates) => {
        set(state => ({
          queue: state.queue.map(t => t.id === taskId ? { ...t, ...updates } : t),
          processing: state.processing.map(t => t.id === taskId ? { ...t, ...updates } : t),
          completed: state.completed.map(t => t.id === taskId ? { ...t, ...updates } : t),
          failed: state.failed.map(t => t.id === taskId ? { ...t, ...updates } : t),
        }), false, 'aiQueue/updateTask');
      },

      // Move task to processing
      moveToProcessing: (taskId) => {
        const task = get().queue.find(t => t.id === taskId);
        if (!task) return;

        set(state => ({
          queue: state.queue.filter(t => t.id !== taskId),
          processing: [...state.processing, {
            ...task,
            status: 'processing',
            startedAt: new Date().toISOString(),
          }],
        }), false, 'aiQueue/moveToProcessing');

        get().refreshStats();
      },

      // Move task to completed
      moveToCompleted: (taskId, result) => {
        const task = get().processing.find(t => t.id === taskId);
        if (!task) return;

        set(state => ({
          processing: state.processing.filter(t => t.id !== taskId),
          completed: [...state.completed, {
            ...task,
            status: 'completed',
            progress: 100,
            result,
            completedAt: new Date().toISOString(),
          }],
        }), false, 'aiQueue/moveToCompleted');

        simpleLogger.info('✅ Task completed:', taskId);
        get().refreshStats();
      },

      // Move task to failed
      moveToFailed: (taskId, error) => {
        const task = get().processing.find(t => t.id === taskId);
        if (!task) return;

        set(state => ({
          processing: state.processing.filter(t => t.id !== taskId),
          failed: [...state.failed, {
            ...task,
            status: 'failed',
            error,
            completedAt: new Date().toISOString(),
          }],
        }), false, 'aiQueue/moveToFailed');

        simpleLogger.error('❌ Task failed:', taskId, error);
        get().refreshStats();
      },

      // Update configuration
      updateConfig: (config) => {
        set(state => ({
          config: { ...state.config, ...config }
        }), false, 'aiQueue/updateConfig');
      },

      // Get task by ID
      getTask: (taskId) => {
        const state = get();
        return (
          state.queue.find(t => t.id === taskId) ||
          state.processing.find(t => t.id === taskId) ||
          state.completed.find(t => t.id === taskId) ||
          state.failed.find(t => t.id === taskId)
        );
      },

      // Refresh statistics
      refreshStats: () => {
        const state = get();
        const total = state.queue.length + state.processing.length + state.completed.length + state.failed.length;
        const successRate = total > 0 ? (state.completed.length / total) * 100 : 0;

        // Calculate average processing time
        const completedWithTime = state.completed.filter(t => t.startedAt && t.completedAt);
        const averageTime = completedWithTime.length > 0
          ? completedWithTime.reduce((sum, task) => {
              const start = new Date(task.startedAt!).getTime();
              const end = new Date(task.completedAt!).getTime();
              return sum + (end - start);
            }, 0) / completedWithTime.length
          : 0;

        set({
          stats: {
            total,
            pending: state.queue.length,
            processing: state.processing.length,
            completed: state.completed.length,
            failed: state.failed.length,
            successRate,
            averageTime,
          }
        }, false, 'aiQueue/refreshStats');
      },
    }),
    { name: 'AIQueueStore' }
  )
);

// ───────────────────────────────────────────────────────────────
// Selectors (for optimized component re-renders)
// ───────────────────────────────────────────────────────────────

export const selectAIQueue = (state: AIQueueState) => state.queue;
export const selectAIProcessing = (state: AIQueueState) => state.processing;
export const selectAICompleted = (state: AIQueueState) => state.completed;
export const selectAIFailed = (state: AIQueueState) => state.failed;
export const selectAIStats = (state: AIQueueState) => state.stats;
export const selectAIIsProcessing = (state: AIQueueState) => state.isProcessing;
export const selectAIIsPaused = (state: AIQueueState) => state.isPaused;

