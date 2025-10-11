# 🚀 START HERE - Coding UI Application

## 📅 Last Updated: October 9, 2025

Welcome to the **Coding UI Application** - a professional tool for survey response coding and categorization with AI-powered suggestions.

---

## ⚡ Quick Start

### 1. Installation

```bash
cd /Users/greglas/coding-ui
npm install
```

### 2. Development Server

```bash
npm run dev
# Server runs on http://localhost:5173/
```

### 3. Build for Production

```bash
npm run build
npm run preview
```

---

## 📚 **NEW: Architecture Refactoring (October 9, 2025)**

The application has been completely refactored with modern best practices:

### 🎯 Read These First:

1. **[REFACTORING_INDEX.md](./REFACTORING_INDEX.md)** - Complete index of all refactoring docs
2. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick cheat sheet (API, Zod, Zustand)
3. **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Detailed overview of changes

### 🔑 Key Improvements:

#### 1. Centralized API Client (`src/services/apiClient.ts`)
- ✅ Timeout protection (10 seconds)
- ✅ Automatic retry (2x with exponential backoff)
- ✅ Error handling and logging
- ✅ TypeScript generics

#### 2. Zod Runtime Validation (`src/schemas/`)
- ✅ Runtime type checking for all API responses
- ✅ Automatic validation in API Client
- ✅ Type inference from schemas
- ✅ Clear error messages

#### 3. Zustand Global State (`src/store/`)
- ✅ Three global stores: Projects, Coding, AI Queue
- ✅ DevTools integration (Redux DevTools)
- ✅ Persistence (localStorage)
- ✅ Loading/error states built-in

---

## 📖 Documentation Structure

### 🆕 New Architecture (Start Here!)
- `docs/REFACTORING_INDEX.md` - **START HERE** for refactoring overview
- `docs/QUICK_REFERENCE.md` - Quick cheat sheet
- `docs/REFACTORING_SUMMARY.md` - Detailed summary
- `docs/ZOD_VALIDATION_GUIDE.md` - Zod validation guide
- `docs/ZUSTAND_STORES_GUIDE.md` - Zustand stores guide
- `docs/SCHEMAS_README.md` - Schema documentation

### 🏗️ Core Features
- `docs/API_SERVER_GUIDE.md` - Backend API setup
- `docs/OPENAI_INTEGRATION.md` - OpenAI/GPT integration
- `docs/REACT_QUERY_MIGRATION_GUIDE.md` - React Query usage
- `docs/SUPABASE_OPTIMIZATION_GUIDE.md` - Database optimization

### 🎨 UI/UX
- `docs/STYLE_GUIDE.md` - Design system
- `docs/MULTISELECTDROPDOWN_VISUAL_GUIDE.md` - Filter components
- `docs/FILE_DATA_CODING_GUIDE.md` - File upload feature

### 🤖 AI Features
- `docs/AI_AUTO_CONFIRM_GUIDE.md` - Auto-confirm AI suggestions
- `docs/AI_SUGGESTIONS_IMPLEMENTATION.md` - AI categorization
- `docs/GPT_TESTING_GUIDE.md` - Testing AI prompts

### 📦 Older Documentation
- `docs/archive/` - Historical documentation (moved from root)

---

## 🏗️ Project Structure

```
coding-ui/
├── src/
│   ├── services/          # ✨ NEW: API Client
│   │   └── apiClient.ts
│   ├── schemas/           # ✨ NEW: Zod Validation
│   │   ├── categorySchema.ts
│   │   ├── codeSchema.ts
│   │   ├── answerSchema.ts
│   │   ├── projectSchema.ts
│   │   └── importPackageSchema.ts
│   ├── store/             # ✨ NEW: Zustand Stores
│   │   ├── useProjectsStore.ts
│   │   ├── useCodingStore.ts
│   │   └── useAIQueueStore.ts
│   ├── components/
│   │   ├── CodingGrid/    # Main coding interface
│   │   ├── FiltersBar/    # Advanced filtering
│   │   └── examples/      # ✨ NEW: Usage examples
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and helpers
│   ├── pages/             # Page components
│   └── types.ts           # TypeScript types
├── docs/                  # 📚 Documentation
│   ├── REFACTORING_INDEX.md    # ✨ Start here!
│   ├── QUICK_REFERENCE.md      # ✨ Quick guide
│   ├── ZOD_VALIDATION_GUIDE.md # ✨ Validation
│   ├── ZUSTAND_STORES_GUIDE.md # ✨ State management
│   ├── sql/               # Database schemas
│   └── archive/           # Old documentation
└── README.md              # This file
```

---

## 💡 Common Tasks

### Add a New API Endpoint

```typescript
// 1. Define in apiClient or create new function
import { post } from './services/apiClient';
import { MySchema } from './schemas/mySchema';

export async function myApiCall(data: any) {
  return await post<MyType>('/api/my-endpoint', data, {
    schema: MySchema // Automatic validation
  });
}
```

### Use Global State

```typescript
// 2. Use Zustand store
import { useCodingStore, selectAnswers } from './store';

function MyComponent() {
  const answers = useCodingStore(selectAnswers);
  const { fetchAnswers } = useCodingStore();

  useEffect(() => {
    fetchAnswers(categoryId);
  }, [categoryId]);
}
```

### Create a New Schema

```typescript
// 3. Define Zod schema
import { z } from 'zod';

export const MySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
});

export type MyType = z.infer<typeof MySchema>;
```

---

## 🛠️ Development Tools

### Redux DevTools
Install browser extension to debug Zustand stores:
- Chrome: [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/)
- Firefox: [Redux DevTools](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

### TypeScript
```bash
npm run type-check  # Check types without building
```

### Linting
```bash
npm run lint        # Run ESLint
```

---

## 📦 Backups

### Latest Backup (with refactoring):
```
/Users/greglas/coding-ui-FINAL-REFACTORED-20251009-165644.tar.gz (1.2 MB)
```

### Previous Backups:
```
/Users/greglas/coding-ui-backup-20251009-163726.tar.gz (1.2 MB)
```

To restore:
```bash
cd /Users/greglas
tar -xzf coding-ui-FINAL-REFACTORED-20251009-165644.tar.gz -C coding-ui-restored/
cd coding-ui-restored
npm install
npm run dev
```

---

## 🎓 Learning Path

### New to the Project?

1. **Day 1:** Read `REFACTORING_INDEX.md` and `QUICK_REFERENCE.md`
2. **Day 2:** Explore `src/store/` and `src/schemas/`
3. **Day 3:** Check `src/components/examples/StoreUsageExample.tsx`
4. **Day 4:** Review `ZOD_VALIDATION_GUIDE.md` and `ZUSTAND_STORES_GUIDE.md`
5. **Day 5:** Start contributing! 🎉

### Already Familiar?

- **API Changes?** → Check `QUICK_REFERENCE.md`
- **Adding Features?** → Use stores in `src/store/`
- **Need Validation?** → Use schemas in `src/schemas/`
- **Debugging?** → Use Redux DevTools

---

## 🎯 Architecture Highlights

### Type Safety
- **Compile-time:** TypeScript
- **Runtime:** Zod validation
- **API responses:** Validated before entering components

### Error Handling
- **Automatic retry** on network errors
- **Timeout protection** (10 seconds)
- **Detailed logging** for debugging
- **User-friendly** error messages

### State Management
- **Global stores** for shared data
- **Local state** for UI-only state
- **Optimized re-renders** with selectors
- **Persistence** for important data

### Performance
- **Lazy loading** with React.lazy
- **Code splitting** by route
- **Memoization** where needed
- **Debounced** search and filters

---

## 🚨 Important Notes

### Database
- Uses **Supabase** for PostgreSQL database
- Schema migrations in `docs/sql/`
- RPC functions for complex queries

### Environment Variables
- Copy `.env.example` to `.env.local`
- Configure Supabase and OpenAI keys

### Port
- Dev server: **http://localhost:5173/**
- API server: **http://localhost:3001/**

---

## 📞 Support

### Documentation
- Check `docs/REFACTORING_INDEX.md` for complete guide
- Review `docs/QUICK_REFERENCE.md` for quick answers
- Read specific guides for detailed info

### Code Examples
- `src/components/examples/` - Usage examples
- `docs/` - Comprehensive guides

### Issues
- Check console for detailed error logs
- Use Redux DevTools for state debugging
- Review Zod validation errors

---

## ✅ Verification

Current status (October 9, 2025):

- [x] TypeScript compilation: **SUCCESS** ✅
- [x] Build process: **SUCCESS** ✅
- [x] No linter errors: **CONFIRMED** ✅
- [x] Dev server running: **ACTIVE** ✅
- [x] Documentation complete: **DONE** ✅
- [x] Backup created: **DONE** ✅

---

## 🎉 Ready to Use!

The application is **production-ready** with:
- **Robust API layer** (timeout, retry, validation)
- **Type-safe architecture** (compile-time + runtime)
- **Global state management** (Zustand)
- **Comprehensive documentation**

**Happy coding! 🚀**

