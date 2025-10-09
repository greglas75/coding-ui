-- ═══════════════════════════════════════════════════════════════
-- 🦷 Complete Toothpaste Demo Data Setup
-- ═══════════════════════════════════════════════════════════════
-- This master script sets up everything needed for Toothpaste demo:
-- 1. Creates Toothpaste category
-- 2. Adds toothpaste brand codes
-- 3. Links codes to category
-- 4. Inserts sample answers with translations
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Create Toothpaste Category
-- ═══════════════════════════════════════════════════════════════

INSERT INTO categories (name)
SELECT 'Toothpaste'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'Toothpaste'
);

-- Step 1: Category created

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Insert Toothpaste Brand Codes
-- ═══════════════════════════════════════════════════════════════

INSERT INTO codes (name)
SELECT code_name
FROM (VALUES
  ('Sensodyne'),
  ('Colgate'),
  ('Crest'),
  ('Oral-B'),
  ('Pepsodent'),
  ('Signal'),
  ('Close Up'),
  ('Aquafresh'),
  ('Parodontax'),
  ('Mediplua'),
  ('Himalaya'),
  ('Sparkle'),
  ('Medicam'),
  ('Prodate'),
  ('Synergy'),
  ('Karina'),
  ('Sasu Fresh'),
  ('Cool Gate'),
  ('Amosdine')
) AS new_codes(code_name)
WHERE NOT EXISTS (
  SELECT 1 FROM codes WHERE name = code_name
);

-- Step 2: Brand codes inserted

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Link Codes to Toothpaste Category
-- ═══════════════════════════════════════════════════════════════

INSERT INTO codes_categories (code_id, category_id)
SELECT 
  c.id,
  cat.id
FROM codes c
CROSS JOIN (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1) cat
WHERE c.name IN (
  'Sensodyne', 'Colgate', 'Crest', 'Oral-B', 'Pepsodent', 'Signal',
  'Close Up', 'Aquafresh', 'Parodontax', 'Mediplua', 'Himalaya',
  'Sparkle', 'Medicam', 'Prodate', 'Synergy', 'Karina', 'Sasu Fresh',
  'Cool Gate', 'Amosdine'
)
AND NOT EXISTS (
  SELECT 1 FROM codes_categories cc
  WHERE cc.code_id = c.id AND cc.category_id = cat.id
);

-- Step 3: Codes linked to category

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Insert Sample Answers with Translations
-- ═══════════════════════════════════════════════════════════════

WITH toothpaste_cat AS (
  SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1
)
INSERT INTO answers (
  answer_text,
  translation,
  translation_en,
  language,
  country,
  category_id,
  general_status,
  quick_status,
  created_at
)
SELECT 
  answer_text,
  translation,
  translation_en,
  language,
  country,
  (SELECT id FROM toothpaste_cat),
  general_status,
  quick_status,
  NOW() - (random() * interval '30 days')
FROM (VALUES
  -- English responses (answer_text, translation, translation_en, language, country, general_status, quick_status)
  ('sensodyne', 'sensodyne', 'sensodyne', 'en', 'USA', 'uncategorized', NULL),
  ('colgate', 'colgate', 'colgate', 'en', 'USA', 'uncategorized', NULL),
  ('crest', 'crest', 'crest', 'en', 'USA', 'uncategorized', NULL),
  ('close up', 'close up', 'close up', 'en', 'USA', 'uncategorized', NULL),
  ('oral', 'oral', 'oral', 'en', 'USA', 'uncategorized', NULL),
  ('pepsodent', 'pepsodent', 'pepsodent', 'en', 'USA', 'uncategorized', NULL),
  ('mediplua', 'mediplua', 'mediplua', 'en', 'USA', 'uncategorized', NULL),
  ('blank', 'blank', 'blank', 'en', 'USA', 'uncategorized', NULL),
  ('signal', 'signal', 'signal', 'en', 'USA', 'uncategorized', NULL),
  ('prodate', 'prodate', 'prodate', 'en', 'USA', 'uncategorized', NULL),
  ('medicam', 'medicam', 'medicam', 'en', 'USA', 'uncategorized', NULL),
  ('collegiate', 'collegiate', 'collegiate', 'en', 'USA', 'uncategorized', NULL),
  ('aquafresh', 'aquafresh', 'aquafresh', 'en', 'USA', 'uncategorized', NULL),
  ('sasu fresh', 'sasu fresh', 'sasu fresh', 'en', 'USA', 'uncategorized', NULL),
  ('sparkle', 'sparkle', 'sparkle', 'en', 'USA', 'uncategorized', NULL),
  ('sensodine', 'sensodine', 'sensodine', 'en', 'USA', 'uncategorized', NULL),
  ('cool gate', 'cool gate', 'cool gate', 'en', 'USA', 'uncategorized', NULL),
  ('semosdine', 'semosdine', 'semosdine', 'en', 'USA', 'uncategorized', NULL),
  ('m dactor', 'm dactor', 'm dactor', 'en', 'USA', 'uncategorized', NULL),
  ('toothpaste', 'toothpaste', 'toothpaste', 'en', 'USA', 'other', NULL),
  ('toothpack paste', 'toothpack paste', 'toothpack paste', 'en', 'USA', 'uncategorized', NULL),
  ('clinic paste', 'clinic paste', 'clinic paste', 'en', 'USA', 'uncategorized', NULL),
  ('branches', 'branches', 'branches', 'en', 'USA', 'gibberish', NULL),
  ('pharmacy', 'pharmacy', 'pharmacy', 'en', 'USA', 'other', NULL),
  ('closeup 2', 'closeup 2', 'closeup 2', 'en', 'USA', 'uncategorized', NULL),
  
  -- Arabic responses
  ('سنسوداين', 'sensodyne', 'sensodyne', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سيجنال', 'signal', 'signal', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كولجيت', 'colgate', 'colgate', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كريست', 'crest', 'crest', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('اورال بي', 'oral b', 'oral b', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('بارودونتكس', 'parodontax', 'parodontax', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كولقيت', 'colgate', 'colgate', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('ميديبلس', 'mediplua', 'mediplua', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('فرع', 'branch', 'branch', 'ar', 'Saudi Arabia', 'gibberish', NULL),
  ('صيدلية', 'pharmacy', 'pharmacy', 'ar', 'Saudi Arabia', 'other', NULL),
  ('تلميع الاسنان', 'teeth polishing', 'teeth polishing', 'ar', 'Saudi Arabia', 'other', NULL),
  ('تخفيف الم اللثة', 'chill the pain', 'chill the pain', 'ar', 'Saudi Arabia', 'other', NULL),
  ('مسواك', 'miswak', 'miswak', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('صديقتي', 'my girlfriend', 'my girlfriend', 'ar', 'Saudi Arabia', 'gibberish', NULL),
  ('تخفيف الالم', 'chill the pain', 'chill the pain', 'ar', 'Saudi Arabia', 'other', NULL),
  ('سيجنال تو', 'signal two', 'signal two', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('ليو', 'leo', 'leo', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('اكتر من واحد', 'more than one', 'more than one', 'ar', 'Saudi Arabia', 'gibberish', NULL),
  ('اكتر من سيجنال', 'more than signal', 'more than signal', 'ar', 'Saudi Arabia', 'gibberish', NULL),
  ('سوف يتم قتلها', 'he will be killed', 'he will be killed', 'ar', 'Saudi Arabia', 'gibberish', NULL),
  ('اكتر من', 'more than', 'more than', 'ar', 'Saudi Arabia', 'gibberish', NULL),
  ('برادونتكس', 'parodontax', 'parodontax', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سنسودين', 'sensodyne', 'sensodyne', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  
  -- Urdu responses
  ('ہمالیہ', 'himalaya', 'himalaya', 'ur', 'Pakistan', 'uncategorized', NULL),
  ('سگنل', 'signal', 'signal', 'ur', 'Pakistan', 'uncategorized', NULL),
  ('پیرادونٹیکس', 'parodontax', 'parodontax', 'ur', 'Pakistan', 'uncategorized', NULL),
  
  -- Vietnamese responses
  ('معجون اسنان', 'toothpaste', 'toothpaste', 'vi', 'Vietnam', 'other', NULL),
  ('معجون اسنان ps', 'toothpaste ps', 'toothpaste ps', 'vi', 'Vietnam', 'other', NULL),
  ('مجون سوزقي', 'paste', 'paste', 'vi', 'Vietnam', 'other', NULL),
  ('سنسوداین', 'sensodyne', 'sensodyne', 'vi', 'Vietnam', 'uncategorized', NULL),
  
  -- Polish responses  
  ('سنسوداين', 'sensodyne', 'sensodyne', 'pl', 'Poland', 'uncategorized', NULL),
  ('معجون اسنان', 'toothpaste', 'toothpaste', 'pl', 'Poland', 'other', NULL),
  ('لا اعرف', 'I don''t know', 'I don''t know', 'pl', 'Poland', 'ignored', NULL),
  ('لا اعلم', 'no year', 'no year', 'pl', 'Poland', 'ignored', NULL),
  
  -- Persian/Farsi responses
  ('سیگنال ۲', 'signal 2', 'signal 2', 'fa', 'Iran', 'uncategorized', NULL),
  ('كارينا', 'karina', 'karina', 'fa', 'Iran', 'uncategorized', NULL),
  ('فحم', 'charcoal', 'charcoal', 'fa', 'Iran', 'uncategorized', NULL),
  ('اكثر من واحد', 'older than you', 'older than you', 'fa', 'Iran', 'gibberish', NULL),
  ('كولغيت', 'colgate', 'colgate', 'fa', 'Iran', 'uncategorized', NULL),
  ('حصلت', 'he''ll get', 'he''ll get', 'fa', 'Iran', 'gibberish', NULL),
  
  -- Indonesian responses
  ('pepsodent', 'pepsodent', 'pepsodent', 'id', 'Indonesia', 'uncategorized', NULL),
  ('اورال بي', 'oral b', 'oral b', 'id', 'Indonesia', 'uncategorized', NULL),
  ('كرست', 'crest', 'crest', 'id', 'Indonesia', 'uncategorized', NULL),
  ('كريم', 'paste', 'paste', 'id', 'Indonesia', 'other', NULL),
  ('مدیکم', 'medicam', 'medicam', 'id', 'Indonesia', 'uncategorized', NULL),
  ('سنسوداین', 'sensodyne', 'sensodyne', 'id', 'Indonesia', 'uncategorized', NULL),
  ('معجون', 'paste', 'paste', 'id', 'Indonesia', 'other', NULL),
  ('اكسترا', 'extra', 'extra', 'id', 'Indonesia', 'other', NULL),
  ('اكثر من ماركة', 'more than brand', 'more than brand', 'id', 'Indonesia', 'gibberish', NULL)
  
) AS data(answer_text, translation, translation_en, language, country, general_status, quick_status);

-- Step 4: Sample answers inserted

-- ═══════════════════════════════════════════════════════════════
-- Verification & Summary
-- ═══════════════════════════════════════════════════════════════

COMMIT;

-- Summary counts
SELECT 
  'Toothpaste Category' as item,
  COUNT(*) as count
FROM categories
WHERE name = 'Toothpaste'
UNION ALL
SELECT 
  'Linked Codes',
  COUNT(*)
FROM codes_categories cc
JOIN categories cat ON cc.category_id = cat.id
WHERE cat.name = 'Toothpaste'
UNION ALL
SELECT 
  'Total Answers',
  COUNT(*)
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1);

-- Answers by language
SELECT 
  'Language: ' || language as breakdown,
  COUNT(*) as count
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1)
GROUP BY language
ORDER BY count DESC;

-- Answers by status
SELECT 
  'Status: ' || COALESCE(general_status, 'uncategorized') as breakdown,
  COUNT(*) as count
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1)
GROUP BY general_status
ORDER BY count DESC;

-- Sample answers (first 10)
SELECT 
  id,
  LEFT(answer_text, 30) as answer,
  LEFT(translation, 30) as translation,
  LEFT(translation_en, 30) as translation_en,
  language,
  general_status
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1)
ORDER BY id
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- ✅ Complete! Toothpaste demo data ready to use
-- ═══════════════════════════════════════════════════════════════
-- 
-- Next steps:
-- 1. Open the application
-- 2. Navigate to Categories page
-- 3. Select "Toothpaste" category
-- 4. Start coding answers!
-- ═══════════════════════════════════════════════════════════════
