// 🤖 AI Processing Queue - Complete Guide

## ✅ What Has Been Implemented

### 1. AI Queue Store

**Location:** `src/store/useAIQueueStore.ts`

**Features:**
- ✅ Task queue management (pending, processing, completed, failed)
- ✅ Concurrent processing (configurable max)
- ✅ Progress tracking (0-100%)
- ✅ Retry mechanism with configurable attempts
- ✅ Rate limiting
- ✅ Success rate & average time statistics
- ✅ DevTools integration

### 2. useAIQueue Hook

**Location:** `src/hooks/useAIQueue.ts`

**Features:**
- ✅ Simplified queue management
- ✅ Auto-start capability
- ✅ Toast notifications
- ✅ Progress & ETA calculation
- ✅ Batch operations
- ✅ Cancel, retry, clear actions

### 3. AIQueueManager Component

**Location:** `src/components/AIQueueManager.tsx`

**Features:**
- ✅ Full queue UI with stats
- ✅ Compact mode for toolbars
- ✅ Real-time progress bars
- ✅ Task management (cancel, retry)
- ✅ Visual status indicators

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { useAIQueue } from './hooks/useAIQueue';

function MyComponent() {
  const { addToQueue, start, stats } = useAIQueue();

  const processAnswers = () => {
    // Add tasks to queue
    addToQueue(
      [1, 2, 3], // Answer IDs
      1,          // Category ID
      ['Answer 1', 'Answer 2', 'Answer 3'] // Answer texts
    );

    // Start processing
    start();
  };

  return (
    <div>
      <button onClick={processAnswers}>
        Process Answers
      </button>
      <p>Completed: {stats.completed}/{stats.total}</p>
    </div>
  );
}
```

### With Auto-Start

```typescript
const { addSingle } = useAIQueue({
  autoStart: true,  // Automatically starts processing
  maxConcurrent: 5, // Process 5 at a time
});

// Just add - it will start automatically!
addSingle(answerId, answerText, categoryId);
```

### With Queue Manager UI

```typescript
import { AIQueueManager } from './components/AIQueueManager';

function MyPage() {
  return (
    <div>
      {/* Your content */}

      <AIQueueManager
        autoStart={true}
        maxConcurrent={3}
        showStats={true}
        compact={false}
      />
    </div>
  );
}
```

---

## 📊 API Reference

### useAIQueue Hook

```typescript
function useAIQueue(options?: AIQueueOptions): {
  // Data
  queue: AITask[];
  stats: AIStats;
  isProcessing: boolean;
  progress: number;  // 0-100
  eta: number | null; // seconds

  // Capabilities
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canRetry: boolean;

  // Actions
  addToQueue: (answerIds: number[], categoryId: number, answerTexts?: string[]) => void;
  addSingle: (answerId: number, answerText: string, categoryId: number) => void;
  cancelTask: (taskId: string) => void;
  cancelAll: () => void;
  retryAll: () => void;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  clearCompleted: () => void;
  clearFailed: () => void;

  // Advanced
  getTask: (taskId: string) => AITask | undefined;
  updateConfig: (config: Partial<QueueConfig>) => void;
}
```

### AIQueueOptions

```typescript
interface AIQueueOptions {
  autoStart?: boolean;          // Auto-start processing (default: false)
  maxConcurrent?: number;        // Max concurrent tasks (default: 3)
  retryAttempts?: number;        // Retry attempts per task (default: 2)
  onTaskComplete?: (taskId: string, result: any) => void;
  onTaskFailed?: (taskId: string, error: string) => void;
  onQueueEmpty?: () => void;
}
```

### AITask

```typescript
interface AITask {
  id: string;                    // Unique task ID
  answerId: number;              // Answer being processed
  answerText: string;            // Text to analyze
  categoryId: number;            // Category context
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;              // 0-100
  result?: {                     // AI suggestions (when completed)
    suggestions: Array<{
      code_id: string;
      code_name: string;
      confidence: number;
      reasoning: string;
    }>;
    model: string;
    timestamp: string;
  };
  error?: string;                // Error message (when failed)
  createdAt: string;             // ISO timestamp
  startedAt?: string;            // When processing started
  completedAt?: string;          // When completed/failed
}
```

---

## 🎯 Usage Patterns

### Pattern 1: Batch Processing

```typescript
function BatchProcessor() {
  const { addToQueue, start, stats } = useAIQueue({
    maxConcurrent: 5,
  });

  const processAll = async (answers: Answer[]) => {
    // Add all to queue
    const ids = answers.map(a => a.id);
    const texts = answers.map(a => a.answer_text);

    addToQueue(ids, categoryId, texts);

    // Start processing
    await start();

    console.log(`Processed ${stats.completed} tasks`);
  };

  return <button onClick={() => processAll(answers)}>Process All</button>;
}
```

### Pattern 2: Single Task Processing

```typescript
function SingleTaskProcessor() {
  const { addSingle, getTask } = useAIQueue({
    autoStart: true,
  });

  const processOne = async (answer: Answer) => {
    addSingle(answer.id, answer.answer_text, answer.category_id);

    // Task will automatically start processing
  };

  return <button onClick={() => processOne(answer)}>Process This</button>;
}
```

### Pattern 3: With Callbacks

```typescript
function CallbackExample() {
  const { addSingle } = useAIQueue({
    autoStart: true,
    onTaskComplete: (taskId, result) => {
      console.log('Task completed:', taskId, result);
      // Update UI, save to database, etc.
    },
    onTaskFailed: (taskId, error) => {
      console.error('Task failed:', taskId, error);
      // Log error, show notification, etc.
    },
    onQueueEmpty: () => {
      console.log('All tasks completed!');
      toast.success('All answers processed!');
    },
  });

  // ...
}
```

### Pattern 4: Manual Control

```typescript
function ManualControlExample() {
  const {
    addToQueue,
    start,
    pause,
    resume,
    cancelAll,
    retryAll,
    isProcessing,
    canRetry,
  } = useAIQueue({
    autoStart: false,
  });

  return (
    <div>
      <button onClick={() => addToQueue([1, 2, 3], 1)}>
        Add Tasks
      </button>

      {!isProcessing ? (
        <button onClick={start}>Start</button>
      ) : (
        <button onClick={pause}>Pause</button>
      )}

      <button onClick={resume}>Resume</button>
      <button onClick={cancelAll}>Cancel All</button>

      {canRetry && (
        <button onClick={retryAll}>Retry Failed</button>
      )}
    </div>
  );
}
```

---

## 🎨 Queue Manager Component

### Full Mode

```typescript
<AIQueueManager
  autoStart={false}
  maxConcurrent={3}
  showStats={true}
  compact={false}
/>
```

**Features:**
- Full-width queue UI
- Detailed task list
- Individual task progress bars
- Per-task cancel/retry buttons
- Statistics dashboard
- ETA and success rate

### Compact Mode

```typescript
<AIQueueManager
  autoStart={true}
  maxConcurrent={3}
  showStats={false}
  compact={true}
/>
```

**Features:**
- Single-line status
- Overall progress bar
- Quick action buttons
- Minimal space usage
- Perfect for toolbars

---

## 📈 Statistics

### Available Stats

```typescript
interface AIStats {
  total: number;        // Total tasks ever added
  pending: number;      // Waiting in queue
  processing: number;   // Currently processing
  completed: number;    // Successfully completed
  failed: number;       // Failed tasks
  successRate: number;  // Percentage (0-100)
  averageTime: number;  // Average ms per task
}
```

### Accessing Stats

```typescript
const { stats } = useAIQueue();

console.log(`Success rate: ${stats.successRate}%`);
console.log(`Average time: ${stats.averageTime / 1000}s`);
console.log(`Pending: ${stats.pending}`);
```

---

## 🔧 Configuration

### Queue Configuration

```typescript
const { updateConfig } = useAIQueue();

updateConfig({
  maxConcurrent: 10,      // Process 10 at once
  retryAttempts: 3,       // Retry failed tasks 3 times
  retryDelay: 5000,       // 5 second delay between retries
  rateLimit: 60,          // Max 60 requests per minute
});
```

### Default Configuration

```typescript
{
  maxConcurrent: 3,       // Process 3 tasks simultaneously
  retryAttempts: 2,       // Retry failed tasks 2 times
  retryDelay: 2000,       // 2 second delay between retries
  rateLimit: 20,          // Max 20 requests per minute
}
```

---

## 🎯 Task Lifecycle

```
Created (pending)
  ↓
  addToQueue() or addSingle()
  ↓
Queue (pending)
  ↓
  start() or autoStart
  ↓
Processing (progress: 0-100%)
  ↓
  ├─→ Success → Completed ✅
  │     └─→ onTaskComplete callback
  │
  └─→ Failure → Failed ❌
        ├─→ Retry (if attempts left) → back to Queue
        └─→ onTaskFailed callback
```

---

## 🔍 Advanced Features

### Cancel Specific Task

```typescript
const { cancelTask, getTask } = useAIQueue();

const handleCancel = (taskId: string) => {
  const task = getTask(taskId);
  if (task?.status === 'pending') {
    cancelTask(taskId);
  }
};
```

### Monitor Progress

```typescript
const { queue, progress, eta } = useAIQueue();

// Overall progress
console.log(`Overall: ${progress}%`);
console.log(`ETA: ${eta} seconds`);

// Per-task progress
queue.forEach(task => {
  console.log(`Task ${task.id}: ${task.progress}%`);
});
```

### Custom Rate Limiting

```typescript
const { updateConfig } = useAIQueue();

// Process faster
updateConfig({
  maxConcurrent: 10,
  rateLimit: 120, // 120 requests/min
});

// Process slower (be nice to API)
updateConfig({
  maxConcurrent: 1,
  rateLimit: 10, // 10 requests/min
});
```

---

## 🎨 UI Integration

### In Toolbar

```typescript
<div className="flex items-center gap-4">
  <button onClick={handleAction}>Process All</button>

  <AIQueueManager compact={true} autoStart={true} />
</div>
```

### In Modal

```typescript
<Modal>
  <h2>AI Processing</h2>

  <AIQueueManager
    compact={false}
    showStats={true}
  />

  <button onClick={closeModal}>Close</button>
</Modal>
```

### In Dashboard

```typescript
<Dashboard>
  <div className="grid grid-cols-2 gap-6">
    <div>
      {/* Your content */}
    </div>

    <div>
      <AIQueueManager
        autoStart={false}
        maxConcurrent={3}
        showStats={true}
      />
    </div>
  </div>
</Dashboard>
```

---

## 📊 Real-World Examples

### Example: Process Uncategorized Answers

```typescript
function ProcessUncategorized() {
  const { data: answers } = useQuery('uncategorized', fetchUncategorized);
  const { addToQueue, start, stats, isProcessing } = useAIQueue({
    autoStart: false,
    maxConcurrent: 5,
    onQueueEmpty: () => {
      toast.success('All answers categorized!');
      refetchAnswers(); // Refresh list
    },
  });

  const processAll = () => {
    const ids = answers.map(a => a.id);
    const texts = answers.map(a => a.answer_text);

    addToQueue(ids, categoryId, texts);
    start();
  };

  return (
    <div>
      <button onClick={processAll} disabled={isProcessing}>
        Process {answers.length} Answers
      </button>

      <AIQueueManager compact={true} />

      <p>
        Success rate: {stats.successRate}%
        ({stats.completed}/{stats.total})
      </p>
    </div>
  );
}
```

### Example: Retry Failed Tasks

```typescript
function RetryManager() {
  const { stats, canRetry, retryAll, clearFailed } = useAIQueue();

  if (stats.failed === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded p-4">
      <p className="text-red-800">
        {stats.failed} task(s) failed
      </p>

      <div className="flex gap-2 mt-2">
        <button onClick={retryAll} disabled={!canRetry}>
          Retry All
        </button>
        <button onClick={clearFailed}>
          Clear Failed
        </button>
      </div>
    </div>
  );
}
```

### Example: Progress Indicator

```typescript
function ProgressIndicator() {
  const { progress, eta, isProcessing } = useAIQueue();

  if (!isProcessing && progress === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />

        <div>
          <p className="text-sm font-medium">Processing...</p>
          <p className="text-xs text-gray-500">
            {Math.round(progress)}% complete
            {eta && ` • ${Math.round(eta / 60)} min remaining`}
          </p>
        </div>
      </div>

      <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

---

## 🎯 Best Practices

### 1. Use Auto-Start for Better UX

```typescript
// ✅ Good - seamless experience
const { addSingle } = useAIQueue({ autoStart: true });

onClick={() => addSingle(id, text, categoryId)}
// User sees immediate processing!

// ❌ Bad - requires two clicks
const { addSingle, start } = useAIQueue({ autoStart: false });

onClick={() => {
  addSingle(id, text, categoryId);
  start(); // User has to manually start
}}
```

### 2. Set Appropriate Concurrency

```typescript
// ✅ Good - balanced
useAIQueue({ maxConcurrent: 3 }); // Good for most APIs

// ✅ Also good - high throughput
useAIQueue({ maxConcurrent: 10 }); // If your API can handle it

// ❌ Bad - may overwhelm API
useAIQueue({ maxConcurrent: 100 });

// ❌ Bad - too slow
useAIQueue({ maxConcurrent: 1 }); // Unless intentional
```

### 3. Handle Callbacks

```typescript
// ✅ Good - update UI on completion
useAIQueue({
  onTaskComplete: (taskId, result) => {
    // Update answer in database
    updateAnswer(taskId, result);
    // Refresh UI
    refetch();
  },
});

// ❌ Bad - no feedback
useAIQueue(); // User doesn't know what happened
```

### 4. Clear Completed Tasks

```typescript
// ✅ Good - clean up periodically
useEffect(() => {
  if (stats.completed > 100) {
    clearCompleted(); // Prevent memory bloat
  }
}, [stats.completed, clearCompleted]);

// ❌ Bad - queue grows indefinitely
// Never clearing completed tasks
```

---

## 🔍 Monitoring & Debugging

### Console Logging

All queue operations are logged:

```
📥 Added 5 tasks to queue
⚡ Starting AI processing...
🤖 Processing task abc123 (1/5)
✅ Task abc123 completed in 2.3s
❌ Task def456 failed: API error
🔄 Retrying task def456 (attempt 1/2)
✅ All tasks completed! Success rate: 80%
```

### Redux DevTools

Open Redux DevTools to see:
- Queue state in real-time
- Task transitions
- Performance metrics
- Time-travel debugging

### Performance Stats

```typescript
const { stats } = useAIQueue();

console.log('Stats:', {
  total: stats.total,
  completed: stats.completed,
  failed: stats.failed,
  successRate: `${stats.successRate}%`,
  avgTime: `${(stats.averageTime / 1000).toFixed(1)}s`,
});
```

---

## 🚦 Task Status Flow

```
pending → processing → completed ✅
    ↓         ↓
    ↓      failed ❌
    ↓         ↓
    ↓      retry (if attempts left)
    ↓         ↓
    └─────────┘
```

**Status Meanings:**
- **pending** - In queue, waiting to be processed
- **processing** - Currently being processed by AI
- **completed** - Successfully processed with results
- **failed** - Processing failed (after all retries)

---

## 📚 Complete Example

```typescript
import { useAIQueue } from './hooks/useAIQueue';
import { AIQueueManager } from './components/AIQueueManager';

function AnswerProcessingPage() {
  const { data: answers } = useQuery('answers', fetchAnswers);

  const {
    addToQueue,
    start,
    pause,
    stats,
    isProcessing,
    progress,
    canRetry,
    retryAll,
  } = useAIQueue({
    autoStart: false,
    maxConcurrent: 3,
    retryAttempts: 2,
    onTaskComplete: (taskId, result) => {
      console.log('Completed:', result);
      // Save to database
      saveAISuggestions(taskId, result);
    },
    onTaskFailed: (taskId, error) => {
      console.error('Failed:', taskId, error);
      // Log to error tracking
      logError(error);
    },
    onQueueEmpty: () => {
      toast.success('All processing complete!');
      refetchAnswers();
    },
  });

  const processSelected = (selectedAnswers: Answer[]) => {
    const ids = selectedAnswers.map(a => a.id);
    const texts = selectedAnswers.map(a => a.answer_text);

    addToQueue(ids, categoryId, texts);
    start();
  };

  return (
    <div className="p-6">
      <h1>Answer Processing</h1>

      {/* Selection UI */}
      <AnswerList
        answers={answers}
        onProcess={processSelected}
      />

      {/* Queue Manager */}
      <div className="mt-6">
        <AIQueueManager
          autoStart={false}
          maxConcurrent={3}
          showStats={true}
          compact={false}
        />
      </div>

      {/* Stats Summary */}
      {stats.total > 0 && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3>Summary</h3>
          <p>Progress: {Math.round(progress)}%</p>
          <p>Success Rate: {Math.round(stats.successRate)}%</p>
          <p>Average Time: {(stats.averageTime / 1000).toFixed(1)}s per task</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {isProcessing ? (
          <button onClick={pause}>Pause</button>
        ) : (
          <button onClick={start} disabled={queue.length === 0}>
            Start
          </button>
        )}

        {canRetry && (
          <button onClick={retryAll}>
            Retry {stats.failed} Failed
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## ⚡ Performance Tips

### 1. Limit Concurrent Tasks

```typescript
// Don't overwhelm the API
useAIQueue({ maxConcurrent: 3 }); // Safe default
```

### 2. Use Retry Wisely

```typescript
// Retry transient errors, not permanent ones
useAIQueue({
  retryAttempts: 2,   // Retry twice
  retryDelay: 2000,   // Wait 2s between retries
});
```

### 3. Clean Up Completed

```typescript
// Clear completed tasks to save memory
useEffect(() => {
  if (stats.completed > 50) {
    clearCompleted();
  }
}, [stats.completed]);
```

### 4. Monitor Success Rate

```typescript
// Alert if success rate drops
useEffect(() => {
  if (stats.total > 10 && stats.successRate < 50) {
    toast.error('High failure rate! Check API status');
  }
}, [stats.successRate, stats.total]);
```

---

## 🎉 Benefits

### For Users:
- ✅ Batch processing of multiple answers
- ✅ Real-time progress feedback
- ✅ Ability to cancel/retry
- ✅ Automatic retry on failures

### For Developers:
- ✅ Simple API (useAIQueue hook)
- ✅ Built-in state management
- ✅ Automatic concurrency control
- ✅ Rate limiting protection

### For System:
- ✅ Prevents API overload
- ✅ Efficient resource usage
- ✅ Graceful error handling
- ✅ Retry mechanism

---

## ✅ Summary

✅ **useAIQueueStore** - Zustand store for queue management
✅ **useAIQueue** - Simplified hook with auto-start & callbacks
✅ **AIQueueManager** - Full & compact UI components
✅ **Examples** in `src/components/examples/AIQueueExample.tsx`
✅ **Documentation** complete

**AI Queue system is production-ready!** 🤖

---

**Next:** Integrate with your categorization workflow and watch AI process hundreds of answers effortlessly! ⚡

