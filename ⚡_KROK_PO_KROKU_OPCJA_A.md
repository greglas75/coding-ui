# ⚡ Migracja z Prefiksem coui_ - Krok Po Kroku (Opcja A)

## 🎯 Przewodnik dla Początkujących

Ten dokument to **kompletny przewodnik** - rób dokładnie to co napisane, w tej kolejności.

**Czas:** ~45 minut (z testowaniem)

---

## 📋 KROK 0: Przygotowanie (5 minut)

### 0.1 Sprawdź Obecną Bazę

1. **Otwórz Supabase Dashboard** (starą instancję): https://supabase.com
2. **Zaloguj się**
3. **Wybierz projekt** (ten który migrujesz)
4. **Idź do:** Project Settings → Database
5. **Skopiuj i zapisz** (będziesz potrzebować do backupu):
   ```
   Host: db.xxxxx.supabase.co
   Password: [kliknij "Reset database password" jeśli nie pamiętasz]
   ```

### 0.2 Sprawdź Czy Masz Dane

1. W Supabase Dashboard → **Table Editor**
2. Sprawdź tabele:
   - `answers` - ile wierszy?
   - `categories` - ile wierszy?
   - `codes` - ile wierszy?

**Zapisz liczby** - będziesz porównywać po migracji!

---

## 📋 KROK 1: BACKUP (10 minut) ⚠️ NIE PRZESKAKUJ!

### 1.1 Znajdź Credentials (2 min)

Masz już z Kroku 0.1:
- Host: `db.xxxxx.supabase.co`
- Password: `twoje_haslo`

### 1.2 Skonfiguruj Skrypt Backup (2 min)

Otwórz plik w edytorze:
```bash
nano backup-supabase.sh
```

**Znajdź linie (na początku pliku):**
```bash
DB_PASSWORD="your_password_here"
DB_HOST="db.abc123xyz456.supabase.co"
```

**Zmień na swoje dane:**
```bash
DB_PASSWORD="twoje_haslo_z_kroku_0.1"
DB_HOST="db.xxxxx.supabase.co"  # twój host z kroku 0.1
```

**Zapisz:**
- `Ctrl+O` (zapisz)
- `Enter` (potwierdź)
- `Ctrl+X` (wyjdź)

### 1.3 Uruchom Backup (5 min)

```bash
./backup-supabase.sh
```

**Poczekaj...**

**Jeśli pojawi się błąd:**
- `pg_dump: command not found` → Zainstaluj: `brew install postgresql`
- `password authentication failed` → Sprawdź hasło z kroku 0.1
- Inne błędy → Zobacz: `BACKUP_INSTRUKCJE.md`

**Jeśli sukces, zobaczysz:**
```
✅ Backup Complete! 🎉
📁 backups/2025-10-13/coding_ui_backup_20251013_xxxxx.sql.gz
📊 Size: X.X MB
```

### 1.4 Zweryfikuj Backup (1 min)

```bash
# Sprawdź czy plik istnieje
ls -lh backups/$(date +%Y-%m-%d)/

# Sprawdź czy zawiera tabele
gunzip -c backups/$(date +%Y-%m-%d)/coding_ui_backup_*.sql.gz | grep "CREATE TABLE" | head -20
```

**Powinno pokazać:**
```
CREATE TABLE public.answers (
CREATE TABLE public.categories (
CREATE TABLE public.codes (
...
```

✅ **Jeśli widzisz tabele - backup OK! Przejdź dalej.**

---

## 📋 KROK 2: Nowy Projekt Supabase (5 minut)

### 2.1 Utwórz Nowy Projekt

1. **Otwórz w nowej karcie:** https://supabase.com
2. **Kliknij:** "New project"
3. **Wybierz:**
   - Organization: (twoja organizacja)
   - Name: `coding-ui-production` (lub inna nazwa)
   - Database Password: **Wymyśl NOWE hasło i ZAPISZ!**
   - Region: **US East (Ohio)** lub najbliższy
   - Pricing plan: **Pro** (lub Team)
4. **Kliknij:** "Create new project"
5. **Poczekaj** ~2-3 minuty (setup projektu)

### 2.2 Zapisz Nowe Credentials

**Kiedy projekt gotowy:**

1. **Idź do:** Project Settings → API
2. **Skopiuj i zapisz** (będziesz ich potrzebować!):
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**Zapisz w notatniku jako:**
```
NOWA INSTANCJA SUPABASE:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📋 KROK 3: Uruchom Schema z Prefiksem (5 minut)

### 3.1 Otwórz SQL Editor

W **nowym projekcie** Supabase:
1. **Kliknij:** SQL Editor (ikona po lewej)
2. **Kliknij:** "+ New query"

### 3.2 Skopiuj Schema

**W tym terminalu/folderze:**
```bash
# Otwórz plik w domyślnym edytorze
open COMPLETE_SCHEMA_WITH_PREFIX.sql

# LUB wyświetl w terminalu (długie!)
cat COMPLETE_SCHEMA_WITH_PREFIX.sql
```

**Zaznacz CAŁĄ zawartość pliku** (Cmd+A lub Ctrl+A)

**Skopiuj** (Cmd+C lub Ctrl+C)

### 3.3 Uruchom SQL

**W Supabase SQL Editor:**
1. **Wklej** skopiowany SQL (Cmd+V lub Ctrl+V)
2. **Kliknij:** "RUN" (zielony przycisk)
3. **Poczekaj** ~10-20 sekund

**Powinno się pojawić:**
```
Success. No rows returned
```

### 3.4 Zweryfikuj Tabele

**W tym samym SQL Editor, wklej i uruchom:**
```sql
-- Sprawdź czy tabele z prefiksem coui_ zostały utworzone
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'coui_%'
ORDER BY table_name;
```

**Powinno pokazać 6 tabel:**
```
coui_answer_codes
coui_answers
coui_categories
coui_codes
coui_codes_categories
coui_file_imports
```

✅ **Jeśli widzisz 6 tabel - schema OK! Przejdź dalej.**

---

## 📋 KROK 4: Import Danych (10 minut)

### Opcja 4A: Export/Import CSV (Prostsze, 10 min)

#### 4A.1 Export ze Starej Bazy

**W STAREJ instancji Supabase:**

1. **Idź do:** Table Editor
2. **Dla każdej tabeli** (answers, categories, codes, codes_categories, answer_codes, file_imports):
   - Kliknij na nazwę tabeli
   - Kliknij **"..."** (menu)
   - Kliknij **"Export to CSV"**
   - Zapisz jako `nazwa_tabeli.csv` w folderze `backups/csv/`

#### 4A.2 Import do Nowej Bazy

**W NOWEJ instancji Supabase:**

1. **Idź do:** Table Editor
2. **Import `categories.csv`:**
   - Kliknij tabelę **`coui_categories`**
   - Kliknij **"Insert"** → **"Import data from CSV"**
   - Wybierz plik `categories.csv`
   - **Mapping kolumn:**
     - `id` → `id`
     - `name` → `name`
     - `use_web_context` → `use_web_context`
     - `created_at` → `created_at`
     - `updated_at` → `updated_at`
   - Kliknij **"Import"**

3. **Powtórz dla każdej tabeli:**
   - `codes.csv` → `coui_codes`
   - `codes_categories.csv` → `coui_codes_categories`
   - `answers.csv` → `coui_answers` (może trwać dłużej jeśli duża!)
   - `answer_codes.csv` → `coui_answer_codes`
   - `file_imports.csv` → `coui_file_imports`

**⚠️ UWAGA:** Import w tej kolejności (bo FOREIGN KEYs)!

#### 4A.3 Zweryfikuj Import

**W Supabase SQL Editor (nowa instancja):**
```sql
-- Sprawdź liczby wierszy
SELECT 'coui_answers' as table_name, COUNT(*) as row_count FROM coui_answers
UNION ALL
SELECT 'coui_categories', COUNT(*) FROM coui_categories
UNION ALL
SELECT 'coui_codes', COUNT(*) FROM coui_codes
UNION ALL
SELECT 'coui_codes_categories', COUNT(*) FROM coui_codes_categories
UNION ALL
SELECT 'coui_answer_codes', COUNT(*) FROM coui_answer_codes
UNION ALL
SELECT 'coui_file_imports', COUNT(*) FROM coui_file_imports;
```

**Porównaj liczby z Krokiem 0.2** - powinny się zgadzać!

✅ **Jeśli liczby OK - import zakończony! Przejdź dalej.**

---

## 📋 KROK 5: Zaktualizuj Kod Aplikacji (5 minut)

### 5.1 Sprawdź Git Status

```bash
# Jeśli masz uncommitted changes, commituj je:
git status
git add .
git commit -m "before table rename to coui_ prefix"
```

### 5.2 Uruchom Skrypt Automatycznej Zmiany

```bash
./update-table-names-to-coui.sh
```

**Poczekaj...**

**Skrypt zapyta:** `Do you want to proceed? (y/n)`
**Wpisz:** `y` i Enter

**Skrypt pokaże:**
- Ile plików zostało zmienionych
- Ile wystąpień zamieniono
- Verification (czy wszystkie stare nazwy zamienione)

**Jeśli widzisz:**
```
✅ All table names successfully updated!
```

✅ **Zaktualizowanie kodu OK! Przejdź dalej.**

### 5.3 Sprawdź Zmiany

```bash
# Zobacz co zostało zmienione
git diff

# Powinno pokazać zmiany typu:
# - .from('answers')
# + .from('coui_answers')
```

---

## 📋 KROK 6: Zaktualizuj .env (2 minuty)

### 6.1 Otwórz Plik .env

```bash
nano .env
```

### 6.2 Zmień Credentials

**Znajdź linie:**
```env
VITE_SUPABASE_URL=https://old-project.supabase.co
VITE_SUPABASE_ANON_KEY=old_key_here
```

**Zamień na nowe** (z Kroku 2.2):
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Zapisz:**
- `Ctrl+O` → Enter → `Ctrl+X`

---

## 📋 KROK 7: Test Lokalny (5 minut)

### 7.1 TypeScript Check

```bash
npm run type-check
```

**Powinno pokazać:** (nic = OK!)

✅ **Jeśli brak błędów - OK! Przejdź dalej.**

**Jeśli są błędy:**
- Sprawdź czy wszystkie nazwy tabel zamienione
- Zobacz: `MIGRACJA_Z_PREFIKSEM_COUI.md` → Troubleshooting

### 7.2 Uruchom Dev Server

```bash
npm run dev
```

**Poczekaj na:**
```
  ➜  Local:   http://localhost:5173/
```

### 7.3 Otwórz w Przeglądarce

```bash
# macOS:
open http://localhost:5173

# Linux:
xdg-open http://localhost:5173

# Windows:
start http://localhost:5173
```

### 7.4 Test Manualny (WAŻNE!)

**W przeglądarce sprawdź:**

1. **Otwórz Console** (F12 → Console)
   - Sprawdź czy NIE MA błędów Supabase
   - Powinno być: `✅ Supabase client initialized once (singleton)`

2. **Test Kategorii:**
   - [ ] Lista kategorii się wczytuje
   - [ ] Kliknij "Add Category"
   - [ ] Wpisz: "Test Category Migration"
   - [ ] Kliknij "Save"
   - [ ] Sprawdź czy pojawia się na liście

3. **Test Kodów:**
   - [ ] Idź do: Codes page (menu)
   - [ ] Lista kodów się wczytuje
   - [ ] Kliknij "Add Code"
   - [ ] Wpisz: "Test Code"
   - [ ] Wybierz kategorię
   - [ ] Kliknij "Save"

4. **Test Odpowiedzi:**
   - [ ] Idź do: File Data Coding
   - [ ] Lista odpowiedzi się wczytuje
   - [ ] Filtrowanie działa
   - [ ] Scroll w dół (wirtualny scroll)

5. **Test Importu:**
   - [ ] Przygotuj mały plik CSV (5 wierszy)
   - [ ] Kliknij "Import"
   - [ ] Wybierz plik
   - [ ] Sprawdź czy import się udał

✅ **Jeśli wszystkie testy przeszły - aplikacja działa! Przejdź dalej.**

**Jeśli są problemy:**
- Zobacz Console (F12) - jakie błędy?
- Sprawdź Network tab (F12 → Network) - jakie requesty failują?
- Zobacz: `MIGRACJA_Z_PREFIKSEM_COUI.md` → Troubleshooting

---

## 📋 KROK 8: Commit Zmian (2 minuty)

```bash
# Sprawdź zmiany
git status

# Dodaj wszystkie zmiany
git add .

# Commituj
git commit -m "feat: migrate database to new Supabase instance with coui_ prefix

- Updated all table names to use coui_ prefix
- Migrated database schema to new Supabase instance
- Updated .env with new credentials
- All tests passing"

# Push do repo
git push origin main
```

---

## 📋 KROK 9: Deploy Production (5 minut)

### Opcja A: Vercel

1. **Otwórz:** https://vercel.com/dashboard
2. **Znajdź projekt:** coding-ui
3. **Idź do:** Settings → Environment Variables
4. **Edytuj zmienne:**
   - `VITE_SUPABASE_URL` → Nowa wartość (z kroku 2.2)
   - `VITE_SUPABASE_ANON_KEY` → Nowa wartość (z kroku 2.2)
5. **Kliknij:** Save
6. **Idź do:** Deployments
7. **Kliknij:** Latest Deployment → **"..."** → **Redeploy**
8. **Poczekaj** ~2-3 minuty

### Opcja B: Netlify

1. **Otwórz:** https://app.netlify.com
2. **Znajdź site:** coding-ui
3. **Idź do:** Site settings → Environment variables
4. **Edytuj zmienne:**
   - `VITE_SUPABASE_URL` → Nowa wartość
   - `VITE_SUPABASE_ANON_KEY` → Nowa wartość
5. **Save**
6. **Idź do:** Deploys → **Trigger deploy**

### 9.1 Test Production

**Kiedy deployment gotowy:**

1. **Otwórz URL production** (np. `https://coding-ui.vercel.app`)
2. **Sprawdź Console** (F12) - brak błędów?
3. **Test kategorii** - lista się wczytuje?
4. **Test dodawania** - działa?

✅ **Jeśli wszystko działa - SUCCESS! 🎉**

---

## 📋 KROK 10: Cleanup i Monitoring (5 minut)

### 10.1 Monitoring Nowej Bazy

**W nowej instancji Supabase:**

1. **Idź do:** Database → Logs
2. **Sprawdź:** Czy są requesty? (powinny być!)
3. **Sprawdź:** Czy są błędy? (nie powinno być!)

### 10.2 Performance Check

**W Supabase SQL Editor:**
```sql
-- Sprawdź czy indeksy działają
EXPLAIN ANALYZE
SELECT * FROM coui_answers WHERE category_id = 1 LIMIT 100;

-- Execution time powinien być <100ms
```

### 10.3 Backup Plan

**Ustaw automatyczne backupy:**
1. **Supabase Dashboard** → Database → Backups
2. **Sprawdź:** Automatic backups: Enabled (Pro tier)
3. **Retention:** 7 days (domyślnie)

### 10.4 Usuń Stary Projekt (OPCJONALNIE)

**⚠️ UWAGA:** Zrób to dopiero po 7 dniach testów!

**Po 7 dniach bezproblemowego działania:**
1. **Stary projekt Supabase** → Project Settings → General
2. **Scroll na dół** → "Delete project"
3. **Wpisz nazwę projektu** → Delete

---

## ✅ GOTOWE! 🎉

Gratulacje! Pomyślnie zmigrowałeś bazę danych z prefiksem `coui_`!

---

## 📊 Podsumowanie Tego Co Zrobiłeś

✅ **Backup:** Bezpieczna kopia starej bazy
✅ **Nowy projekt:** Supabase Pro/Team tier
✅ **Schema:** 6 tabel z prefiksem `coui_`
✅ **Import:** Wszystkie dane przeniesione
✅ **Kod:** Zaktualizowane nazwy tabel w aplikacji
✅ **Test:** Lokalne i production działają
✅ **Deploy:** Production wdrożone
✅ **Monitoring:** Sprawdzone że działa

---

## 📋 Checklist Końcowy

- [ ] Backup wykonany i zweryfikowany
- [ ] Nowy projekt Supabase utworzony (Pro/Team)
- [ ] Schema z prefiksem uruchomiony
- [ ] 6 tabel utworzonych (coui_*)
- [ ] Dane zaimportowane (liczby się zgadzają)
- [ ] Kod zaktualizowany (wszystkie .from() zamienione)
- [ ] .env zaktualizowany (nowe credentials)
- [ ] TypeScript check OK (brak błędów)
- [ ] Test lokalny OK (wszystkie funkcje działają)
- [ ] Changes committed i pushed
- [ ] Production deployed
- [ ] Production test OK
- [ ] Monitoring checked (brak błędów)

---

## 🆘 Coś Nie Działa?

**Najczęstsze problemy:**

### ❌ "relation coui_answers does not exist"
**Fix:** Sprawdź czy schema został uruchomiony (Krok 3.4)

### ❌ "Cannot read properties of null"
**Fix:** Sprawdź czy dane zaimportowane (Krok 4A.3)

### ❌ TypeScript errors
**Fix:** Sprawdź czy wszystkie .from() zamienione (Krok 5.2)

### ❌ 404 na production
**Fix:** Sprawdź czy env vars zaktualizowane w Vercel/Netlify

**Szczegółowy troubleshooting:** `MIGRACJA_Z_PREFIKSEM_COUI.md`

---

## 📞 Pomoc

**Dokumentacja:**
- `MIGRACJA_Z_PREFIKSEM_COUI.md` - Pełny przewodnik
- `MIGRATION_CHECKLIST.md` - Więcej szczegółów
- `🔄_MIGRACJA_PREFIKS_QUICK.md` - Quick reference

**Kontakt:**
- 📧 support@tgmresearch.com

---

**🎉 Gratulacje! Migracja zakończona sukcesem!**

**Zapisz ten dokument** - może być przydatny w przyszłości!


