# 🎨 TGM Coding Suite - Style Guide

Complete design system and styling guidelines.

---

## 📖 Overview

Unified visual language for consistent, beautiful, and accessible user interfaces.

---

## 🎨 Color Palette

### CSS Variables

```css
:root {
  /* Backgrounds */
  --bg-light: #f9fafb;           /* Main background (light) */
  --bg-dark: #0a0a0a;            /* Main background (dark) */
  --bg-surface-light: #ffffff;   /* Card/surface (light) */
  --bg-surface-dark: #171717;    /* Card/surface (dark) */
  
  /* Text */
  --text-light: #111827;         /* Primary text (light) */
  --text-dark: #e5e7eb;          /* Primary text (dark) */
  --text-muted-light: #6b7280;   /* Secondary text (light) */
  --text-muted-dark: #9ca3af;    /* Secondary text (dark) */
  
  /* Accents */
  --accent-primary: #3b82f6;     /* Blue - primary actions */
  --accent-secondary: #8b5cf6;   /* Purple - secondary */
  --accent-success: #10b981;     /* Green - success */
  --accent-warning: #f59e0b;     /* Orange - warnings */
  --accent-danger: #ef4444;      /* Red - errors/delete */
  
  /* Borders */
  --border-light: #e5e7eb;
  --border-dark: #27272a;
  
  /* Hover */
  --hover-light: #f3f4f6;
  --hover-dark: #262626;
}
```

### Tailwind Classes

| Purpose | Light Mode | Dark Mode |
|---------|------------|-----------|
| Page background | `bg-gray-50` | `dark:bg-zinc-950` |
| Card background | `bg-white` | `dark:bg-zinc-900` |
| Input background | `bg-gray-50` | `dark:bg-neutral-800` |
| Primary text | `text-gray-900` | `dark:text-gray-100` |
| Secondary text | `text-gray-600` | `dark:text-gray-400` |
| Border | `border-gray-200` | `dark:border-neutral-700` |
| Hover background | `hover:bg-gray-100` | `dark:hover:bg-neutral-800` |

---

## 🔘 Buttons

### Primary Button

```tsx
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
  Primary Action
</button>
```

**Use for:** Main actions, submit, save

---

### Secondary Button

```tsx
<button className="px-4 py-2 bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors">
  Secondary Action
</button>
```

**Use for:** Cancel, back, alternative actions

---

### Danger Button

```tsx
<button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors">
  Delete
</button>
```

**Use for:** Delete, remove, destructive actions

---

### Icon Button

```tsx
<button className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors" title="Reload">
  <RefreshCw size={18} />
</button>
```

**Use for:** Icon-only actions, toolbar buttons

---

## 📦 Inputs & Forms

### Text Input

```tsx
<input
  type="text"
  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100"
  placeholder="Enter text..."
/>
```

### Textarea

```tsx
<textarea
  rows={4}
  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100"
  placeholder="Enter description..."
/>
```

### Select Dropdown

```tsx
<select className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-gray-100">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Checkbox

```tsx
<input
  type="checkbox"
  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-zinc-700 dark:border-zinc-600"
/>
```

---

## 🪟 Modals

### Standard Modal

```tsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
  <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 sm:p-6 md:p-8 max-w-4xl w-full shadow-2xl border border-gray-200 dark:border-neutral-700 animate-slideUp">
    {/* Content */}
  </div>
</div>
```

**Features:**
- ✅ Backdrop blur
- ✅ Responsive padding (`p-4 sm:p-6 md:p-8`)
- ✅ Fade-in animation
- ✅ Slide-up content
- ✅ Shadow and border

---

### Modal Header

```tsx
<div className="flex items-center justify-between mb-6">
  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
    Modal Title
  </h2>
  <button
    onClick={onClose}
    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
    title="Close (ESC)"
  >
    <X size={24} />
  </button>
</div>
```

---

### Modal Footer

```tsx
<div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-neutral-700">
  <button className="...">Cancel</button>
  <button className="...">Save</button>
</div>
```

---

## 📊 Tables

### Table Header

```tsx
<thead className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-gray-200 dark:border-neutral-700">
  <tr>
    <th className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      Column Name
    </th>
  </tr>
</thead>
```

---

### Table Row

```tsx
<tr className="border-b border-gray-100 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
    Cell content
  </td>
</tr>
```

---

## 🏷️ Badges & Tags

### Status Badge

```tsx
<span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
  Whitelisted
</span>
```

### Filter Tag

```tsx
<span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md flex items-center gap-1">
  Filter: Value
  <X size={12} className="cursor-pointer" />
</span>
```

---

## ✨ Animations

### Available Animations

| Class | Duration | Use Case |
|-------|----------|----------|
| `animate-fadeIn` | 0.2s | Modal appear |
| `animate-fadeOut` | 0.2s | Modal disappear |
| `animate-slideUp` | 0.3s | Content reveal |
| `animate-slideDown` | 0.3s | Content hide |
| `animate-pulse` | 2s loop | Loading indicator |
| `animate-spin` | 1s loop | Loading spinner |
| `animate-flash-ok` | 0.9s | Success flash |
| `animate-flash-err` | 0.9s | Error flash |
| `animate-pulseGlow` | 2s loop | Attention getter |

### Usage Examples

```tsx
// Modal fade in
<div className="animate-fadeIn">Modal content</div>

// Success flash on row
<tr className="animate-flash-ok">Updated row</tr>

// Loading spinner
<RefreshCw className="animate-spin" />

// Pulse glow on new item
<div className="animate-pulseGlow">New item</div>
```

---

## 📐 Spacing & Sizing

### Padding Scale

```css
p-1   = 4px      /* Compact */
p-2   = 8px      /* Small */
p-3   = 12px     /* Default */
p-4   = 16px     /* Medium */
p-6   = 24px     /* Large */
p-8   = 32px     /* Extra large */
```

### Gap Scale

```css
gap-1 = 4px      /* Tight */
gap-2 = 8px      /* Default */
gap-3 = 12px     /* Medium */
gap-4 = 16px     /* Large */
gap-6 = 24px     /* Extra large */
```

### Border Radius

```css
rounded-sm   = 2px      /* Very subtle */
rounded-md   = 6px      /* Default for inputs, buttons */
rounded-lg   = 8px      /* Cards, panels */
rounded-xl   = 12px     /* Modals, large cards */
rounded-2xl  = 16px     /* Hero sections */
rounded-full = 9999px   /* Pills, badges */
```

**Standard:** Use `rounded-md` for most elements, `rounded-xl` for modals.

---

## 🖱️ Interactive States

### Hover Effects

```tsx
// Subtle lift on hover
<button className="hover:transform hover:-translate-y-0.5 transition-all duration-200">
  Hover Me
</button>

// Background change
<div className="hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
  Hover Area
</div>

// Opacity change
<button className="opacity-70 hover:opacity-100 transition-opacity">
  Icon Button
</button>
```

### Active States

```tsx
// Button press
<button className="active:scale-95 transition-transform">
  Press Me
</button>

// Selected state
<div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500">
  Selected Item
</div>
```

### Focus States

```tsx
// Standard focus ring
<input className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />

// Custom focus
<button className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
  Button
</button>
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile first */
default: < 640px     /* Base styles */
sm:     ≥ 640px      /* Small tablets */
md:     ≥ 768px      /* Tablets */
lg:     ≥ 1024px     /* Desktops */
xl:     ≥ 1280px     /* Large desktops */
2xl:    ≥ 1536px     /* Extra large */
```

### Responsive Padding

```tsx
<div className="p-4 sm:p-6 md:p-8">
  Responsive padding
</div>
```

### Responsive Grid

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
  {/* Responsive columns */}
</div>
```

---

## 🌙 Dark Mode

### Dark Mode Classes

```tsx
// Background
className="bg-white dark:bg-zinc-900"

// Text
className="text-gray-900 dark:text-gray-100"

// Border
className="border-gray-200 dark:border-neutral-700"

// Hover
className="hover:bg-gray-100 dark:hover:bg-neutral-800"
```

### Dark Mode Best Practices

1. **Always pair light and dark:** Never use light colors without dark equivalent
2. **Test contrast:** Ensure 4.5:1 minimum contrast ratio
3. **Use semantic colors:** `gray` for neutral, `zinc/neutral` for dark mode
4. **Softer backgrounds:** Use `zinc-900` not pure black in dark mode

---

## 🎯 Component Patterns

### Card

```tsx
<div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 shadow-sm">
  Card content
</div>
```

### Info Box

```tsx
<div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
  <p className="text-sm text-blue-700 dark:text-blue-300">
    Information message
  </p>
</div>
```

### Success Alert

```tsx
<div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
  <p className="text-sm text-green-700 dark:text-green-300">
    ✓ Success message
  </p>
</div>
```

### Error Alert

```tsx
<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
  <p className="text-sm text-red-700 dark:text-red-300">
    ✗ Error message
  </p>
</div>
```

---

## 🎬 Animations

### Modal Entrance

```tsx
// Backdrop
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn">
  
  // Modal content
  <div className="bg-white rounded-xl animate-slideUp">
    Content
  </div>
</div>
```

### Success Flash

```tsx
// Row flash on update
<tr className="animate-flash-ok">
  Updated row
</tr>
```

### Loading Spinner

```tsx
<div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
```

---

## 📏 Typography

### Headings

```tsx
<h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
  Page Title
</h1>

<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
  Section Title
</h2>

<h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
  Subsection
</h3>
```

### Body Text

```tsx
<p className="text-sm text-gray-700 dark:text-gray-300">
  Regular paragraph text
</p>

<p className="text-xs text-gray-500 dark:text-gray-400">
  Small helper text
</p>
```

### Labels

```tsx
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
  Field Label
</label>
```

---

## 🔍 Search & Filters

### Search Input with Icon

```tsx
<div className="relative">
  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
  <input
    type="text"
    placeholder="Search..."
    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 outline-none"
  />
</div>
```

### Filter Dropdown

```tsx
<MultiSelectDropdown
  label="Type"
  options={options}
  selected={selected}
  onChange={setSelected}
  searchable
  enableSelectAll
/>
```

---

## 📐 Layout Patterns

### Page Container

```tsx
<MainLayout 
  title="Page Title"
  breadcrumbs={breadcrumbs}
  maxWidth="wide"
>
  <Content />
</MainLayout>
```

### Two-Column Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Left: 2/3 */}
  <div className="col-span-1 md:col-span-2">
    Main content
  </div>
  
  {/* Right: 1/3 */}
  <div className="col-span-1">
    Sidebar
  </div>
</div>
```

### Split View

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <div>Left panel</div>
  <div>Right panel</div>
</div>
```

---

## 🎨 Shadows

```css
shadow-sm    /* Subtle - cards */
shadow-md    /* Default - dropdowns */
shadow-lg    /* Prominent - modals */
shadow-xl    /* Very prominent - dialogs */
shadow-2xl   /* Maximum - overlays */
```

---

## 🌈 Semantic Colors

### Success (Green)

```tsx
// Background
bg-green-50 dark:bg-green-900/20

// Text  
text-green-700 dark:text-green-300

// Border
border-green-200 dark:border-green-800

// Button
bg-green-600 hover:bg-green-700 text-white
```

### Warning (Orange/Yellow)

```tsx
bg-yellow-50 dark:bg-yellow-900/20
text-yellow-700 dark:text-yellow-300
border-yellow-200 dark:border-yellow-800
```

### Error (Red)

```tsx
bg-red-50 dark:bg-red-900/20
text-red-700 dark:text-red-300
border-red-200 dark:border-red-800
```

### Info (Blue)

```tsx
bg-blue-50 dark:bg-blue-900/20
text-blue-700 dark:text-blue-300
border-blue-200 dark:border-blue-800
```

---

## 🎯 Best Practices

### 1. Consistent Transitions

✅ **DO:**
```tsx
className="transition-colors duration-200"
className="transition-all duration-200"
```

❌ **DON'T:**
```tsx
className="transition-all"  // No duration specified
className="transition"      // Too generic
```

---

### 2. Responsive Padding

✅ **DO:**
```tsx
className="p-4 sm:p-6 md:p-8"
className="px-4 py-2 sm:px-6 sm:py-3"
```

❌ **DON'T:**
```tsx
className="p-8"  // Too much on mobile
className="p-1"  // Too little on desktop
```

---

### 3. Dark Mode Pairing

✅ **DO:**
```tsx
className="bg-white dark:bg-zinc-900"
className="text-gray-900 dark:text-gray-100"
```

❌ **DON'T:**
```tsx
className="bg-white"  // Missing dark mode
className="text-black dark:text-gray-100"  // Use gray-900, not black
```

---

### 4. Border Radius Consistency

✅ **DO:**
```tsx
// Inputs, buttons, small cards
className="rounded-md"

// Large cards, panels
className="rounded-lg"

// Modals
className="rounded-xl"

// Pills, badges
className="rounded-full"
```

❌ **DON'T:**
```tsx
className="rounded-sm"   // Too subtle
className="rounded-3xl"  // Inconsistent
```

---

## 📚 Component Examples

### Loading State

```tsx
{loading && (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <p className="ml-4 text-gray-500 dark:text-gray-400">Loading...</p>
  </div>
)}
```

### Empty State

```tsx
<div className="text-center py-12">
  <FolderOpen size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
  <p className="text-gray-500 dark:text-gray-400">No items found</p>
  <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">
    Add First Item
  </button>
</div>
```

### Breadcrumbs

```tsx
<nav className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
  <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">
    <Home size={14} />
    Home
  </Link>
  <ChevronRight size={14} />
  <span className="text-blue-600 dark:text-blue-400 font-medium">Current Page</span>
</nav>
```

---

## 🎉 Summary

### Design Principles

1. **Consistency** - Same spacing, colors, transitions everywhere
2. **Accessibility** - Proper contrast, focus states, tooltips
3. **Responsiveness** - Mobile-first, adapts to all screens
4. **Performance** - Lightweight animations, optimized CSS
5. **Dark Mode** - Full support, beautiful in both themes

### Quick Reference

```css
/* Colors */
Blue:    bg-blue-600 hover:bg-blue-700
Gray:    bg-gray-200 hover:bg-gray-300
Green:   bg-green-600 hover:bg-green-700
Red:     bg-red-600 hover:bg-red-700

/* Padding */
Small:   p-2 sm:p-3
Default: p-4 sm:p-6
Large:   p-6 sm:p-8

/* Borders */
Default: border border-gray-200 dark:border-neutral-700
Rounded: rounded-md (inputs), rounded-xl (modals)

/* Transitions */
All:     transition-all duration-200
Colors:  transition-colors duration-200

/* Animations */
Modal:   animate-fadeIn + animate-slideUp
Success: animate-flash-ok
Loading: animate-spin
```

---

**Style guide complete!** 🎨

