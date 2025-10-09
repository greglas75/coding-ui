-- ═══════════════════════════════════════════════════════════════
-- 📝 Insert Toothpaste Brand Codes
-- ═══════════════════════════════════════════════════════════════
-- This script adds common toothpaste brand codes
-- And links them to the Toothpaste category
-- ═══════════════════════════════════════════════════════════════

-- Ensure Toothpaste category exists
INSERT INTO categories (name)
VALUES ('Toothpaste')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- Insert toothpaste brand codes
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
  ('Sensodine'),  -- Common misspelling
  ('Cool Gate'),
  ('Semosdine'),   -- Common misspelling
  ('Amosdine')     -- Common misspelling
) AS new_codes(code_name)
WHERE NOT EXISTS (
  SELECT 1 FROM codes WHERE name = code_name
);

-- ═══════════════════════════════════════════════════════════════
-- Link codes to Toothpaste category
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
  'Sensodine', 'Cool Gate', 'Semosdine', 'Amosdine'
)
AND NOT EXISTS (
  SELECT 1 FROM codes_categories cc
  WHERE cc.code_id = c.id AND cc.category_id = cat.id
);

-- ═══════════════════════════════════════════════════════════════
-- Verification
-- ═══════════════════════════════════════════════════════════════

-- Count codes in Toothpaste category
SELECT 
  'Total Toothpaste Codes' as metric,
  COUNT(*) as count
FROM codes_categories cc
JOIN categories cat ON cc.category_id = cat.id
WHERE cat.name = 'Toothpaste';

-- List all codes for Toothpaste category
SELECT 
  c.id,
  c.name as code_name,
  cat.name as category_name
FROM codes c
JOIN codes_categories cc ON c.id = cc.code_id
JOIN categories cat ON cc.category_id = cat.id
WHERE cat.name = 'Toothpaste'
ORDER BY c.name;

-- ═══════════════════════════════════════════════════════════════
-- ✅ Complete! Toothpaste brand codes added and linked
-- ═══════════════════════════════════════════════════════════════

