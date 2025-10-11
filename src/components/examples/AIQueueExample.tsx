// ═══════════════════════════════════════════════════════════════
// 📚 AI Queue Examples - How to use AI processing queue
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useAIQueue } from '../../hooks/useAIQueue';
import type { Answer } from '../../types';
import { AIQueueManager } from '../AIQueueManager';

/**
 * Example 1: Basic AI Queue Usage
 */
export function BasicAIQueueExample() {
  const {
    queue,
    stats,
    isProcessing,
    addToQueue,
    start,
    pause,
  } = useAIQueue({
    autoStart: false,
    maxConcurrent: 3,
  });

  const mockAnswers: Answer[] = [
    {
      id: 1,
      answer_text: 'I love Apple products',
      translation: null,
      translation_en: null,
      language: 'en',
      country: 'USA',
      quick_status: null,
      general_status: 'uncategorized',
      selected_code: null,
      ai_suggested_code: null,
      ai_suggestions: null,
      category_id: 1,
      coding_date: null,
      confirmed_by: null,
      created_at: null,
      updated_at: null,
    },
    {
      id: 2,
      answer_text: 'Nike shoes are great',
      translation: null,
      translation_en: null,
      language: 'en',
      country: 'USA',
      quick_status: null,
      general_status: 'uncategorized',
      selected_code: null,
      ai_suggested_code: null,
      ai_suggestions: null,
      category_id: 1,
      coding_date: null,
      confirmed_by: null,
      created_at: null,
      updated_at: null,
    },
  ];

  const addBatch = () => {
    const answerIds = mockAnswers.map(a => a.id);
    const answerTexts = mockAnswers.map(a => a.answer_text);
    addToQueue(answerIds, 1, answerTexts);
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Basic AI Queue</h3>

      <div className="flex gap-2">
        <button
          onClick={addBatch}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          Add 2 Tasks to Queue
        </button>

        {queue.length > 0 && !isProcessing && (
          <button
            onClick={start}
            className="px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            Start Processing
          </button>
        )}

        {isProcessing && (
          <button
            onClick={pause}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg"
          >
            Pause
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-gray-100 dark:bg-zinc-800 rounded">
          <div className="text-lg font-bold">{stats.total}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
        </div>
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded">
          <div className="text-lg font-bold">{stats.pending}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Pending</div>
        </div>
        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded">
          <div className="text-lg font-bold">{stats.completed}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
        </div>
        <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded">
          <div className="text-lg font-bold">{stats.failed}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 2: Auto-Start Queue
 */
export function AutoStartQueueExample() {
  const { addSingle, stats } = useAIQueue({
    autoStart: true, // Automatically starts when tasks added
    maxConcurrent: 5,
  });

  const addRandomTask = () => {
    const randomId = Math.floor(Math.random() * 1000);
    addSingle(randomId, `Random answer ${randomId}`, 1);
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Auto-Start Queue</h3>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Tasks automatically start processing when added
      </p>

      <button
        onClick={addRandomTask}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Add Random Task (Auto-Starts)
      </button>

      <div className="text-sm">
        <p>Total processed: {stats.completed + stats.failed}</p>
        <p>Success rate: {Math.round(stats.successRate)}%</p>
      </div>
    </div>
  );
}

/**
 * Example 3: Full Queue Manager UI
 */
export function FullQueueManagerExample() {
  const { addToQueue } = useAIQueue({
    autoStart: false,
    maxConcurrent: 3,
  });

  const addLargeBatch = () => {
    const count = 50;
    const answerIds = Array.from({ length: count }, (_, i) => i + 1);
    const answerTexts = answerIds.map(id => `Answer ${id}`);
    addToQueue(answerIds, 1, answerTexts);
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Full Queue Manager</h3>

      <button
        onClick={addLargeBatch}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg"
      >
        Add 50 Tasks
      </button>

      <AIQueueManager
        autoStart={false}
        maxConcurrent={3}
        showStats={true}
        compact={false}
      />
    </div>
  );
}

/**
 * Example 4: Compact Queue Manager
 */
export function CompactQueueManagerExample() {
  const { addSingle } = useAIQueue({ autoStart: true });

  const addTask = () => {
    addSingle(Date.now(), `Answer at ${new Date().toLocaleTimeString()}`, 1);
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Compact Queue Manager</h3>

      <button
        onClick={addTask}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Add Task
      </button>

      <AIQueueManager
        autoStart={true}
        maxConcurrent={3}
        showStats={false}
        compact={true}
      />
    </div>
  );
}

/**
 * All examples combined
 */
export function AllAIQueueExamples() {
  const [activeExample, setActiveExample] = useState<'basic' | 'autostart' | 'full' | 'compact'>('basic');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex gap-2 p-4 bg-gray-100 dark:bg-zinc-800">
        <button
          onClick={() => setActiveExample('basic')}
          className={`px-4 py-2 rounded ${
            activeExample === 'basic' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Basic Queue
        </button>
        <button
          onClick={() => setActiveExample('autostart')}
          className={`px-4 py-2 rounded ${
            activeExample === 'autostart' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Auto-Start
        </button>
        <button
          onClick={() => setActiveExample('full')}
          className={`px-4 py-2 rounded ${
            activeExample === 'full' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Full Manager
        </button>
        <button
          onClick={() => setActiveExample('compact')}
          className={`px-4 py-2 rounded ${
            activeExample === 'compact' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Compact
        </button>
      </div>

      {/* Examples */}
      <div className="p-6">
        {activeExample === 'basic' && <BasicAIQueueExample />}
        {activeExample === 'autostart' && <AutoStartQueueExample />}
        {activeExample === 'full' && <FullQueueManagerExample />}
        {activeExample === 'compact' && <CompactQueueManagerExample />}
      </div>
    </div>
  );
}

