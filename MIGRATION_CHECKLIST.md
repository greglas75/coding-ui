# ✅ Checklist Migracji Supabase (Free → Paid Tier)

## 📋 Informacje Podstawowe

**Aplikacja:** TGM Research - Coding & AI Categorization Dashboard
**Typ:** Enterprise SaaS do kategoryzacji danych badawczych z AI
**Baza danych:** PostgreSQL (Supabase)
**Główne tabele:** 6 (answers, categories, codes, codes_categories, answer_codes, file_imports)
**Skala danych:** 10,000+ wierszy w tabeli `answers`
**Użytkownicy:** 1-5 (obecnie), 10-100+ (docelowo)

---

## 🎯 Przed Migracją

### Przygotowanie Starej Bazy (Free Tier)

- [ ] **Sprawdź liczbę wierszy w każdej tabeli:**
  ```sql
  SELECT
    'answers' as table_name, COUNT(*) as row_count FROM answers
  UNION ALL
  SELECT 'categories', COUNT(*) FROM categories
  UNION ALL
  SELECT 'codes', COUNT(*) FROM codes
  UNION ALL
  SELECT 'codes_categories', COUNT(*) FROM codes_categories
  UNION ALL
  SELECT 'answer_codes', COUNT(*) FROM answer_codes
  UNION ALL
  SELECT 'file_imports', COUNT(*) FROM file_imports;
  ```

- [ ] **Utwórz backup wszystkich tabel:**
  ```sql
  -- W Supabase SQL Editor:
  CREATE TABLE answers_backup_20251013 AS SELECT * FROM answers;
  CREATE TABLE categories_backup_20251013 AS SELECT * FROM categories;
  CREATE TABLE codes_backup_20251013 AS SELECT * FROM codes;
  CREATE TABLE codes_categories_backup_20251013 AS SELECT * FROM codes_categories;
  CREATE TABLE answer_codes_backup_20251013 AS SELECT * FROM answer_codes;
  CREATE TABLE file_imports_backup_20251013 AS SELECT * FROM file_imports;
  ```

- [ ] **Export danych do CSV:**
  - Supabase Dashboard → Table Editor → każda tabela → Export CSV
  - Zapisz w folderze: `/backups/migration-2025-10-13/`

- [ ] **Export całej bazy (opcjonalnie - jeśli masz dostęp do psql):**
  ```bash
  pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup_full.sql
  ```

- [ ] **Zapisz obecne credentials:**
  ```
  OLD_SUPABASE_URL=
  OLD_SUPABASE_ANON_KEY=
  ```

---

## 🆕 Nowy Projekt Supabase (Paid Tier)

### Utworzenie Projektu

- [ ] **Zaloguj się do Supabase Dashboard:** https://supabase.com
- [ ] **Utwórz nowy projekt:**
  - Kliknij "New project"
  - Wybierz tier: **Pro** lub **Team**
  - Region: **US East (Ohio)** lub najbliższy
  - Database Password: **Zapisz bezpiecznie!**
  - Nazwa projektu: `tgm-research-production`

- [ ] **Poczekaj na setup projektu (~2-3 minuty)**

- [ ] **Zapisz nowe credentials:**
  - Go to: Project Settings → API
  - Skopiuj:
    ```
    NEW_SUPABASE_URL=https://xxxxx.supabase.co
    NEW_SUPABASE_ANON_KEY=eyJhbGc...
    ```

---

## 🗄️ Migracja Schematu

### Uruchomienie SQL

- [ ] **Otwórz SQL Editor w nowym projekcie:**
  - Dashboard → SQL Editor → New Query

- [ ] **Uruchom pełny schemat:**
  - Skopiuj zawartość: `/Users/greglas/coding-ui/COMPLETE_SCHEMA_FOR_MIGRATION.sql`
  - Wklej do SQL Editor
  - Kliknij **"RUN"**
  - Sprawdź że nie ma błędów (wszystkie powinny być `✅`)

- [ ] **Weryfikacja schematu:**
  ```sql
  -- Sprawdź czy wszystkie tabele zostały utworzone
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;

  -- Oczekiwany output:
  -- answer_codes
  -- answers
  -- categories
  -- codes
  -- codes_categories
  -- file_imports
  ```

- [ ] **Sprawdź indeksy:**
  ```sql
  SELECT tablename, indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename;
  ```

- [ ] **Sprawdź funkcje:**
  ```sql
  SELECT routine_name
  FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

  -- Oczekiwane funkcje:
  -- assign_whitelisted_code
  -- get_high_confidence_suggestions
  -- get_ai_suggestion_accuracy
  -- get_top_ai_suggested_codes
  -- get_import_stats
  -- get_recent_imports
  ```

---

## 📦 Import Danych

### Metoda 1: CSV Import (Zalecane dla <10k wierszy)

- [ ] **Import tabeli `categories`:**
  - Dashboard → Table Editor → `categories`
  - Import → Choose CSV file
  - Map columns → Import

- [ ] **Import tabeli `codes`:**
  - Powtórz proces dla `codes`

- [ ] **Import tabeli `codes_categories`:**
  - Powtórz proces dla `codes_categories`

- [ ] **Import tabeli `answers` (GŁÓWNA TABELA):**
  - ⚠️ Może być duża (10k+ wierszy)
  - Jeśli > 10k, podziel na mniejsze pliki lub użyj Metody 2

- [ ] **Import pozostałych tabel:**
  - `answer_codes`
  - `file_imports`

### Metoda 2: SQL COPY (Dla >10k wierszy)

- [ ] **Przygotuj pliki CSV:**
  ```bash
  # Umieść pliki w dostępnej lokalizacji
  /backups/migration-2025-10-13/answers.csv
  /backups/migration-2025-10-13/categories.csv
  # etc.
  ```

- [ ] **Użyj psql (jeśli masz dostęp):**
  ```bash
  psql "postgresql://postgres:[PASSWORD]@[NEW_HOST]:5432/postgres"

  \COPY categories FROM '/path/to/categories.csv' WITH CSV HEADER;
  \COPY codes FROM '/path/to/codes.csv' WITH CSV HEADER;
  \COPY codes_categories FROM '/path/to/codes_categories.csv' WITH CSV HEADER;
  \COPY answers FROM '/path/to/answers.csv' WITH CSV HEADER;
  \COPY answer_codes FROM '/path/to/answer_codes.csv' WITH CSV HEADER;
  \COPY file_imports FROM '/path/to/file_imports.csv' WITH CSV HEADER;
  ```

### Weryfikacja Importu

- [ ] **Sprawdź liczby wierszy (powinna się zgadzać ze starą bazą):**
  ```sql
  SELECT
    'answers' as table_name, COUNT(*) as row_count FROM answers
  UNION ALL
  SELECT 'categories', COUNT(*) FROM categories
  UNION ALL
  SELECT 'codes', COUNT(*) FROM codes
  UNION ALL
  SELECT 'codes_categories', COUNT(*) FROM codes_categories
  UNION ALL
  SELECT 'answer_codes', COUNT(*) FROM answer_codes
  UNION ALL
  SELECT 'file_imports', COUNT(*) FROM file_imports;
  ```

- [ ] **Sprawdź przykładowe dane:**
  ```sql
  SELECT * FROM categories LIMIT 5;
  SELECT * FROM codes LIMIT 5;
  SELECT * FROM answers LIMIT 5;
  ```

- [ ] **Sprawdź relacje Foreign Key:**
  ```sql
  -- Sprawdź czy wszystkie category_id w answers są poprawne
  SELECT COUNT(*) FROM answers
  WHERE category_id IS NOT NULL
    AND category_id NOT IN (SELECT id FROM categories);
  -- Powinno zwrócić 0

  -- Sprawdź codes_categories
  SELECT COUNT(*) FROM codes_categories cc
  WHERE cc.code_id NOT IN (SELECT id FROM codes)
     OR cc.category_id NOT IN (SELECT id FROM categories);
  -- Powinno zwrócić 0
  ```

---

## 🔧 Konfiguracja Aplikacji

### Lokalne Środowisko

- [ ] **Zaktualizuj plik `.env`:**
  ```env
  # Stare (zakomentuj):
  # VITE_SUPABASE_URL=https://old-project.supabase.co
  # VITE_SUPABASE_ANON_KEY=old_key_here

  # Nowe:
  VITE_SUPABASE_URL=https://new-project.supabase.co
  VITE_SUPABASE_ANON_KEY=new_key_here

  # Pozostałe (bez zmian):
  VITE_API_URL=http://localhost:3001
  OPENAI_API_KEY=your_openai_api_key
  ```

- [ ] **Restart serwera dev:**
  ```bash
  # Zatrzymaj obecny serwer (Ctrl+C)
  npm run dev
  ```

- [ ] **Sprawdź konsolę przeglądarki:**
  - Otwórz: http://localhost:5173
  - Otwórz DevTools (F12)
  - Sprawdź Console - nie powinno być błędów Supabase
  - Powinno być: `✅ Supabase client initialized once (singleton)`

### Testowanie Aplikacji

- [ ] **Test 1: Pobieranie danych (Categories):**
  - Przejdź do: http://localhost:5173/
  - Sprawdź czy kategorie się wczytują
  - Sprawdź czy liczby się zgadzają

- [ ] **Test 2: Dodawanie kategorii:**
  - Kliknij "Add Category"
  - Wpisz nazwę: "Test Category Migration"
  - Zapisz
  - Sprawdź czy pojawia się na liście

- [ ] **Test 3: Codes:**
  - Przejdź do: Codes page
  - Sprawdź czy kody się wczytują
  - Dodaj nowy kod: "Test Code Migration"

- [ ] **Test 4: Answers (File Data Coding):**
  - Przejdź do: File Data Coding
  - Sprawdź czy odpowiedzi się wczytują
  - Test filtrowania
  - Test wirtualnego scrollowania (scroll w dół)

- [ ] **Test 5: AI Suggestions (jeśli masz OpenAI API key):**
  - Wybierz kategorię
  - Kliknij "Get AI Suggestions" (lub podobny przycisk)
  - Sprawdź czy sugestie się pojawiają

- [ ] **Test 6: Import pliku:**
  - Przygotuj testowy plik CSV (5-10 wierszy)
  - Import przez UI
  - Sprawdź czy import się udał
  - Sprawdź tabelę `file_imports`

- [ ] **Test 7: Realtime updates (opcjonalnie):**
  - Otwórz aplikację w dwóch kartach
  - Zmień coś w jednej karcie
  - Sprawdź czy aktualizuje się w drugiej

### Testy E2E (opcjonalnie)

- [ ] **Uruchom testy Playwright:**
  ```bash
  npm run test:e2e
  ```
  - Sprawdź czy wszystkie przechodzą
  - Jeśli są błędy związane z danymi, może trzeba dostosować test data

---

## 🚀 Deployment do Production

### Vercel (zalecane)

- [ ] **Zaloguj się do Vercel:** https://vercel.com

- [ ] **Znajdź projekt (coding-ui):**
  - Dashboard → Your Project

- [ ] **Zaktualizuj Environment Variables:**
  - Settings → Environment Variables
  - Edytuj `VITE_SUPABASE_URL`:
    - New value: `https://new-project.supabase.co`
  - Edytuj `VITE_SUPABASE_ANON_KEY`:
    - New value: `new_anon_key_here`
  - Save

- [ ] **Redeploy:**
  - Deployments → Latest Deployment → ⋯ → Redeploy
  - LUB:
  ```bash
  git add .
  git commit -m "chore: update Supabase credentials for production"
  git push origin main
  ```

- [ ] **Poczekaj na deployment (~2-3 minuty)**

- [ ] **Sprawdź production URL:**
  - Otwórz: https://your-app.vercel.app
  - Test wszystkich funkcji (jak w sekcji "Testowanie Aplikacji")

### Netlify (alternatywa)

- [ ] **Zaloguj się do Netlify:** https://netlify.com
- [ ] **Projekt → Site Settings → Environment Variables**
- [ ] **Zaktualizuj zmienne jak w Vercel**
- [ ] **Redeploy:**
  ```bash
  netlify deploy --prod
  ```

---

## ✅ Weryfikacja Końcowa

### Checklist Końcowy

- [ ] **Wszystkie tabele zmigrowane (6 tabel)**
- [ ] **Wszystkie dane zaimportowane (porównaj COUNT(*))**
- [ ] **Wszystkie funkcje działają**
- [ ] **Aplikacja działa lokalnie**
- [ ] **Aplikacja wdrożona na production**
- [ ] **Testy E2E przechodzą**
- [ ] **Brak błędów w Console (browser DevTools)**
- [ ] **Realtime updates działają (jeśli włączone)**
- [ ] **AI suggestions działają (jeśli masz OpenAI key)**

### Monitoring

- [ ] **Sprawdź Supabase Dashboard:**
  - Database → Connection pooler (powinien być aktywny)
  - API → Usage (sprawdź czy są requesty)
  - Logs → Explorer (sprawdź czy nie ma błędów)

- [ ] **Sprawdź performance:**
  - Queries powinny być <100ms dla małych tabel
  - Queries <500ms dla tabeli `answers` (10k rows)
  - Virtual scrolling powinien działać płynnie (60fps)

- [ ] **Sprawdź backup schedule:**
  - Database → Backups
  - Upewnij się że automatyczne backupy są włączone (Pro/Team tier)

---

## 🗑️ Cleanup (Po Pomyślnej Migracji)

### Po 7 dniach testów produkcyjnych:

- [ ] **Usuń stary projekt Supabase (Free tier):**
  - ⚠️ **UWAGA:** To jest nieodwracalne!
  - ⚠️ **Upewnij się że nowy projekt działa 100% poprawnie!**
  - Dashboard → Project Settings → General → Delete project

- [ ] **Usuń lokalne backupy (opcjonalnie):**
  - Zachowaj co najmniej 1 pełny backup przez 90 dni

- [ ] **Zaktualizuj dokumentację:**
  - Zapisz nowe credentials w secure vault (1Password, LastPass, etc.)
  - Zaktualizuj README.md z nowymi instrukcjami

---

## 🆘 Troubleshooting

### Problem: "Cannot connect to Supabase"

**Rozwiązanie:**
1. Sprawdź czy zmienne w `.env` są poprawne
2. Sprawdź czy nowy projekt Supabase nie jest paused
3. Restart dev server: `Ctrl+C` → `npm run dev`
4. Clear browser cache

### Problem: "Data nie są widoczne"

**Rozwiązanie:**
1. Sprawdź czy import się powiódł:
   ```sql
   SELECT COUNT(*) FROM answers;
   ```
2. Sprawdź RLS policies (czy są włączone i poprawne)
3. Sprawdź console w przeglądarce (F12)

### Problem: "Testy E2E fail"

**Rozwiązanie:**
1. Sprawdź czy dane testowe są w bazie
2. Może trzeba utworzyć test fixtures:
   ```sql
   INSERT INTO categories (name) VALUES ('Test Category');
   ```

### Problem: "Slow queries"

**Rozwiązanie:**
1. Sprawdź czy indeksy zostały utworzone:
   ```sql
   SELECT * FROM pg_indexes WHERE schemaname = 'public';
   ```
2. Analyze tables:
   ```sql
   ANALYZE answers;
   ANALYZE categories;
   ANALYZE codes;
   ```

---

## 📞 Wsparcie

**W razie problemów:**
- 📧 Email: support@tgmresearch.com
- 📖 Dokumentacja: `/docs/` folder
- 🐛 GitHub Issues: https://github.com/your-org/coding-ui/issues
- 💬 Supabase Support: https://supabase.com/dashboard/support

---

## ✅ Migracja Zakończona!

Gratulacje! 🎉 Aplikacja działa na nowym projekcie Supabase (Paid tier).

**Następne kroki:**
- ⚠️ Zaostrzenie polityk RLS (auth-based access)
- ✅ Monitoring wydajności
- ✅ Setup alertów (Sentry, Supabase alerts)
- ✅ Regularne backupy
- ✅ Dokumentacja dla zespołu

**Zapisz ten checklist jako dokumentację procesu migracji!**


