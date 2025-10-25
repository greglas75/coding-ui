# 🚀 Quick Start Guide - TGM Coding Suite

Get started with the refactored TGM Coding Suite in 5 minutes.

---

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account with project created
- Git (optional)

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Clone & Install (1 min)

```bash
cd coding-ui
npm install
```

---

### Step 2: Environment Setup (1 min)

Create `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

### Step 3: Database Setup (2 min)

Run SQL migrations in Supabase SQL Editor (in order):

#### 1. Core optimizations
```sql
-- Run: /docs/sql/2025-apply-optimizations-non-concurrent.sql
-- Creates indexes for answers, codes, categories
```

#### 2. Full-text search
```sql
-- Run: /docs/sql/2025-full-text-search.sql
-- Adds search functions and GIN indexes
```

#### 3. AI audit log (optional)
```sql
-- Run: /docs/sql/2025-ai-audit-log.sql
-- Creates audit table for AI auto-confirm
```

**Note:** Disable "Run in single transaction" in Supabase editor for step 1.

---

### Step 4: Start Development Server (1 min)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🎯 First Steps

### 1. **Add Your First Category**

1. Navigate to Categories page
2. Click "Add Category" button
3. Enter:
   - Name: "Luxury Brands"
   - Description: "High-end fashion brands"
   - GPT Template: (optional)
4. Click "Save & Close"

---

### 2. **Add Some Codes**

1. Navigate to Code List page
2. Click "Add Code"
3. Enter code name: "Gucci"
4. Select categories: "Luxury Brands"
5. Toggle "Whitelisted" if needed
6. Click "Save"

Repeat for: Dior, Chanel, Prada, etc.

---

### 3. **Start Coding**

1. Go to Categories page
2. Click on "Luxury Brands" category
3. Click "Code2" icon (green) to open Coding view
4. Use filters to find answers
5. Click on answer to assign codes
6. Use quick status buttons (W, B, G, I, etc.)

---

### 4. **Try AI Auto-Confirm** (Optional)

If you have AI predictions in your data:

1. Navigate to Categories
2. Select a category
3. Scroll to "AI Auto-Confirm Agent" panel
4. Click "Test (Dry Run)" to preview
5. Review results
6. Click "Confirm X Answers" to run

---

## 📚 Quick Reference

### Main Pages

| Page | URL | Purpose |
|------|-----|---------|
| Categories | `/` or `/categories` | Manage categories, view stats |
| Code List | `/codes` | Manage codes, assign to categories |
| Coding | `/coding?categoryId=X` | Code answers for a category |

---

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `ESC` | Close modal |
| `Ctrl+K` | Quick search (future) |
| `W` | Set status to Whitelist |
| `B` | Set status to Blacklist |
| `G` | Set status to Gibberish |
| `I` | Set status to Ignored |

---

### Filter Tips

**Multi-Select:**
- Click dropdown → Select multiple items
- Use "Select All" / "Unselect All"
- Search within dropdown (if searchable)
- Clear all with X button

**Search:**
- Debounced (300ms delay)
- Case-insensitive
- Searches in answer text

**Reset:**
- Click "Reset" to clear all filters
- Filters auto-apply on change

---

## 🧪 Testing Features

### Test Auto-Confirm

```tsx
// In browser console
import { testAutoConfirm } from './lib/autoConfirmAgent';

const result = await testAutoConfirm(123); // categoryId
console.log(result);
```

### Test Filters

1. Open Coding view
2. Apply multiple filters
3. Check URL updates
4. Refresh page - filters persist
5. Click Reset - all clear

---

## 🎨 Customization

### Change Theme

Click "Dark" / "Light" button in header

### Change Max Width

Edit `MainLayout` call:
```tsx
<MainLayout maxWidth="wide">  {/* or 'default' or 'full' */}
```

### Add Custom Filter

1. Update `useFilters.ts` to add new filter key
2. Add field to `FiltersBar.tsx`
3. Use `MultiSelectDropdown` component
4. Update filter logic in page

---

## 🐛 Troubleshooting

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database Errors

```sql
-- Check if tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY indexname;
```

### Filters Not Working

1. Check browser console for errors
2. Verify `useFilters` hook is imported
3. Check filter state in React DevTools
4. Verify debounce is working (wait 300ms)

### Auto-Confirm Issues

1. Run SQL migration for audit table
2. Check AI results format in database
3. Verify codes exist in database
4. Test with dry run first

---

## 📊 Health Check

Run this checklist after setup:

```bash
# Build check
npm run build

# Type check
npm run type-check  # or: tsc --noEmit

# Lint check
npm run lint
```

All should pass with no errors.

---

## 🎯 Common Tasks

### Add New Page

```tsx
// 1. Create page component
export function MyPage() {
  return (
    <MainLayout title="My Page" breadcrumbs={[...]}>
      <div>Content</div>
    </MainLayout>
  );
}

// 2. Add route in App.tsx
<Route path="/mypage" element={<MyPage />} />

// 3. Add navigation link in AppHeader.tsx
```

### Add New Filter

```tsx
// 1. Update useFilters.ts
interface FiltersState {
  ...
  newFilter: string[];  // Add this
}

// 2. Use in component
<MultiSelectDropdown
  label="New Filter"
  options={options}
  selected={filters.newFilter}
  onChange={(v) => setFilter('newFilter', v)}
/>

// 3. Update filter logic
if (filters.newFilter.length > 0) {
  filtered = filtered.filter(item => 
    filters.newFilter.includes(item.field)
  );
}
```

---

## 💡 Tips & Best Practices

### Performance
- ✅ Use `useMemo` for expensive computations
- ✅ Use `useCallback` for stable callbacks
- ✅ Enable searchable for 50+ options
- ✅ Use pagination for large datasets

### UX
- ✅ Add tooltips to all buttons
- ✅ Show loading states
- ✅ Provide helpful error messages
- ✅ Test on mobile devices

### Code Quality
- ✅ Use TypeScript types everywhere
- ✅ Follow existing patterns
- ✅ Add comments for complex logic
- ✅ Keep components small (<300 lines)

---

## 🔗 Quick Links

- [Main README](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Complete Refactor Summary](./COMPLETE_REFACTOR_SUMMARY.md)
- [MultiSelect Integration](./docs/MULTISELECTDROPDOWN_INTEGRATION.md)
- [AI Auto-Confirm Guide](./docs/AI_AUTO_CONFIRM_GUIDE.md)

---

**You're ready to code!** 🎉

Start by adding your first category and codes, then begin coding answers.

For detailed documentation, check the `/docs/` folder.

