# 🎨 MultiSelectDropdown - Visual Guide

Interactive visual guide showing the component in all states and configurations.

---

## 🖼️ Component States

### 1️⃣ **Empty State (Nothing Selected)**

```
┌─────────────────────────────────────────┐
│ Type                                    │  ← Label
│ ┌─────────────────────────────────────┐ │
│ │ Select...                        ▼  │ │  ← Placeholder + Chevron
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**State:** Closed, no selection  
**Color:** Light gray background (`bg-gray-50`)  
**Text:** Gray placeholder (`text-gray-500`)

---

### 2️⃣ **Single Item Selected**

```
┌─────────────────────────────────────────┐
│ Type                                    │
│ ┌─────────────────────────────────────┐ │
│ │ Whitelist                    ✕   ▼  │ │  ← Item name + Clear + Chevron
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**State:** Closed, 1 selected  
**Display:** Shows the selected item name  
**Clear button (✕):** Visible on hover

---

### 3️⃣ **Multiple Items Selected**

```
┌─────────────────────────────────────────┐
│ Type                                    │
│ ┌─────────────────────────────────────┐ │
│ │ 3 selected                   ✕   ▼  │ │  ← Count + Clear + Chevron
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**State:** Closed, 3 selected  
**Display:** "3 selected"

---

### 4️⃣ **All Items Selected**

```
┌─────────────────────────────────────────┐
│ Type                                    │
│ ┌─────────────────────────────────────┐ │
│ │ All selected                 ✕   ▼  │ │  ← Special text
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**State:** Closed, all selected  
**Display:** "All selected"

---

### 5️⃣ **Disabled State**

```
┌─────────────────────────────────────────┐
│ Type                                    │
│ ┌─────────────────────────────────────┐ │
│ │ 3 selected                       ▼  │ │  ← Grayed out, no clear button
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
     ↑ opacity-50, cursor-not-allowed
```

**State:** Disabled  
**Style:** 50% opacity, no hover effect  
**Interaction:** Cannot open or clear

---

## 🎯 Open State (Basic)

### 6️⃣ **Dropdown Open - No Search**

```
┌─────────────────────────────────────────┐
│ Type                                    │
│ ┌─────────────────────────────────────┐ │
│ │ 2 selected                   ✕   ▲  │ │  ← Chevron rotated
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Select All      |     Unselect All  │ │  ← Bulk actions
│ ├─────────────────────────────────────┤ │
│ │ ☑ Whitelist                         │ │  ← Selected (blue bg)
│ │ ☑ Blacklist                         │ │  ← Selected
│ │ ☐ Gibberish                         │ │  ← Not selected
│ │ ☐ Ignored                           │ │
│ │ ☐ Other                             │ │
│ │ ☐ Bad Word                          │ │
│ ├─────────────────────────────────────┤ │
│ │ 2 of 6 selected                     │ │  ← Footer count
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**State:** Open  
**Features:**
- Bulk action buttons at top
- Checkboxes for each option
- Selected items have blue background
- Footer shows selection count

---

### 7️⃣ **Dropdown Open - With Search**

```
┌─────────────────────────────────────────┐
│ Type                                    │
│ ┌─────────────────────────────────────┐ │
│ │ 2 selected                   ✕   ▲  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 🔍 Search...                        │ │  ← Search input
│ ├─────────────────────────────────────┤ │
│ │ Select All      |     Unselect All  │ │
│ ├─────────────────────────────────────┤ │
│ │ ☑ Whitelist                         │ │
│ │ ☑ Blacklist                         │ │
│ │ ☐ Gibberish                         │ │
│ │ ☐ Ignored                           │ │
│ │ ☐ Other                             │ │
│ │ ☐ Bad Word                          │ │
│ ├─────────────────────────────────────┤ │
│ │ 2 of 6 selected                     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**State:** Open with search enabled  
**Feature:** Search input at the top with icon

---

### 8️⃣ **Dropdown Open - Search Active**

```
┌─────────────────────────────────────────┐
│ Type                                    │
│ ┌─────────────────────────────────────┐ │
│ │ 1 selected                   ✕   ▲  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 🔍 list▊                            │ │  ← User typing
│ ├─────────────────────────────────────┤ │
│ │ Select All      |     Unselect All  │ │
│ ├─────────────────────────────────────┤ │
│ │ ☑ Whitelist                         │ │  ← Matches "list"
│ │ ☐ Blacklist                         │ │  ← Matches "list"
│ ├─────────────────────────────────────┤ │  ← Other items hidden
│ │ 1 of 2 selected                     │ │  ← Count updated
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**State:** Search filtering active  
**Behavior:**
- Only matching items shown
- "Select All" affects only visible items
- Count shows filtered results

---

### 9️⃣ **No Results Found**

```
┌─────────────────────────────────────────┐
│ Type                                    │
│ ┌─────────────────────────────────────┐ │
│ │ 0 selected                       ▲  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 🔍 xyz▊                             │ │
│ ├─────────────────────────────────────┤ │
│ │ Select All      |     Unselect All  │ │
│ ├─────────────────────────────────────┤ │
│ │                                     │ │
│ │      No options found               │ │  ← Empty state message
│ │                                     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**State:** Search with no matches  
**Message:** "No options found" (centered, gray text)

---

## 🎨 Color States

### Light Mode

#### Unselected Option (Hover)
```
┌─────────────────────────────────────┐
│ ☐ Option Name                       │  bg-gray-50 (light gray hover)
└─────────────────────────────────────┘
```

#### Selected Option
```
┌─────────────────────────────────────┐
│ ☑ Option Name                       │  bg-blue-50 + text-blue-700
└─────────────────────────────────────┘
```

#### Header/Footer
```
┌─────────────────────────────────────┐
│ Select All      |     Unselect All  │  bg-gray-50
└─────────────────────────────────────┘
```

---

### Dark Mode

#### Unselected Option (Hover)
```
┌─────────────────────────────────────┐
│ ☐ Option Name                       │  dark:bg-neutral-800
└─────────────────────────────────────┘
```

#### Selected Option
```
┌─────────────────────────────────────┐
│ ☑ Option Name                       │  dark:bg-blue-900/20 + dark:text-blue-300
└─────────────────────────────────────┘
```

#### Header/Footer
```
┌─────────────────────────────────────┐
│ Select All      |     Unselect All  │  dark:bg-neutral-800
└─────────────────────────────────────┘
```

---

## 📱 Responsive Layouts

### 1️⃣ Desktop (≥1024px) - 6 Columns

```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Search   │ Type ▼   │ Status ▼ │ Code ▼   │ Language │ Country  │
│ Answer   │          │          │          │ ▼        │ ▼        │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

**Grid:** `grid-cols-6`  
**Gap:** `gap-3`

---

### 2️⃣ Tablet (768px - 1023px) - 3 Columns

```
┌──────────┬──────────┬──────────┐
│ Search   │ Type ▼   │ Status ▼ │
│ Answer   │          │          │
├──────────┼──────────┼──────────┤
│ Code ▼   │ Language │ Country  │
│          │ ▼        │ ▼        │
└──────────┴──────────┴──────────┘
```

**Grid:** `md:grid-cols-3`  
**Rows:** 2

---

### 3️⃣ Mobile (<768px) - 1 Column

```
┌─────────────────────────────────┐
│ Search Answer                   │
├─────────────────────────────────┤
│ Type ▼                          │
├─────────────────────────────────┤
│ Status ▼                        │
├─────────────────────────────────┤
│ Code ▼                          │
├─────────────────────────────────┤
│ Language ▼                      │
├─────────────────────────────────┤
│ Country ▼                       │
└─────────────────────────────────┘
```

**Grid:** `grid-cols-1`  
**Full width:** Each filter takes full width

---

## 🎯 Interactive States

### Hover Effects

#### Button Hover
```
Before:  │ Select...                        ▼  │  bg-gray-50
Hover:   │ Select...                        ▼  │  bg-gray-100 ✨
```

#### Option Hover
```
Before:  │ ☐ Option Name                       │  transparent
Hover:   │ ☐ Option Name                       │  bg-gray-50 ✨
```

#### Clear Button Hover
```
Before:  │ 3 selected                   ✕   ▼  │  text-gray-400
Hover:   │ 3 selected                   ✕   ▼  │  text-gray-600 ✨
```

---

### Focus States

#### Button Focus
```
┌─────────────────────────────────────┐
│ Select...                        ▼  │  ring-2 ring-blue-500 ✨
└─────────────────────────────────────┘
```

#### Search Input Focus
```
┌─────────────────────────────────────┐
│ 🔍 Search...▊                       │  ring-2 ring-blue-500 ✨
└─────────────────────────────────────┘
```

---

### Animation States

#### Chevron Rotation
```
Closed:  ▼   (rotate-0)
Open:    ▲   (rotate-180)  ← Smooth transition
```

#### Dropdown Fade In
```
Frame 1: [Hidden]
Frame 2: [Appearing - opacity 0.5]
Frame 3: [Visible - opacity 1.0]
```

---

## 🧩 Integration Examples

### Example 1: Compact Filter Bar

```
┌──────────────────────────────────────────────────────────────┐
│ Filters                                                      │
│ ┌────────┬────────┬────────┬────────┬────────┬────────┐     │
│ │Search  │Type ▼  │Status ▼│Code ▼  │Lang ▼  │Country▼│     │
│ └────────┴────────┴────────┴────────┴────────┴────────┘     │
│                              [🔄 Reload] [Apply] [Reset]     │
└──────────────────────────────────────────────────────────────┘
```

---

### Example 2: With Active Filters

```
┌──────────────────────────────────────────────────────────────┐
│ Filters                                            3 active   │
│ ┌────────┬────────┬────────┬────────┬────────┬────────┐     │
│ │Search  │3 sel✕  │2 sel✕  │Code ▼  │Lang ▼  │Country▼│     │
│ └────────┴────────┴────────┴────────┴────────┴────────┘     │
│                                                               │
│ Active: [Whitelist ✕] [Blacklist ✕] [Gibberish ✕]           │
│         [Active ✕] [Pending ✕]                               │
│                              [🔄 Reload] [Apply] [Reset]     │
└──────────────────────────────────────────────────────────────┘
```

**Features:**
- Selection count in button ("3 sel")
- Active filter tags below
- Each tag has clear button (✕)

---

### Example 3: Mobile Layout

```
┌────────────────────────────────┐
│ Filters               3 active │
├────────────────────────────────┤
│ [Search Answer...            ] │
├────────────────────────────────┤
│ [3 selected               ✕ ▼] │  ← Type
├────────────────────────────────┤
│ [2 selected               ✕ ▼] │  ← Status
├────────────────────────────────┤
│ [Select...                  ▼] │  ← Code
├────────────────────────────────┤
│ [Select...                  ▼] │  ← Language
├────────────────────────────────┤
│ [Select...                  ▼] │  ← Country
├────────────────────────────────┤
│                                │
│ [🔄 Reload]  [Apply]  [Reset]  │
└────────────────────────────────┘
```

---

## 🎨 Styling Reference

### Component Structure

```tsx
<div className="w-full">                    // Container
  <label>Type</label>                       // Label
  
  <button>                                  // Trigger button
    <span>3 selected</span>                 // Display text
    <X />                                   // Clear button
    <ChevronDown />                         // Chevron icon
  </button>
  
  {isOpen && (
    <div>                                   // Dropdown menu
      {searchable && (
        <div>                               // Search section
          <input />                         // Search input
        </div>
      )}
      
      <div>                                 // Bulk actions
        <button>Select All</button>
        <button>Unselect All</button>
      </div>
      
      <div>                                 // Options list
        {options.map(option => (
          <label>                           // Option row
            <input type="checkbox" />       // Checkbox
            <span>{option}</span>           // Option label
          </label>
        ))}
      </div>
      
      {selected.length > 0 && (
        <div>                               // Footer
          <span>2 of 5 selected</span>      // Count
        </div>
      )}
    </div>
  )}
</div>
```

---

### Key Tailwind Classes

```css
/* Button (closed state) */
.bg-gray-50 .dark:bg-neutral-800
.border .border-gray-200 .dark:border-neutral-700
.rounded-md
.px-3 .py-2
.hover:bg-gray-100 .dark:hover:bg-neutral-700

/* Dropdown Menu */
.absolute .z-50 .mt-1
.bg-white .dark:bg-neutral-900
.border .border-gray-200 .dark:border-neutral-700
.rounded-md .shadow-lg
.max-h-72 .overflow-hidden

/* Option (selected) */
.bg-blue-50 .dark:bg-blue-900/20
.text-blue-700 .dark:text-blue-300

/* Option (unselected, hover) */
.hover:bg-gray-50 .dark:hover:bg-neutral-800
.text-gray-700 .dark:text-gray-300
```

---

## 🎯 Accessibility

### Keyboard Navigation

```
Tab           → Move focus to dropdown button
Enter/Space   → Open/close dropdown
↓             → (Future) Navigate options
↑             → (Future) Navigate options
Esc           → Close dropdown
```

### ARIA Labels

```tsx
<button
  role="button"
  aria-haspopup="listbox"
  aria-expanded={isOpen}
  aria-label={`${label}: ${getDisplayText()}`}
>
  {/* ... */}
</button>

<div
  role="listbox"
  aria-label={`${label} options`}
>
  {/* Options */}
</div>
```

---

## 🎉 Summary

This visual guide covers:

✅ **10+ component states** – Empty, selected, open, search, disabled  
✅ **Light & dark mode** – Color variations  
✅ **3 responsive layouts** – Desktop, tablet, mobile  
✅ **Interactive states** – Hover, focus, animations  
✅ **Integration examples** – Real-world usage patterns  
✅ **Styling reference** – Tailwind classes  
✅ **Accessibility** – Keyboard nav, ARIA labels  

**Use this guide as a visual reference when integrating the component!** 🚀

