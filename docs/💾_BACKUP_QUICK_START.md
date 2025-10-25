# 💾 Backup Bazy - Quick Start

## ⚡ 3 Kroki Do Backupu

### Krok 1: Znajdź Credentials (2 minuty)

1. Otwórz **Supabase Dashboard**: https://supabase.com
2. Wybierz **stary projekt** (który migrujesz)
3. Przejdź do: **Project Settings** → **Database**
4. Skopiuj:
   - **Host** (np. `db.abc123xyz456.supabase.co`)
   - **Password** (kliknij "Reset database password" jeśli zapomniane)

---

### Krok 2: Skonfiguruj Skrypt (1 minuta)

Edytuj plik `backup-supabase.sh`:

```bash
nano backup-supabase.sh
```

**Zmień te linie (na początku pliku):**

```bash
DB_PASSWORD="your_password_here"              # ⚠️ Wklej swoje hasło tutaj
DB_HOST="db.abc123xyz456.supabase.co"         # ⚠️ Wklej swój host tutaj
```

**Zapisz:** `Ctrl+O` → Enter → `Ctrl+X`

---

### Krok 3: Uruchom Backup (2-5 minut)

```bash
./backup-supabase.sh
```

**Co robi skrypt:**
1. ✅ Sprawdza czy `pg_dump` jest zainstalowany
2. ✅ Tworzy folder `backups/YYYY-MM-DD/`
3. ✅ Wykonuje backup całej bazy
4. ✅ Kompresuje plik (`.gz`)
5. ✅ Usuwa stare backupy (>7 dni)
6. ✅ Pokazuje podsumowanie

**Wynik:**
```
✅ Backup Complete! 🎉
📁 backups/2025-10-13/coding_ui_backup_20251013_143052.sql.gz
📊 Size: 2.3 MB
```

---

## 🆘 Problemy?

### ❌ `pg_dump: command not found`

**Rozwiązanie:**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

---

### ❌ `Database password not configured!`

**Rozwiązanie:**
- Edytuj `backup-supabase.sh`
- Zmień `DB_PASSWORD="your_password_here"` na swoje hasło
- Zapisz i uruchom ponownie

---

### ❌ `password authentication failed`

**Rozwiązanie:**
1. Sprawdź hasło w Supabase (Project Settings → Database)
2. Reset password jeśli potrzeba
3. Wklej poprawne hasło do skryptu

---

## 📋 Alternatywa: Manualna Komenda

Jeśli wolisz **nie używać skryptu**, uruchom to ręcznie:

```bash
# Zastąp [PASSWORD] i [HOST] swoimi danymi
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" | gzip > coding_ui_backup.sql.gz
```

**Przykład:**
```bash
pg_dump "postgresql://postgres:my_secret_pass@db.abc123xyz456.supabase.co:5432/postgres" | gzip > coding_ui_backup.sql.gz
```

---

## ✅ Po Backupie

### 1. Sprawdź czy plik istnieje:
```bash
ls -lh backups/$(date +%Y-%m-%d)/
```

### 2. Zweryfikuj zawartość:
```bash
# Wyświetl pierwsze 50 linii
gunzip -c backups/*/coding_ui_backup_*.sql.gz | head -n 50

# Sprawdź tabele
gunzip -c backups/*/coding_ui_backup_*.sql.gz | grep "CREATE TABLE"
```

**Powinno pokazać:**
```sql
CREATE TABLE public.answers (
CREATE TABLE public.categories (
CREATE TABLE public.codes (
CREATE TABLE public.codes_categories (
CREATE TABLE public.answer_codes (
CREATE TABLE public.file_imports (
```

### 3. Przenieś do bezpiecznego miejsca:
- ✅ Google Drive (folder prywatny)
- ✅ Dropbox
- ✅ iCloud Drive
- ✅ AWS S3 (encrypted)
- ❌ **NIGDY Git/GitHub!**

### 4. Kontynuuj migrację:
👉 Otwórz: `MIGRATION_CHECKLIST.md` (krok: "Import Danych")

---

## 📊 Co Zawiera Backup?

✅ **Wszystkie tabele z danymi:**
- `answers` (10,000+ rows)
- `categories`
- `codes`
- `codes_categories`
- `answer_codes`
- `file_imports`

✅ **Schema:**
- PRIMARY KEYs
- FOREIGN KEYs
- UNIQUE constraints
- CHECK constraints
- Indeksy

✅ **Funkcje i Triggery:**
- `assign_whitelisted_code()`
- `get_high_confidence_suggestions()`
- `get_ai_suggestion_accuracy()`
- `get_top_ai_suggested_codes()`
- `get_import_stats()`
- `get_recent_imports()`

✅ **RLS Policies**

✅ **Sequences** (auto-increment)

---

## 🔄 Restore (Jeśli Potrzebne)

**Na nowej bazie Supabase:**

```bash
# Dekompresuj i restore
gunzip -c coding_ui_backup.sql.gz | psql "postgresql://postgres:[NEW-PASSWORD]@[NEW-HOST]:5432/postgres"
```

**⚠️ UWAGA:** To **nadpisze** wszystkie dane w docelowej bazie!

---

## 📞 Potrzebujesz Pomocy?

**Szczegółowe instrukcje:** `BACKUP_INSTRUKCJE.md`

**Pytania:**
- 📧 Email: support@tgmresearch.com
- 📖 Docs: `/docs/` folder

---

## ✅ Checklist Backupu

Przed przejściem do migracji, upewnij się że:

- [ ] **Backup wykonany** (`coding_ui_backup_*.sql.gz`)
- [ ] **Plik istnieje** i ma >1MB
- [ ] **Zawiera wszystkie tabele** (sprawdzone `grep "CREATE TABLE"`)
- [ ] **Skopiowany do bezpiecznego miejsca** (cloud storage)
- [ ] **NIE w Git** (sprawdź `.gitignore`)

---

## 🎯 Następne Kroki

1. ✅ **Backup gotowy** - Masz bezpieczną kopię danych!
2. 👉 **Przejdź do:** `MIGRATION_CHECKLIST.md`
3. 👉 **Utwórz nowy projekt** Supabase (Paid tier)
4. 👉 **Uruchom schema:** `COMPLETE_SCHEMA_FOR_MIGRATION.sql`
5. 👉 **Import danych:** CSV lub restore SQL

---

**Gotowe! Masz backup! 🎉**

**Czas na migrację →** `MIGRATION_CHECKLIST.md`


