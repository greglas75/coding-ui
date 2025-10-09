-- ═══════════════════════════════════════════════════════════════
-- 📝 Insert Sample Toothpaste Answers with Translations
-- ═══════════════════════════════════════════════════════════════
-- This script adds sample answers from the Toothpaste category
-- Based on real data from the application screenshots
-- ═══════════════════════════════════════════════════════════════

-- First, ensure Toothpaste category exists
INSERT INTO categories (name)
SELECT 'Toothpaste'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'Toothpaste'
);

-- Get the category ID for reference
DO $$
DECLARE
  toothpaste_category_id INTEGER;
BEGIN
  SELECT id INTO toothpaste_category_id 
  FROM categories 
  WHERE name = 'Toothpaste' 
  LIMIT 1;
  
  RAISE NOTICE 'Toothpaste category ID: %', toothpaste_category_id;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- Insert sample answers with translations
-- ═══════════════════════════════════════════════════════════════

-- Get category ID for inserts
WITH toothpaste_cat AS (
  SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1
)

-- Insert answers
INSERT INTO answers (
  answer_text,
  translation,
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
  language,
  country,
  (SELECT id FROM toothpaste_cat),
  general_status,
  quick_status,
  NOW() - (random() * interval '30 days')  -- Random date within last 30 days
FROM (VALUES
  -- English responses
  ('sensodyne', 'sensodyne', 'en', 'USA', 'uncategorized', NULL),
  ('colgate', 'colgate', 'en', 'USA', 'uncategorized', NULL),
  ('crest', 'crest', 'en', 'USA', 'uncategorized', NULL),
  ('close up', 'close up', 'en', 'USA', 'uncategorized', NULL),
  ('oral', 'oral', 'en', 'USA', 'uncategorized', NULL),
  ('pepsodent', 'pepsodent', 'en', 'USA', 'uncategorized', NULL),
  ('mediplua', 'mediplua', 'en', 'USA', 'uncategorized', NULL),
  ('blank', 'blank', 'en', 'USA', 'uncategorized', NULL),
  ('signal', 'signal', 'en', 'USA', 'uncategorized', NULL),
  ('prodate', 'prodate', 'en', 'USA', 'uncategorized', NULL),
  ('medicam', 'medicam', 'en', 'USA', 'uncategorized', NULL),
  ('collegiate', 'collegiate', 'en', 'USA', 'uncategorized', NULL),
  ('aquafresh', 'aquafresh', 'en', 'USA', 'uncategorized', NULL),
  ('sasu fresh', 'sasu fresh', 'en', 'USA', 'uncategorized', NULL),
  ('sparkle', 'sparkle', 'en', 'USA', 'uncategorized', NULL),
  ('sensodine', 'sensodine', 'en', 'USA', 'uncategorized', NULL),
  ('cool gate', 'cool gate', 'en', 'USA', 'uncategorized', NULL),
  ('semosdine', 'semosdine', 'en', 'USA', 'uncategorized', NULL),
  ('secondary', 'secondary', 'en', 'USA', 'uncategorized', NULL),
  ('synergy', 'synergy', 'en', 'USA', 'uncategorized', NULL),
  ('amosdine', 'amosdine', 'en', 'USA', 'uncategorized', NULL),
  ('aloera', 'aloera', 'en', 'USA', 'uncategorized', NULL),
  
  -- Arabic responses with English translations
  ('سنسوداين', 'sensodyne', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سيجنال', 'signal', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كولجيت', 'colgate', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كريست', 'crest', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('اورال بي', 'oral b', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('بارودونتكس', 'parodontax', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سنسوداين', 'sensodyne', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('اورال بي', 'oral b', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كولجيت', 'colgate', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كريست', 'crest', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سيجنال', 'signal', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('صنسوداين', 'sensodyne', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كولقيت', 'colgate', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كريست', 'crest', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('ميديبلس', 'mediplua', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سيجنال', 'signal', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سنسوداين', 'sensodyne', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('اورال', 'oral', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('فرع', 'branch', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('صيدلية', 'pharmacy', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('تلميع الاسنان', 'teeth polishing', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('تخفيف الم اللثة', 'chill the pain', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('مسواك', 'miswak', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('صديقتي', 'my girlfriend', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('تخفيف الالم', 'chill the pain', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سيجنال تو', 'signal two', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كولجيت', 'colgate', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('كولقيت', 'colgate', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('ليو', 'leo', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سيجنال تو', 'signal two', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('اكتر من واحد', 'more than one', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('اكتر من سيجنال', 'more than signal', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سيجنال', 'signal', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سوف يتم قتلها', 'he will be killed', 'ar', 'Saudi Arabia', 'gibberish', NULL),
  ('اكتر من', 'more than', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('برادونتكس', 'parodontax', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سنسوداين', 'sensodyne', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  ('سنسودين', 'sensodyne', 'ar', 'Saudi Arabia', 'uncategorized', NULL),
  
  -- Urdu responses
  ('ہمالیہ', 'himalaya', 'ur', 'Pakistan', 'uncategorized', NULL),
  ('سگنل', 'signal', 'ur', 'Pakistan', 'uncategorized', NULL),
  ('پیرادونٹیکس', 'parodontax', 'ur', 'Pakistan', 'uncategorized', NULL),
  
  -- Vietnamese responses
  ('معجون اسنان', 'toothpaste', 'vi', 'Vietnam', 'uncategorized', NULL),
  ('معجون اسنان ps', 'toothpaste ps', 'vi', 'Vietnam', 'uncategorized', NULL),
  ('مجون سوزقي', 'paste', 'vi', 'Vietnam', 'uncategorized', NULL),
  ('سنسوداین', 'sensodyne', 'vi', 'Vietnam', 'uncategorized', NULL),
  
  -- Polish responses
  ('سنسوداين', 'sensodyne', 'pl', 'Poland', 'uncategorized', NULL),
  ('معجون اسنان', 'toothpaste', 'pl', 'Poland', 'uncategorized', NULL),
  ('لا اعرف', 'I don''t know', 'pl', 'Poland', 'uncategorized', NULL),
  ('لا اعلم', 'no year', 'pl', 'Poland', 'uncategorized', NULL),
  
  -- Persian/Farsi responses
  ('سیگنال ۲', 'signal 2', 'fa', 'Iran', 'uncategorized', NULL),
  ('سیگنال ۲', 'signal 2', 'fa', 'Iran', 'uncategorized', NULL),
  ('كارينا', 'karina', 'fa', 'Iran', 'uncategorized', NULL),
  ('فحم', 'charcoal', 'fa', 'Iran', 'uncategorized', NULL),
  ('اكثر من واحد', 'older than you', 'fa', 'Iran', 'uncategorized', NULL),
  ('كولغيت', 'colgate', 'fa', 'Iran', 'uncategorized', NULL),
  ('سيجنال', 'signal', 'fa', 'Iran', 'uncategorized', NULL),
  ('حصلت', 'he''ll get', 'fa', 'Iran', 'uncategorized', NULL),
  ('سیگنال ۲', 'signal 2', 'fa', 'Iran', 'uncategorized', NULL),
  ('سیگنال ۲', 'signal 2', 'fa', 'Iran', 'uncategorized', NULL),
  
  -- Indonesian responses
  ('pepsodent', 'pepsodent', 'id', 'Indonesia', 'uncategorized', NULL),
  ('اورال بي', 'oral b', 'id', 'Indonesia', 'uncategorized', NULL),
  ('كرست', 'crest', 'id', 'Indonesia', 'uncategorized', NULL),
  ('كريم', 'paste', 'id', 'Indonesia', 'uncategorized', NULL),
  ('اورال بي', 'oral b', 'id', 'Indonesia', 'uncategorized', NULL),
  ('مدیکم', 'medicam', 'id', 'Indonesia', 'uncategorized', NULL),
  ('سنسوداین', 'sensodyne', 'id', 'Indonesia', 'uncategorized', NULL),
  ('معجون', 'paste', 'id', 'Indonesia', 'uncategorized', NULL),
  ('اكسترا', 'extra', 'id', 'Indonesia', 'uncategorized', NULL),
  ('اكثر من ماركة', 'more than brand', 'id', 'Indonesia', 'uncategorized', NULL),
  
  -- Additional mixed language responses
  ('m dactor', 'm dactor', 'en', 'USA', 'uncategorized', NULL),
  ('toothpaste', 'toothpaste', 'en', 'USA', 'uncategorized', NULL),
  ('toothpack paste', 'toothpack paste', 'en', 'USA', 'uncategorized', NULL),
  ('clinic paste', 'clinic paste', 'en', 'USA', 'uncategorized', NULL),
  ('branches', 'branches', 'en', 'USA', 'gibberish', NULL),
  ('pharmacy', 'pharmacy', 'en', 'USA', 'other', NULL),
  ('closeup 2', 'closeup 2', 'en', 'USA', 'uncategorized', NULL),
  ('closeup 2', 'closeup 2', 'en', 'USA', 'uncategorized', NULL)
  
) AS data(answer_text, translation, language, country, general_status, quick_status);

-- ═══════════════════════════════════════════════════════════════
-- Verification
-- ═══════════════════════════════════════════════════════════════

-- Count inserted answers
SELECT 
  'Total Toothpaste Answers' as metric,
  COUNT(*) as count
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1);

-- Count by language
SELECT 
  language,
  COUNT(*) as count
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1)
GROUP BY language
ORDER BY count DESC;

-- Count by status
SELECT 
  COALESCE(general_status, 'uncategorized') as status,
  COUNT(*) as count
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1)
GROUP BY general_status
ORDER BY count DESC;

-- Sample of inserted data
SELECT 
  id,
  LEFT(answer_text, 30) as answer_text,
  LEFT(translation, 30) as translation,
  language,
  country,
  general_status
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1)
ORDER BY id DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- ✅ Complete! Sample toothpaste answers with translations added
-- ═══════════════════════════════════════════════════════════════

