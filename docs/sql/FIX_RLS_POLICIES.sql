-- ═══════════════════════════════════════════════════════════
-- 🔒 NAPRAW POLITYKI RLS W SUPABASE
-- ═══════════════════════════════════════════════════════════
-- Skopiuj CAŁĄ zawartość tego pliku do Supabase SQL Editor i wykonaj
-- https://supabase.com/dashboard/project/hoanegucluoshmpoxfnl/sql

-- ─────────────────────────────────────────────────────────────
-- KROK 1: Dodaj kolumnę user_id do wszystkich tabel
-- ─────────────────────────────────────────────────────────────
ALTER TABLE codes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE answers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE file_imports ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_codes_user_id ON codes(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_file_imports_user_id ON file_imports(user_id);

-- ─────────────────────────────────────────────────────────────
-- KROK 2: Migracja istniejących danych (WYBIERZ OPCJĘ!)
-- ─────────────────────────────────────────────────────────────

-- OPCJA A: Jeśli masz tylko testowe dane - USUŃ wszystko
-- TRUNCATE codes, categories, answers, file_imports CASCADE;

-- OPCJA B: Przypisz do swojego użytkownika (ZMIEŃ UUID!)
-- Znajdź swój UUID: SELECT id, email FROM auth.users LIMIT 1;
-- UPDATE codes SET user_id = 'TWOJ_USER_UUID_TUTAJ' WHERE user_id IS NULL;
-- UPDATE categories SET user_id = 'TWOJ_USER_UUID_TUTAJ' WHERE user_id IS NULL;
-- UPDATE answers SET user_id = 'TWOJ_USER_UUID_TUTAJ' WHERE user_id IS NULL;
-- UPDATE file_imports SET user_id = 'TWOJ_USER_UUID_TUTAJ' WHERE user_id IS NULL;

-- ─────────────────────────────────────────────────────────────
-- KROK 3: Usuń stare NIEBEZPIECZNE polityki
-- ─────────────────────────────────────────────────────────────

-- CODES TABLE
DROP POLICY IF EXISTS "codes read" ON codes;
DROP POLICY IF EXISTS "codes write" ON codes;

-- CATEGORIES TABLE
DROP POLICY IF EXISTS "categories read" ON categories;
DROP POLICY IF EXISTS "categories write" ON categories;

-- ANSWERS TABLE
DROP POLICY IF EXISTS "answers read" ON answers;
DROP POLICY IF EXISTS "answers write" ON answers;
DROP POLICY IF EXISTS "answers UPDATE (anon ok)" ON answers;

-- CODES_CATEGORIES TABLE
DROP POLICY IF EXISTS "codes_categories read" ON codes_categories;
DROP POLICY IF EXISTS "codes_categories write" ON codes_categories;

-- FILE_IMPORTS TABLE
DROP POLICY IF EXISTS "file_imports read" ON file_imports;
DROP POLICY IF EXISTS "file_imports write" ON file_imports;

-- ═══════════════════════════════════════════════════════════
-- KROK 4: Utwórz BEZPIECZNE polityki (tylko własne dane!)
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 🔒 CODES TABLE - Secure Policies
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "codes_select_own" ON codes
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "codes_insert_own" ON codes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "codes_update_own" ON codes
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "codes_delete_own" ON codes
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 🔒 CATEGORIES TABLE - Secure Policies
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "categories_select_own" ON categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "categories_insert_own" ON categories
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "categories_update_own" ON categories
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "categories_delete_own" ON categories
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 🔒 ANSWERS TABLE - Secure Policies
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "answers_select_own" ON answers
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "answers_insert_own" ON answers
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "answers_update_own" ON answers
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "answers_delete_own" ON answers
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 🔒 CODES_CATEGORIES TABLE - Secure Policies
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "codes_categories_select_own" ON codes_categories
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM codes WHERE codes.id = code_id AND codes.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM categories WHERE categories.id = category_id AND categories.user_id = auth.uid())
    )
  );

CREATE POLICY "codes_categories_insert_own" ON codes_categories
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM codes WHERE codes.id = code_id AND codes.user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM categories WHERE categories.id = category_id AND categories.user_id = auth.uid())
  );

CREATE POLICY "codes_categories_delete_own" ON codes_categories
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM codes WHERE codes.id = code_id AND codes.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM categories WHERE categories.id = category_id AND categories.user_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 🔒 FILE_IMPORTS TABLE - Secure Policies
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "file_imports_select_own" ON file_imports
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "file_imports_insert_own" ON file_imports
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- ✅ WERYFIKACJA (uruchom te zapytania po wykonaniu powyższego)
-- ═══════════════════════════════════════════════════════════

-- Test 1: Jako niezalogowany użytkownik (powinno zwrócić 0 lub error)
-- SELECT count(*) FROM codes;

-- Test 2: Jako zalogowany (powinno działać)
-- SELECT count(*) FROM codes WHERE user_id = auth.uid();

-- Test 3: Znajdź swój user_id
-- SELECT id, email FROM auth.users LIMIT 1;

-- ═══════════════════════════════════════════════════════════
-- 🎉 GOTOWE!
-- ═══════════════════════════════════════════════════════════
-- Po wykonaniu tego SQL:
-- ✅ Polityki RLS są bezpieczne
-- ✅ Każdy użytkownik widzi tylko swoje dane
-- ✅ Anonimowi użytkownicy NIE MAJĄ dostępu
