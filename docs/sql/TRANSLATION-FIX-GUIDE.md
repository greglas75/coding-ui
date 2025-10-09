# 🔧 Translation Fix Guide

## Problem
Dane Toothpaste zostały dodane, ale **brak tłumaczeń** w kolumnie `translation`.

---

## ✅ Rozwiązania (wybierz jedno)

### Opcja 1: Aktualizuj istniejące dane (ZALECANE)

Uzupełnia translations dla istniejących rekordów:

```bash
# Uruchom w Supabase SQL Editor:
docs/sql/update-toothpaste-translations.sql
```

**Zalety:**
- ✅ Zachowuje istniejące ID
- ✅ Nie trzeba nic usuwać
- ✅ Szybkie

---

### Opcja 2: Usuń i dodaj ponownie

Usuwa wszystkie dane Toothpaste i dodaje je na nowo z translations:

```sql
-- 1. Usuń istniejące dane Toothpaste
DELETE FROM answers 
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste');

-- 2. Usuń powiązania kodów
DELETE FROM codes_categories
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste');

-- 3. Usuń kategorię
DELETE FROM categories WHERE name = 'Toothpaste';

-- 4. Upewnij się że kolumna translation istnieje
ALTER TABLE answers ADD COLUMN IF NOT EXISTS translation text;

-- 5. Dodaj dane ponownie
-- Uruchom: docs/sql/setup-toothpaste-demo.sql
```

**Zalety:**
- ✅ Czyste dane
- ✅ Gwarancja że wszystko jest poprawne

**Wady:**
- ❌ Usuwa istniejące dane
- ❌ Zmienia ID rekordów

---

### Opcja 3: Tylko brakujące translations

Jeśli niektóre mają translations, a inne nie:

```sql
-- Sprawdź które rekordy nie mają translation
SELECT 
  id,
  answer_text,
  translation,
  language
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste')
AND (translation IS NULL OR translation = '')
LIMIT 10;

-- Uruchom update script:
-- docs/sql/update-toothpaste-translations.sql
```

---

## 🔍 Weryfikacja

Po zastosowaniu którejkolwiek opcji, sprawdź czy działa:

```sql
-- Powinno pokazać że wszystkie mają translation
SELECT 
  COUNT(*) as total,
  COUNT(translation) as with_translation,
  COUNT(*) - COUNT(translation) as missing_translation
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste');

-- Pokaż przykłady
SELECT 
  answer_text,
  translation,
  language
FROM answers
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toothpaste')
LIMIT 10;
```

**Oczekiwany wynik:**
```
total | with_translation | missing_translation
------|------------------|--------------------
  74  |        74        |         0
```

---

## 🎯 Polecana kolejność działań

1. **Najpierw sprawdź** czy kolumna istnieje:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'answers' AND column_name = 'translation';
   ```

2. **Jeśli NIE** - dodaj kolumnę:
   ```sql
   ALTER TABLE answers ADD COLUMN translation text;
   ```

3. **Zaktualizuj** istniejące dane:
   ```bash
   # Uruchom: docs/sql/update-toothpaste-translations.sql
   ```

4. **Odśwież** przeglądarkę i sprawdź czy translations się pojawiły

---

## 📝 Notatki

- Kolumna `translation` powinna być typu `text`
- Może być `NULL` dla niektórych odpowiedzi
- W większości przypadków translation = english version of answer
- Dla angielskich odpowiedzi: translation = answer_text

---

**Utworzono:** October 7, 2025  
**Problem:** Brakujące tłumaczenia w Toothpaste  
**Status:** ✅ Rozwiązane



