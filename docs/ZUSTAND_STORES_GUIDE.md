# 🏪 Zustand Stores - Global State Management Guide

## ✅ What Has Been Implemented

### 1. Three Global Stores

Created three Zustand stores for different domains:

- **`useProjectsStore`** - Project management
- **`useCodingStore`** - Coding/categorization workflow
- **`useAIQueueStore`** - AI processing queue

### 2. Features

✅ **DevTools Integration** - Debug with Redux DevTools
✅ **Persistence** - Auto-save state to localStorage
✅ **TypeScript** - Full type safety
✅ **Async Actions** - Integrated with apiClient
✅ **Loading States** - Track loading/error for each operation
✅ **Selectors** - Optimized component re-renders

## 📚 Available Stores

### 🗂️ Projects Store (`useProjectsStore`)

Manages project-level data and operations.

#### State

```typescript
{
  projects: Project[];
  projectsWithStats: ProjectWithStats[];
  currentProject: Project | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
}
```

#### Actions

```typescript
fetchProjects(): Promise<void>
fetchProjectsWithStats(): Promise<void>
fetchProject(id: number): Promise<void>
createProject(data): Promise<Project | null>
updateProject(id: number, data): Promise<void>
deleteProject(id: number): Promise<void>
setCurrentProject(project: Project | null): void
clearError(): void
```

#### Usage Example

```typescript
import { useProjectsStore, selectProjects, selectProjectsIsLoading } from './store';

function ProjectsList() {
  // Option 1: Direct hook usage
  const { projects, isLoading, fetchProjects } = useProjectsStore();

  // Option 2: Optimized with selectors (prevents unnecessary re-renders)
  const projects = useProjectsStore(selectProjects);
  const isLoading = useProjectsStore(selectProjectsIsLoading);

  useEffect(() => {
    fetchProjects();
  }, []);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {projects.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

### 🎯 Coding Store (`useCodingStore`)

Manages coding workflow, answers, codes, and filters.

#### State

```typescript
{
  answers: Answer[];
  codes: Code[];
  categories: Category[];
  currentCategory: Category | null;
  selectedAnswer: Answer | null;
  filters: FilterState;
  isLoadingAnswers: boolean;
  isLoadingCodes: boolean;
  isLoadingCategories: boolean;
  isSaving: boolean;
  isCategorizing: boolean;
  error: string | null;
  stats: CodingStats;
}
```

#### Actions

```typescript
// Fetching
fetchAnswers(categoryId?: number): Promise<void>
fetchCodes(categoryId?: number): Promise<void>
fetchCategories(): Promise<void>

// Coding
assignCode(answerId: number, codeId: number): Promise<void>
assignCodes(answerId: number, codeIds: number[]): Promise<void>
updateAnswerStatus(answerId: number, status: string): Promise<void>
categorizeAnswer(answerId: number): Promise<void>

// Batch operations
batchAssignCode(answerIds: number[], codeId: number): Promise<void>
batchUpdateStatus(answerIds: number[], status: string): Promise<void>

// Filters
setFilter(key: string, value: any): void
resetFilters(): void

// Utility
setCurrentCategory(category: Category | null): void
setSelectedAnswer(answer: Answer | null): void
clearError(): void
refreshStats(): void
```

#### Usage Example

```typescript
import { useCodingStore, selectAnswers, selectCodingIsLoading } from './store';

function CodingView() {
  const answers = useCodingStore(selectAnswers);
  const isLoading = useCodingStore(selectCodingIsLoading);
  const { assignCode, updateAnswerStatus } = useCodingStore();

  const handleAssignCode = async (answerId: number, codeId: number) => {
    await assignCode(answerId, codeId);
  };

  return (
    <div>
      {answers.map(answer => (
        <div key={answer.id}>
          {answer.answer_text}
          <button onClick={() => handleAssignCode(answer.id, 1)}>
            Assign Code
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 🤖 AI Queue Store (`useAIQueueStore`)

Manages AI processing queue with concurrent task handling.

#### State

```typescript
{
  queue: AITask[];
  processing: AITask[];
  completed: AITask[];
  failed: AITask[];
  stats: QueueStats;
  config: QueueConfig;
  isProcessing: boolean;
  isPaused: boolean;
}
```

#### Actions

```typescript
// Queue management
addTask(answerIds: number[], categoryId: number): void
addSingleTask(answerId: number, answerText: string, categoryId: number): void
removeTask(taskId: string): void
clearQueue(): void
clearCompleted(): void
clearFailed(): void

// Processing
startProcessing(): Promise<void>
pauseProcessing(): void
resumeProcessing(): void
retryFailed(): void

// Task updates
updateTask(taskId: string, updates: Partial<AITask>): void
moveToProcessing(taskId: string): void
moveToCompleted(taskId: string, result: any): void
moveToFailed(taskId: string, error: string): void

// Configuration
updateConfig(config: Partial<QueueConfig>): void

// Utility
getTask(taskId: string): AITask | undefined
refreshStats(): void
```

#### Usage Example

```typescript
import {
  useAIQueueStore,
  selectAIQueue,
  selectAIStats
} from './store';

function AIQueuePanel() {
  const queue = useAIQueueStore(selectAIQueue);
  const stats = useAIQueueStore(selectAIStats);
  const {
    addTask,
    startProcessing,
    pauseProcessing
  } = useAIQueueStore();

  const handleBatchProcess = () => {
    const answerIds = [1, 2, 3, 4, 5];
    addTask(answerIds, categoryId);
    startProcessing();
  };

  return (
    <div>
      <h3>AI Queue ({stats.pending} pending)</h3>
      <button onClick={handleBatchProcess}>Process Batch</button>
      <button onClick={pauseProcessing}>Pause</button>

      {queue.map(task => (
        <div key={task.id}>
          {task.answerText} - {task.status} ({task.progress}%)
        </div>
      ))}
    </div>
  );
}
```

## 🎨 Best Practices

### 1. Use Selectors for Performance

```typescript
// ❌ Bad - re-renders on any store change
const store = useCodingStore();

// ✅ Good - only re-renders when answers change
const answers = useCodingStore(selectAnswers);
```

### 2. Destructure Actions Outside Render

```typescript
// ✅ Good - actions don't cause re-renders
function MyComponent() {
  const answers = useCodingStore(selectAnswers);
  const { assignCode } = useCodingStore();

  // assignCode is stable, won't cause re-renders
}
```

### 3. Handle Loading and Error States

```typescript
function MyComponent() {
  const isLoading = useCodingStore(selectCodingIsLoading);
  const error = useCodingStore(state => state.error);
  const { fetchAnswers, clearError } = useCodingStore();

  useEffect(() => {
    fetchAnswers();
  }, []);

  if (error) {
    return (
      <div>
        Error: {error}
        <button onClick={clearError}>Retry</button>
      </div>
    );
  }

  if (isLoading) return <div>Loading...</div>;

  return <div>Content</div>;
}
```

### 4. Combine Multiple Stores

```typescript
function Dashboard() {
  const currentProject = useProjectsStore(selectCurrentProject);
  const answers = useCodingStore(selectAnswers);
  const aiStats = useAIQueueStore(selectAIStats);

  return (
    <div>
      <h1>{currentProject?.name}</h1>
      <p>{answers.length} answers</p>
      <p>{aiStats.pending} AI tasks pending</p>
    </div>
  );
}
```

## 🔧 Middleware

### DevTools

All stores are wrapped with `devtools()` for Redux DevTools integration:

```typescript
// Install Redux DevTools extension in your browser
// Actions will appear in the DevTools with descriptive names like:
// - "projects/fetchProjects"
// - "coding/assignCode"
// - "aiQueue/startProcessing"
```

### Persist

Some stores use `persist()` to save state to localStorage:

```typescript
// Projects Store persists:
- currentProject

// Coding Store persists:
- currentCategory
- filters
```

## 🚀 Integration with Components

### Example: Replace useState with Store

#### Before (Local State)

```typescript
function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const result = await fetchCategories();
        setCategories(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadCategories();
  }, []);

  // ... rest of component
}
```

#### After (Zustand Store)

```typescript
import { useCodingStore, selectCodingCategories, selectCodingIsLoading } from './store';

function CategoriesPage() {
  const categories = useCodingStore(selectCodingCategories);
  const isLoading = useCodingStore(selectCodingIsLoading);
  const error = useCodingStore(state => state.error);
  const { fetchCategories } = useCodingStore();

  useEffect(() => {
    fetchCategories();
  }, []);

  // ... rest of component (much cleaner!)
}
```

## 📊 Benefits

1. **Centralized State** - All data in one place
2. **No Prop Drilling** - Access state from any component
3. **Optimized Re-renders** - Selectors prevent unnecessary updates
4. **DevTools** - Debug state changes easily
5. **Persistence** - Auto-save important state
6. **Type Safety** - Full TypeScript support
7. **Cleaner Code** - Less useState/useEffect boilerplate

## 🔍 Debugging

### Redux DevTools

1. Install Redux DevTools browser extension
2. Open DevTools in your app
3. See all store actions and state changes
4. Time travel through state history

### Console Logging

All stores log important actions:

```
✅ Project created: { id: 1, name: "New Project" }
✅ Added 5 tasks to AI queue
❌ Failed to fetch answers: Network error
```

## 📝 TODO Integration

When implementing stores in components, replace:

- `useState` with store state
- `useEffect` fetch calls with store actions
- Local error handling with store error state
- Loading states with store loading flags

## 🎯 Next Steps

To integrate stores into components:

1. Import store and selectors
2. Replace useState with store state
3. Replace useEffect data fetching with store actions
4. Use loading/error states from store
5. Call async actions directly (no try/catch needed)

## 📖 Resources

- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [DevTools Integration](https://github.com/pmndrs/zustand#redux-devtools)
- [Persist Middleware](https://github.com/pmndrs/zustand#persist-middleware)
- [Store Code](../src/store/)

## 🎉 Summary

Three powerful Zustand stores are **fully implemented** with:
- ✅ TypeScript types
- ✅ Async actions with apiClient
- ✅ Loading/error states
- ✅ DevTools support
- ✅ Persistence
- ✅ Optimized selectors

Ready to replace local state in components! 🚀

