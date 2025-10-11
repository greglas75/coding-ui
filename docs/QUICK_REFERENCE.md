# ⚡ Quick Reference - API Client, Zod, Zustand

## 🌐 API Client

### Basic Usage

```typescript
import { apiClient, get, post, put, del } from './services/apiClient';

// GET request
const data = await get<MyType>('/api/endpoint');

// POST request
const result = await post<ResponseType>('/api/endpoint', { key: 'value' });

// PUT request
const updated = await put<MyType>('/api/endpoint/1', { name: 'New Name' });

// DELETE request
await del('/api/endpoint/1');
```

### With Zod Validation

```typescript
import { apiClient } from './services/apiClient';
import { CategorySchema } from './schemas/categorySchema';
import { z } from 'zod';

// Single item
const response = await apiClient.get<Category>('/api/categories/1', {
  schema: CategorySchema
});

// Array
const response = await apiClient.get<Category[]>('/api/categories', {
  schema: z.array(CategorySchema)
});
```

### Features
- ✅ Timeout: 10 seconds
- ✅ Retry: 2 attempts with exponential backoff
- ✅ Error logging to console
- ✅ TypeScript generics
- ✅ Automatic Zod validation

---

## 📋 Zod Validation

### Quick Schemas

```typescript
import { z } from 'zod';

const MySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0).max(120).optional(),
  tags: z.array(z.string()).default([]),
});

type MyType = z.infer<typeof MySchema>;
```

### Parse Functions

```typescript
// Throws on error
const data = MySchema.parse(unknownData);

// Returns { success, data, error }
const result = MySchema.safeParse(unknownData);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Available Schemas

```typescript
import {
  CategorySchema, parseCategory, parseCategories,
  CodeSchema, parseCode, parseCodes,
  AnswerSchema, parseAnswer, parseAnswers,
  ProjectSchema, parseProject, parseProjects,
  ImportPackageSchema, parseImportPackage,
} from './schemas';
```

---

## 🏪 Zustand Stores

### Projects Store

```typescript
import { useProjectsStore, selectProjects } from './store';

function MyComponent() {
  // Get data
  const projects = useProjectsStore(selectProjects);
  const isLoading = useProjectsStore(state => state.isLoading);

  // Get actions
  const { fetchProjects, createProject } = useProjectsStore();

  // Use
  useEffect(() => {
    fetchProjects();
  }, []);
}
```

### Coding Store

```typescript
import { useCodingStore, selectAnswers, selectCodes } from './store';

function CodingComponent() {
  const answers = useCodingStore(selectAnswers);
  const codes = useCodingStore(selectCodes);
  const { assignCode, fetchAnswers } = useCodingStore();

  const handleAssign = async (answerId: number, codeId: number) => {
    await assignCode(answerId, codeId);
  };
}
```

### AI Queue Store

```typescript
import { useAIQueueStore, selectAIStats } from './store';

function AIPanel() {
  const stats = useAIQueueStore(selectAIStats);
  const { addTask, startProcessing } = useAIQueueStore();

  const handleBatch = () => {
    addTask([1, 2, 3], categoryId);
    startProcessing();
  };
}
```

---

## 📊 Common Patterns

### Pattern 1: Fetch Data on Mount

```typescript
const data = useMyStore(selectData);
const { fetchData } = useMyStore();

useEffect(() => {
  fetchData();
}, []);
```

### Pattern 2: Handle Loading/Error

```typescript
const isLoading = useMyStore(state => state.isLoading);
const error = useMyStore(state => state.error);
const { fetchData, clearError } = useMyStore();

if (error) return <Error message={error} onDismiss={clearError} />;
if (isLoading) return <Loading />;
```

### Pattern 3: Optimistic Updates

```typescript
const { updateItem } = useMyStore();

const handleUpdate = async (id: number, data: any) => {
  // Store handles optimistic update internally
  await updateItem(id, data);
  // UI updates immediately, rolls back on error
};
```

### Pattern 4: Multiple Stores

```typescript
const currentProject = useProjectsStore(selectCurrentProject);
const answers = useCodingStore(selectAnswers);
const aiStats = useAIQueueStore(selectAIStats);

// Combine data from multiple stores
const combinedData = {
  projectName: currentProject?.name,
  answerCount: answers.length,
  aiPending: aiStats.pending,
};
```

---

## 🎯 Migration Checklist

When migrating a component:

- [ ] Replace `fetch()` with `apiClient.get/post/put/delete`
- [ ] Add Zod schema for validation
- [ ] Replace `useState` with store state
- [ ] Replace `useEffect` with store actions
- [ ] Use store loading/error states
- [ ] Use selectors for performance
- [ ] Remove local error handling (store handles it)
- [ ] Test component works correctly

---

## 🔧 Debugging

### Redux DevTools
1. Install Redux DevTools browser extension
2. Open DevTools panel
3. See all store actions and state changes
4. Time travel through history

### Console Logs
All stores log important events:
```
✅ [fetchCategories] Fetched and validated 10 categories
❌ [Attempt 1] API Error in POST /api/data: HTTP 500
🤖 Processing 5 AI suggestions for answer 123
```

### Error Messages
Zod provides clear validation errors:
```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "number",
    "path": ["name"],
    "message": "Expected string, received number"
  }
]
```

---

## 📚 Full Documentation

- [API Client](./API_CLIENT_GUIDE.md)
- [Zod Validation](./ZOD_VALIDATION_GUIDE.md)
- [Zustand Stores](./ZUSTAND_STORES_GUIDE.md)
- [Refactoring Summary](./REFACTORING_SUMMARY.md)
- [Schema README](../src/schemas/README.md)

---

## 🎉 Quick Start

```typescript
// 1. API Call with validation
import { get } from './services/apiClient';
import { CategorySchema } from './schemas';
import { z } from 'zod';

const categories = await get<Category[]>('/api/categories', {
  schema: z.array(CategorySchema)
});

// 2. Use store
import { useCodingStore, selectAnswers } from './store';

const answers = useCodingStore(selectAnswers);
const { fetchAnswers } = useCodingStore();

useEffect(() => {
  fetchAnswers(categoryId);
}, [categoryId]);

// That's it! 🎉
```

