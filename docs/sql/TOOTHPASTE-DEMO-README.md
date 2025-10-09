# 🦷 Toothpaste Demo Data

## Overview
Sample data for testing the Toothpaste category with **real multilingual answers** and translations.

---

## 📊 What's Included

### Category
- **Toothpaste** - Oral care products category

### Codes (21 brands)
- Sensodyne, Colgate, Crest, Oral-B
- Pepsodent, Signal, Close Up, Aquafresh
- Parodontax, Mediplua, Himalaya, Sparkle
- Medicam, Prodate, Synergy, Karina
- Sasu Fresh, Sensodine, Cool Gate
- Semosdine, Amosdine

### Answers (~60+ responses)
**Languages:**
- 🇺🇸 English (USA)
- 🇸🇦 Arabic (Saudi Arabia)
- 🇵🇰 Urdu (Pakistan)
- 🇻🇳 Vietnamese (Vietnam)
- 🇵🇱 Polish (Poland)
- 🇮🇷 Persian/Farsi (Iran)
- 🇮🇩 Indonesian (Indonesia)

**Status Distribution:**
- Uncategorized (majority)
- Gibberish (nonsense responses)
- Other (generic terms like "toothpaste", "pharmacy")
- Ignored ("I don't know" responses)

---

## 🚀 Quick Setup

### ⚠️ IMPORTANT: First Time Setup

**Before running demo data**, ensure `translation` column exists:

```bash
# 1. Open Supabase Dashboard → SQL Editor
# 2. Run FIRST: docs/sql/add-translation-column.sql
# 3. This adds the missing 'translation' column to answers table
```

### Option 1: All-in-One (Recommended)
Run the master setup script:

```bash
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy content from: docs/sql/setup-toothpaste-demo.sql
# 3. Paste and Run
# 4. Done! ✅
```

**What it does:**
1. Creates Toothpaste category
2. Adds 21 brand codes
3. Links codes to category
4. Inserts 60+ sample answers with translations
5. Shows summary statistics

---

### Option 2: Step-by-Step

If you prefer to run scripts separately:

#### Step 1: Add Codes
```sql
-- Run: docs/sql/insert-toothpaste-codes.sql
-- Creates brands and links to category
```

#### Step 2: Add Answers
```sql
-- Run: docs/sql/insert-toothpaste-samples.sql
-- Inserts answers with translations
```

---

## 📋 Verification

After running the setup, verify with:

```sql
-- Check category
SELECT * FROM categories WHERE name = 'Toothpaste';

-- Count codes
SELECT COUNT(*) FROM codes_categories cc
JOIN categories cat ON cc.category_id = cat.id
WHERE cat.name = 'Toothpaste';

-- Count answers by language
SELECT language, COUNT(*) as count
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste')
GROUP BY language;

-- Count answers by status
SELECT COALESCE(general_status, 'uncategorized') as status, COUNT(*)
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste')
GROUP BY general_status;
```

**Expected Results:**
- ✅ 1 category: Toothpaste
- ✅ 21 codes linked
- ✅ 60+ answers in 7 languages
- ✅ Mix of statuses (uncategorized, gibberish, other, ignored)

---

## 🎯 Usage

### In the Application

1. **Navigate** to Categories page
2. **Select** "Toothpaste" category
3. **View** answers in the Coding interface
4. **Test** filtering by:
   - Status (use new status dropdown!)
   - Language
   - Country
   - Search terms

### Sample Workflows

#### Test Status Filter
```
1. Select "Toothpaste" category
2. Use "Filter by Status" dropdown
3. Select "Uncategorized" → See ~45+ responses
4. Select "Gibberish" → See nonsense answers
5. Select "Other" → See generic terms
```

#### Test Multilingual Support
```
1. Filter by Language: Arabic
2. See Arabic text with English translations
3. Try coding these answers to brands
4. Verify translation quality
```

#### Test Coding Workflow
```
1. Select an uncategorized answer
2. Click "Click to select code..."
3. Choose appropriate brand (e.g., "Sensodyne")
4. Assign code
5. Verify status changes
```

---

## 📊 Data Examples

### English Answers
```
sensodyne → sensodyne
colgate → colgate
crest → crest
aquafresh → aquafresh
pepsodent → pepsodent
```

### Arabic Answers
```
سنسوداين → sensodyne
كولجيت → colgate
سيجنال → signal
اورال بي → oral b
```

### Status Examples
```
uncategorized: sensodyne, colgate, signal
gibberish: branches, my girlfriend, he will be killed
other: toothpaste, pharmacy, teeth polishing
ignored: I don't know, no year
```

---

## 🗑️ Cleanup

To remove all Toothpaste demo data:

```sql
-- Delete Toothpaste answers
DELETE FROM answers 
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste');

-- Unlink codes (optional)
DELETE FROM codes_categories
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste');

-- Delete category (optional)
DELETE FROM categories WHERE name = 'Toothpaste';

-- Delete codes (optional - only if not used elsewhere)
DELETE FROM codes WHERE name IN (
  'Sensodyne', 'Colgate', 'Crest', 'Oral-B', 'Pepsodent',
  'Signal', 'Close Up', 'Aquafresh', 'Parodontax', 'Mediplua'
);
```

Or use the cleanup scripts in the repo:
- `clean-test-data.sql` - Remove everything
- `clean-selective-test-data.sql` - Remove test data only

---

## 🎓 Educational Value

This demo data is perfect for:

✅ **Testing multilingual support**
- Arabic, Urdu, Persian, Vietnamese, Polish

✅ **Testing status workflow**
- Uncategorized → Categorized
- Marking as gibberish
- Handling "other" responses

✅ **Testing translation accuracy**
- See how translation field works
- Verify translation quality

✅ **Testing filter functionality**
- New status dropdown with counts
- Language/country filters
- Search functionality

✅ **UI/UX testing**
- Responsive design
- Dark mode
- Table performance with real data

---

## 🔧 Customization

### Add More Answers

```sql
WITH toothpaste_cat AS (
  SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1
)
INSERT INTO answers (answer_text, translation, language, country, category_id, general_status)
VALUES 
  ('your_answer', 'translation', 'en', 'USA', (SELECT id FROM toothpaste_cat), 'uncategorized');
```

### Add More Brands

```sql
-- Add code
INSERT INTO codes (name) VALUES ('New Brand');

-- Link to Toothpaste
INSERT INTO codes_categories (code_id, category_id)
SELECT 
  (SELECT id FROM codes WHERE name = 'New Brand'),
  (SELECT id FROM categories WHERE name = 'Toothpaste');
```

---

## 📝 Notes

- All answers have random creation dates (last 30 days)
- Translations are based on actual screenshot data
- Some misspellings included intentionally (e.g., "sensodine")
- Status assignments reflect realistic categorization scenarios
- Safe to run multiple times (uses ON CONFLICT DO NOTHING)

---

## 🆘 Troubleshooting

**Error: "duplicate key value"**
→ Already exists, safe to ignore or use ON CONFLICT

**Error: "foreign key violation"**
→ Ensure categories table exists first

**No data showing in UI**
→ Check category ID matches, verify frontend filters

**Translations not showing**
→ Ensure translation column is populated

---

**Created:** October 7, 2025  
**Version:** 1.0  
**Category:** Toothpaste  
**Languages:** 7  
**Brands:** 21  
**Answers:** 60+

