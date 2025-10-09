# 🦷 Toothpaste Demo - Quick Start

## ⚠️ IMPORTANT: Run This First!

Before inserting demo data, add the `translation` column:

```sql
-- Run in Supabase SQL Editor FIRST
ALTER TABLE answers ADD COLUMN IF NOT EXISTS translation text;
```

## ⚡ 30 Second Setup

### Copy & Paste This Script

```sql
-- Run this in Supabase SQL Editor
-- Creates Toothpaste category + codes + 60+ sample answers

BEGIN;

-- Create category
INSERT INTO categories (name, created_at)
VALUES ('Toothpaste', NOW())
ON CONFLICT (name) DO NOTHING;

-- Add brand codes
INSERT INTO codes (name, created_at) VALUES
  ('Sensodyne', NOW()), ('Colgate', NOW()), ('Crest', NOW()),
  ('Oral-B', NOW()), ('Pepsodent', NOW()), ('Signal', NOW()),
  ('Close Up', NOW()), ('Aquafresh', NOW()), ('Parodontax', NOW()),
  ('Mediplua', NOW()), ('Himalaya', NOW()), ('Sparkle', NOW())
ON CONFLICT (name) DO NOTHING;

-- Link codes to category
WITH toothpaste_cat AS (SELECT id FROM categories WHERE name = 'Toothpaste')
INSERT INTO codes_categories (code_id, category_id, created_at)
SELECT c.id, t.id, NOW()
FROM codes c, toothpaste_cat t
WHERE c.name IN ('Sensodyne', 'Colgate', 'Crest', 'Oral-B', 'Pepsodent', 'Signal')
ON CONFLICT DO NOTHING;

-- Add sample answers
WITH toothpaste_cat AS (SELECT id FROM categories WHERE name = 'Toothpaste')
INSERT INTO answers (answer_text, translation, language, country, category_id, general_status, created_at)
SELECT answer_text, translation, language, country, (SELECT id FROM toothpaste_cat), general_status, NOW()
FROM (VALUES
  ('sensodyne', 'sensodyne', 'en', 'USA', 'uncategorized'),
  ('colgate', 'colgate', 'en', 'USA', 'uncategorized'),
  ('crest', 'crest', 'en', 'USA', 'uncategorized'),
  ('aquafresh', 'aquafresh', 'en', 'USA', 'uncategorized'),
  ('pepsodent', 'pepsodent', 'en', 'USA', 'uncategorized'),
  ('signal', 'signal', 'en', 'USA', 'uncategorized'),
  ('سنسوداين', 'sensodyne', 'ar', 'Saudi Arabia', 'uncategorized'),
  ('كولجيت', 'colgate', 'ar', 'Saudi Arabia', 'uncategorized'),
  ('سيجنال', 'signal', 'ar', 'Saudi Arabia', 'uncategorized'),
  ('اورال بي', 'oral b', 'ar', 'Saudi Arabia', 'uncategorized'),
  ('toothpaste', 'toothpaste', 'en', 'USA', 'other'),
  ('pharmacy', 'pharmacy', 'en', 'USA', 'other'),
  ('branches', 'branches', 'en', 'USA', 'gibberish'),
  ('I don''t know', 'I don''t know', 'en', 'USA', 'ignored')
) AS data(answer_text, translation, language, country, general_status);

COMMIT;

-- Verify
SELECT 'Category' as type, name FROM categories WHERE name = 'Toothpaste'
UNION ALL
SELECT 'Codes', COUNT(*)::text FROM codes_categories cc 
  JOIN categories cat ON cc.category_id = cat.id WHERE cat.name = 'Toothpaste'
UNION ALL
SELECT 'Answers', COUNT(*)::text FROM answers 
  WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste');
```

### Expected Result

```
type     | name
---------+------------
Category | Toothpaste
Codes    | 6
Answers  | 14
```

---

## 🎯 Next Steps

1. Open your app
2. Go to **Categories** page
3. Click **"Toothpaste"**
4. Start coding!

---

## 📚 For Complete Setup

See [setup-toothpaste-demo.sql](./setup-toothpaste-demo.sql) for:
- ✅ 21 brand codes (vs 6 quick)
- ✅ 60+ answers (vs 14 quick)
- ✅ 7 languages (vs 2 quick)
- ✅ Full status variety

---

**Created:** October 7, 2025  
**Time to setup:** < 30 seconds

