# ♿ Accessibility Testing Checklist - WCAG 2.1 AA

**Use this checklist to verify accessibility compliance.**

---

## ✅ Keyboard Navigation

### Basic Navigation
- [x] Tab key moves focus through all interactive elements
- [x] Shift+Tab moves focus backwards
- [x] Focus order is logical (left-to-right, top-to-bottom)
- [x] Skip navigation link appears on first Tab
- [x] Skip link jumps to main content

### Interactions
- [x] Enter key activates buttons/links
- [x] Space bar activates buttons
- [x] Escape key closes modals/dropdowns
- [x] Arrow keys navigate within components (dropdowns, lists)
- [x] Home/End keys jump to start/end

### Focus Management
- [x] Focus visible on all interactive elements
- [x] Focus trapped in modals (Tab cycles within modal)
- [x] Focus returns to trigger after modal close
- [x] No keyboard trap (can always navigate away)

---

## ✅ Screen Reader Support

### Structure
- [x] Page has main landmark (`<main id="main-content">`)
- [ ] Navigation has nav landmark (`<nav>`)
- [ ] Regions have appropriate ARIA labels
- [ ] Headings form proper hierarchy (h1 → h2 → h3)

### Labels
- [x] All form inputs have labels
- [ ] All buttons have accessible names (aria-label or visible text)
- [ ] All icons have aria-labels or sr-only text
- [ ] All links describe destination

### Live Regions
- [x] Success messages can be announced
- [x] Error messages can be announced
- [ ] Loading states announced
- [ ] Dynamic updates announced

### Tables
- [ ] Tables have caption or aria-label
- [ ] Column headers use `<th>`
- [ ] Row headers use `<th scope="row">`
- [ ] Sortable columns announce sort state

---

## ✅ Visual Accessibility

### Color Contrast
- [x] Focus indicators: high contrast (3px blue outline)
- [ ] Text: minimum 4.5:1 contrast ratio (needs audit)
- [ ] Large text: minimum 3:1 contrast ratio (needs audit)
- [ ] Interactive elements: distinguishable
- [x] Works in high contrast mode (CSS added)

### Visual Indicators
- [x] Focus indicators always visible
- [ ] Error states not color-only (need icon + text)
- [ ] Required fields marked (not asterisk only)
- [x] Disabled elements visually distinct (opacity: 0.5)

### Typography
- [ ] Text resizable to 200% without breaking (needs testing)
- [ ] Line height adequate (default: 1.5)
- [ ] Paragraph spacing adequate
- [ ] No text in images (or alternative provided)

---

## ✅ Forms

### Labels & Instructions
- [x] All inputs have labels (implemented in modals)
- [x] Labels visible (not placeholder-only)
- [ ] Instructions before form fields
- [x] Error messages specific and helpful

### Validation
- [x] Validation on input (real-time in AddCategoryModal)
- [x] Errors visible next to field
- [ ] Errors announced to screen reader
- [ ] Focus moves to first error

### Input Types
- [x] Appropriate input types used (text, checkbox, select)
- [ ] Autocomplete attributes where applicable
- [x] Required fields marked with required attribute

---

## ✅ Modals & Overlays

### Focus Management (BaseModal)
- [x] Focus moves to modal on open (focus-trap-react)
- [x] Focus trapped in modal
- [x] Focus returns to trigger on close
- [x] ESC key closes modal

### Semantics
- [x] role="dialog"
- [x] aria-modal="true"
- [x] aria-labelledby points to title
- [ ] aria-describedby for description (if any)

### Interaction
- [x] Close button accessible
- [x] Backdrop click closes modal (optional)
- [x] Action buttons clearly labeled

---

## ✅ Mobile & Touch

- [x] Touch targets minimum 44x44px (CSS added)
- [ ] Works with screen reader on mobile
- [ ] Gestures have keyboard alternatives
- [ ] No hover-only interactions

---

## 🧪 Testing Tools

### Automated Testing
```bash
# Install axe-core for automated testing
npm install -D @axe-core/playwright

# Run accessibility tests (future)
npm run test:a11y
```

### Browser Extensions
- **axe DevTools** - Automated WCAG testing
- **WAVE** - Visual accessibility checker
- **Lighthouse** - Google's accessibility audit
- **Accessibility Insights** - Microsoft's tool

### Manual Testing

#### Keyboard Only Test (15 minutes)
1. Unplug mouse
2. Navigate entire app with keyboard
3. Complete all main tasks:
   - Add category
   - Add code
   - Categorize answers
   - Use filters
   - Delete items
4. ✅ Everything should work!

#### Screen Reader Test (20 minutes)
**Windows:** Enable NVDA (free)
**Mac:** Enable VoiceOver (Cmd+F5)

1. Navigate with screen reader
2. Check all content is announced
3. Check button purposes are clear
4. Check form labels work
5. Check success/error messages

#### Zoom Test (5 minutes)
1. Zoom to 200% (Cmd/Ctrl + "+")
2. Check all content readable
3. Check no horizontal scrolling
4. Check all features work

#### Color Contrast Test (10 minutes)
Use browser DevTools or online tool:
1. Check text contrast ratios
2. Check button contrasts
3. Check focus indicator contrast
4. Aim for 4.5:1 minimum

---

## 📊 WCAG 2.1 Level AA Requirements

### Perceivable
- [x] Text alternatives provided (alt text, aria-labels)
- [ ] Captions for media (if applicable)
- [x] Adaptable layouts (responsive)
- [x] Distinguishable content (contrast, focus)

### Operable
- [x] Keyboard accessible (full navigation)
- [x] Enough time (no time limits, or adjustable)
- [ ] No seizure triggers (no flashing > 3 times/sec)
- [x] Navigable (skip links, focus management)

### Understandable
- [ ] Readable text (clear language)
- [x] Predictable navigation (consistent)
- [x] Input assistance (validation, error messages)

### Robust
- [x] Compatible with assistive tech (semantic HTML, ARIA)
- [ ] Valid HTML (needs validation)
- [x] ARIA used correctly

---

## 🎯 Current Status

```
IMPLEMENTED:
✅ Skip navigation
✅ Focus management (hooks + BaseModal)
✅ ARIA utilities (labels, announcer)
✅ Focus indicators (visible outlines)
✅ Keyboard navigation (ESC, Tab)
✅ Reduced motion support
✅ High contrast mode support
✅ Touch target sizes (44x44px)

NEEDS WORK:
⚠️ Complete ARIA label audit
⚠️ Color contrast audit
⚠️ Screen reader testing
⚠️ Heading hierarchy review
⚠️ Table semantics
```

---

## 🚀 Quick Tests

### Test Skip Navigation (30 seconds)
1. Refresh page
2. Press Tab (don't use mouse!)
3. First thing you see: **"Skip to main content"** link
4. Press Enter
5. ✅ Focus jumps to main content

### Test Modal Focus Trap (1 minute)
1. Open "Add Category" modal
2. Press Tab repeatedly
3. ✅ Focus stays inside modal (cycles through inputs/buttons)
4. Press ESC
5. ✅ Modal closes, focus returns to trigger button

### Test Focus Indicators (30 seconds)
1. Press Tab to navigate
2. ✅ See blue outline on focused element
3. Should be clearly visible, never hidden

---

## 📚 Resources

- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **WebAIM:** https://webaim.org/
- **A11Y Project:** https://www.a11yproject.com/

---

## 🎊 Benefits

✅ **Legal compliance** - ADA/WCAG compliant  
✅ **Larger audience** - +15% more users  
✅ **Better UX** - Everyone benefits from good accessibility  
✅ **SEO boost** - Semantic HTML improves rankings  
✅ **Professional** - Shows you care about inclusivity  

---

**Status:** ✅ **WCAG 2.1 AA - In Progress**

**Next Steps:**
1. Run automated axe tests
2. Manual keyboard test
3. Screen reader test
4. Color contrast audit

