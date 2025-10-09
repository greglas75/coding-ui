-- ═══════════════════════════════════════════════════════════════
-- 🔧 Update Toothpaste Translations
-- ═══════════════════════════════════════════════════════════════
-- This script updates existing Toothpaste answers with translations
-- Run this if you inserted data BEFORE adding translation column
-- NOTE: Updates BOTH translation and translation_en (UI shows translation_en)
-- ═══════════════════════════════════════════════════════════════

-- Update translations based on answer_text patterns
UPDATE answers
SET 
  translation = CASE
  -- English answers (keep as-is)
  WHEN answer_text = 'sensodyne' THEN 'sensodyne'
  WHEN answer_text = 'colgate' THEN 'colgate'
  WHEN answer_text = 'crest' THEN 'crest'
  WHEN answer_text = 'close up' THEN 'close up'
  WHEN answer_text = 'oral' THEN 'oral'
  WHEN answer_text = 'pepsodent' THEN 'pepsodent'
  WHEN answer_text = 'mediplua' THEN 'mediplua'
  WHEN answer_text = 'blank' THEN 'blank'
  WHEN answer_text = 'signal' THEN 'signal'
  WHEN answer_text = 'prodate' THEN 'prodate'
  WHEN answer_text = 'medicam' THEN 'medicam'
  WHEN answer_text = 'aquafresh' THEN 'aquafresh'
  WHEN answer_text = 'sparkle' THEN 'sparkle'
  WHEN answer_text = 'toothpaste' THEN 'toothpaste'
  WHEN answer_text = 'pharmacy' THEN 'pharmacy'
  WHEN answer_text = 'branches' THEN 'branches'
  
  -- Arabic translations
  WHEN answer_text = 'سنسوداين' THEN 'sensodyne'
  WHEN answer_text = 'سنسودين' THEN 'sensodyne'
  WHEN answer_text = 'سيجنال' THEN 'signal'
  WHEN answer_text = 'كولجيت' THEN 'colgate'
  WHEN answer_text = 'كولقيت' THEN 'colgate'
  WHEN answer_text = 'كريست' THEN 'crest'
  WHEN answer_text = 'اورال بي' THEN 'oral b'
  WHEN answer_text = 'بارودونتكس' THEN 'parodontax'
  WHEN answer_text = 'برادونتكس' THEN 'parodontax'
  WHEN answer_text = 'ميديبلس' THEN 'mediplua'
  WHEN answer_text = 'صيدلية' THEN 'pharmacy'
  WHEN answer_text = 'فرع' THEN 'branch'
  WHEN answer_text = 'مسواك' THEN 'miswak'
  WHEN answer_text = 'سيجنال تو' THEN 'signal two'
  WHEN answer_text = 'ليو' THEN 'leo'
  WHEN answer_text = 'تلميع الاسنان' THEN 'teeth polishing'
  WHEN answer_text = 'تخفيف الم اللثة' THEN 'chill the pain'
  WHEN answer_text = 'تخفيف الالم' THEN 'chill the pain'
  WHEN answer_text = 'صديقتي' THEN 'my girlfriend'
  WHEN answer_text = 'اكتر من واحد' THEN 'more than one'
  WHEN answer_text = 'اكتر من سيجنال' THEN 'more than signal'
  WHEN answer_text = 'اكتر من' THEN 'more than'
  WHEN answer_text = 'سوف يتم قتلها' THEN 'he will be killed'
  
  -- Urdu translations
  WHEN answer_text = 'ہمالیہ' THEN 'himalaya'
  WHEN answer_text = 'سگنل' THEN 'signal'
  WHEN answer_text = 'پیرادونٹیکس' THEN 'parodontax'
  
  -- Vietnamese/other
  WHEN answer_text = 'معجون اسنان' THEN 'toothpaste'
  WHEN answer_text = 'معجون اسنان ps' THEN 'toothpaste ps'
  WHEN answer_text = 'مجون سوزقي' THEN 'paste'
  WHEN answer_text = 'سنسوداین' THEN 'sensodyne'
  
  -- Persian/Farsi
  WHEN answer_text = 'سیگنال ۲' THEN 'signal 2'
  WHEN answer_text = 'كارينا' THEN 'karina'
  WHEN answer_text = 'فحم' THEN 'charcoal'
  WHEN answer_text = 'كولغيت' THEN 'colgate'
  WHEN answer_text = 'حصلت' THEN 'he''ll get'
  WHEN answer_text = 'اكثر من واحد' THEN 'older than you'
  
  -- Indonesian
  WHEN answer_text = 'كرست' THEN 'crest'
  WHEN answer_text = 'كريم' THEN 'paste'
  WHEN answer_text = 'مدیکم' THEN 'medicam'
  WHEN answer_text = 'معجون' THEN 'paste'
  WHEN answer_text = 'اكسترا' THEN 'extra'
  WHEN answer_text = 'اكثر من ماركة' THEN 'more than brand'
  
  -- Polish
  WHEN answer_text = 'لا اعرف' THEN 'I don''t know'
  WHEN answer_text = 'لا اعلم' THEN 'no year'
  
  -- Default: use answer_text as translation for unmatched
  ELSE answer_text
END,
  translation_en = CASE
  -- English answers (keep as-is)
  WHEN answer_text = 'sensodyne' THEN 'sensodyne'
  WHEN answer_text = 'colgate' THEN 'colgate'
  WHEN answer_text = 'crest' THEN 'crest'
  WHEN answer_text = 'close up' THEN 'close up'
  WHEN answer_text = 'oral' THEN 'oral'
  WHEN answer_text = 'pepsodent' THEN 'pepsodent'
  WHEN answer_text = 'mediplua' THEN 'mediplua'
  WHEN answer_text = 'blank' THEN 'blank'
  WHEN answer_text = 'signal' THEN 'signal'
  WHEN answer_text = 'prodate' THEN 'prodate'
  WHEN answer_text = 'medicam' THEN 'medicam'
  WHEN answer_text = 'aquafresh' THEN 'aquafresh'
  WHEN answer_text = 'sparkle' THEN 'sparkle'
  WHEN answer_text = 'toothpaste' THEN 'toothpaste'
  WHEN answer_text = 'pharmacy' THEN 'pharmacy'
  WHEN answer_text = 'branches' THEN 'branches'
  
  -- Arabic translations
  WHEN answer_text = 'سنسوداين' THEN 'sensodyne'
  WHEN answer_text = 'سنسودين' THEN 'sensodyne'
  WHEN answer_text = 'سيجنال' THEN 'signal'
  WHEN answer_text = 'كولجيت' THEN 'colgate'
  WHEN answer_text = 'كولقيت' THEN 'colgate'
  WHEN answer_text = 'كريست' THEN 'crest'
  WHEN answer_text = 'اورال بي' THEN 'oral b'
  WHEN answer_text = 'بارودونتكس' THEN 'parodontax'
  WHEN answer_text = 'برادونتكس' THEN 'parodontax'
  WHEN answer_text = 'ميديبلس' THEN 'mediplua'
  WHEN answer_text = 'صيدلية' THEN 'pharmacy'
  WHEN answer_text = 'فرع' THEN 'branch'
  WHEN answer_text = 'مسواك' THEN 'miswak'
  WHEN answer_text = 'سيجنال تو' THEN 'signal two'
  WHEN answer_text = 'ليو' THEN 'leo'
  WHEN answer_text = 'تلميع الاسنان' THEN 'teeth polishing'
  WHEN answer_text = 'تخفيف الم اللثة' THEN 'chill the pain'
  WHEN answer_text = 'تخفيف الالم' THEN 'chill the pain'
  WHEN answer_text = 'صديقتي' THEN 'my girlfriend'
  WHEN answer_text = 'اكتر من واحد' THEN 'more than one'
  WHEN answer_text = 'اكتر من سيجنال' THEN 'more than signal'
  WHEN answer_text = 'اكتر من' THEN 'more than'
  WHEN answer_text = 'سوف يتم قتلها' THEN 'he will be killed'
  
  -- Urdu translations
  WHEN answer_text = 'ہمالیہ' THEN 'himalaya'
  WHEN answer_text = 'سگنل' THEN 'signal'
  WHEN answer_text = 'پیرادونٹیکس' THEN 'parodontax'
  
  -- Vietnamese/other
  WHEN answer_text = 'معجون اسنان' THEN 'toothpaste'
  WHEN answer_text = 'معجون اسنان ps' THEN 'toothpaste ps'
  WHEN answer_text = 'مجون سوزقي' THEN 'paste'
  WHEN answer_text = 'سنسوداین' THEN 'sensodyne'
  
  -- Persian/Farsi
  WHEN answer_text = 'سیگنال ۲' THEN 'signal 2'
  WHEN answer_text = 'كارينا' THEN 'karina'
  WHEN answer_text = 'فحم' THEN 'charcoal'
  WHEN answer_text = 'كولغيت' THEN 'colgate'
  WHEN answer_text = 'حصلت' THEN 'he''ll get'
  WHEN answer_text = 'اكثر من واحد' THEN 'older than you'
  
  -- Indonesian
  WHEN answer_text = 'كرست' THEN 'crest'
  WHEN answer_text = 'كريم' THEN 'paste'
  WHEN answer_text = 'مدیکم' THEN 'medicam'
  WHEN answer_text = 'معجون' THEN 'paste'
  WHEN answer_text = 'اكسترا' THEN 'extra'
  WHEN answer_text = 'اكثر من ماركة' THEN 'more than brand'
  
  -- Polish
  WHEN answer_text = 'لا اعرف' THEN 'I don''t know'
  WHEN answer_text = 'لا اعلم' THEN 'no year'
  
  -- Default: use answer_text as translation for unmatched
  ELSE answer_text
END
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1)
AND (translation IS NULL OR translation = '' OR translation_en IS NULL OR translation_en = '');

-- Verify translations were added
SELECT 
  COUNT(*) as total_answers,
  COUNT(translation) as with_translation,
  COUNT(translation_en) as with_translation_en,
  COUNT(*) - COUNT(translation_en) as without_translation
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1);

-- Show sample translations
SELECT 
  id,
  LEFT(answer_text, 30) as answer,
  LEFT(translation, 30) as translation,
  LEFT(translation_en, 30) as translation_en,
  language,
  country
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste' LIMIT 1)
ORDER BY id
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- ✅ Complete! Translations updated for existing Toothpaste data
-- ═══════════════════════════════════════════════════════════════

