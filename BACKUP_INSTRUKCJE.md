# 💾 Backup Bazy Supabase - Instrukcje

## 🎯 Backup Całej Bazy Używając `pg_dump`

### Krok 1: Znajdź Database Password

1. **Zaloguj się do Supabase Dashboard:** https://supabase.com
2. **Wybierz projekt** (stary projekt, który migrujesz)
3. **Przejdź do:** Project Settings → Database
4. **Znajdź sekcję:** "Connection string"
5. **Skopiuj hasło** (będzie potrzebne w komendzie)

**⚠️ WAŻNE:** Zapisz to hasło bezpiecznie! Będzie potrzebne do backupu.

---

### Krok 2: Pobierz Connection String

W tym samym miejscu (Project Settings → Database) znajdziesz:

**Connection string format:**
```
postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres
```

**Przykład:**
```
postgresql://postgres:your_password_here@db.abc123xyz456.supabase.co:5432/postgres
```

**Gdzie znaleźć poszczególne elementy:**
- `[YOUR-PASSWORD]` - Password z kroku 1
- `[HOST]` - Host (np. `db.abc123xyz456.supabase.co`)
- Port: zawsze `5432`
- Database: zawsze `postgres`

---

### Krok 3: Wykonaj Backup z `pg_dump`

#### Opcja A: Pełny Backup (Zalecane)

**Backup ze schematem + danymi + funkcjami + triggerami:**

```bash
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" > coding_ui_backup.sql
```

**Przykład z prawdziwym connection stringiem:**
```bash
pg_dump "postgresql://postgres:my_secure_password@db.abc123xyz456.supabase.co:5432/postgres" > coding_ui_backup.sql
```

**Co zawiera:**
- ✅ Wszystkie tabele z danymi
- ✅ Indeksy
- ✅ Funkcje i triggery
- ✅ Constraints (PRIMARY KEY, FOREIGN KEY, CHECK)
- ✅ RLS policies
- ✅ Sequences
- ✅ Comments

---

#### Opcja B: Backup z Dodatkowymi Opcjami

**1. Backup z kompresją (mniejszy plik):**
```bash
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" | gzip > coding_ui_backup.sql.gz
```

**2. Backup tylko schematu (bez danych):**
```bash
pg_dump --schema-only "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" > coding_ui_schema_only.sql
```

**3. Backup tylko danych (bez schematu):**
```bash
pg_dump --data-only "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" > coding_ui_data_only.sql
```

**4. Backup tylko public schema (pomijając system tables):**
```bash
pg_dump --schema=public "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" > coding_ui_backup.sql
```

**5. Backup z verbose output (pokazuje postęp):**
```bash
pg_dump --verbose "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" > coding_ui_backup.sql
```

**6. Backup w formacie custom (szybszy restore, kompresja):**
```bash
pg_dump -Fc "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" > coding_ui_backup.dump
```

---

### Krok 4: Weryfikacja Backupu

**Sprawdź czy plik został utworzony:**
```bash
ls -lh coding_ui_backup.sql
```

**Sprawdź rozmiar (powinien być >1MB jeśli masz dane):**
```bash
du -h coding_ui_backup.sql
```

**Sprawdź pierwsze linie pliku:**
```bash
head -n 50 coding_ui_backup.sql
```

**Powinno zawierać:**
```sql
--
-- PostgreSQL database dump
--

-- Dumped from database version 15.x
-- Dumped by pg_dump version 15.x

SET statement_timeout = 0;
SET lock_timeout = 0;
...
```

**Sprawdź czy zawiera twoje tabele:**
```bash
grep "CREATE TABLE" coding_ui_backup.sql
```

**Oczekiwany output (powinny być twoje tabele):**
```
CREATE TABLE public.answers (
CREATE TABLE public.categories (
CREATE TABLE public.codes (
CREATE TABLE public.codes_categories (
CREATE TABLE public.answer_codes (
CREATE TABLE public.file_imports (
```

---

### Krok 5: Backup Danych w CSV (Alternatywa)

Jeśli `pg_dump` nie działa lub wolisz CSV:

**Backup każdej tabeli osobno:**
```bash
# Stwórz folder
mkdir -p backups/csv-backup-$(date +%Y%m%d)

# Export każdej tabeli
psql "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" \
  -c "\COPY answers TO 'backups/csv-backup-$(date +%Y%m%d)/answers.csv' CSV HEADER"

psql "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" \
  -c "\COPY categories TO 'backups/csv-backup-$(date +%Y%m%d)/categories.csv' CSV HEADER"

psql "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" \
  -c "\COPY codes TO 'backups/csv-backup-$(date +%Y%m%d)/codes.csv' CSV HEADER"

psql "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" \
  -c "\COPY codes_categories TO 'backups/csv-backup-$(date +%Y%m%d)/codes_categories.csv' CSV HEADER"

psql "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" \
  -c "\COPY answer_codes TO 'backups/csv-backup-$(date +%Y%m%d)/answer_codes.csv' CSV HEADER"

psql "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres" \
  -c "\COPY file_imports TO 'backups/csv-backup-$(date +%Y%m%d)/file_imports.csv' CSV HEADER"
```

---

## 🔒 Bezpieczeństwo

### ⚠️ NIGDY nie commituj plików backup do Git!

**Dodaj do `.gitignore`:**
```bash
# Backupy bazy danych
*.sql
*.dump
*_backup.sql
coding_ui_backup*
backups/
```

**Sprawdź `.gitignore`:**
```bash
cat .gitignore | grep -i backup
```

---

### 🔐 Bezpieczne Przechowywanie Backupów

**Lokalne:**
```bash
# Stwórz folder z datą
mkdir -p ~/backups/coding-ui/$(date +%Y-%m-%d)
mv coding_ui_backup.sql ~/backups/coding-ui/$(date +%Y-%m-%d)/

# Skompresuj i zaszyfruj (opcjonalnie)
tar -czf - coding_ui_backup.sql | openssl enc -aes-256-cbc -salt -out coding_ui_backup.tar.gz.enc
```

**Cloud Storage (Zalecane):**
- ✅ Google Drive (prywatne)
- ✅ Dropbox (prywatne)
- ✅ iCloud Drive
- ✅ AWS S3 (z encryption)
- ❌ NIGDY GitHub/GitLab (publiczne lub prywatne repo)

---

## 🔄 Restore z Backupu (Jeśli Potrzebne)

### Restore pełnego backupu:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[NEW-HOST]:5432/postgres" < coding_ui_backup.sql
```

### Restore z kompresji:

```bash
gunzip -c coding_ui_backup.sql.gz | psql "postgresql://postgres:[YOUR-PASSWORD]@[NEW-HOST]:5432/postgres"
```

### Restore z custom format:

```bash
pg_restore -d "postgresql://postgres:[YOUR-PASSWORD]@[NEW-HOST]:5432/postgres" coding_ui_backup.dump
```

---

## 📋 Gotowy Skrypt Backupu (Kopiuj-Wklej)

Stwórz plik `backup.sh`:

```bash
#!/bin/bash

# ═══════════════════════════════════════════════════════════
# Backup Script dla Coding UI - Supabase Database
# ═══════════════════════════════════════════════════════════

# 🔐 CONFIGURATION (WPISZ SWOJE DANE)
DB_PASSWORD="your_password_here"
DB_HOST="db.abc123xyz456.supabase.co"
DB_USER="postgres"
DB_NAME="postgres"
DB_PORT="5432"

# 📁 Backup directory
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/coding_ui_backup_$TIMESTAMP.sql"

# ═══════════════════════════════════════════════════════════
# START BACKUP
# ═══════════════════════════════════════════════════════════

echo "🚀 Starting backup..."
echo "📅 Timestamp: $TIMESTAMP"

# Create backup directory if doesn't exist
mkdir -p "$BACKUP_DIR"

# Connection string
CONN_STRING="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Run pg_dump
echo "💾 Running pg_dump..."
pg_dump "$CONN_STRING" > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup successful!"
    echo "📁 File: $BACKUP_FILE"

    # Show file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Size: $FILE_SIZE"

    # Compress backup
    echo "🗜️  Compressing..."
    gzip "$BACKUP_FILE"

    COMPRESSED_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
    echo "✅ Compressed to: $COMPRESSED_SIZE"
    echo "📁 Final file: $BACKUP_FILE.gz"

    # Keep only last 7 backups
    echo "🧹 Cleaning old backups (keeping last 7)..."
    ls -t "$BACKUP_DIR"/coding_ui_backup_*.sql.gz | tail -n +8 | xargs rm -f 2>/dev/null

    echo ""
    echo "🎉 Backup complete!"
    echo "═══════════════════════════════════════════════════════════"
else
    echo "❌ Backup failed!"
    exit 1
fi
```

**Użycie:**
```bash
# Nadaj uprawnienia
chmod +x backup.sh

# Edytuj plik i wpisz swoje dane
nano backup.sh
# (zmień DB_PASSWORD, DB_HOST)

# Uruchom backup
./backup.sh
```

---

## 📊 Checklist Backupu

Przed migracją, upewnij się że masz:

- [ ] **Pełny backup SQL** (`coding_ui_backup.sql`)
- [ ] **Backup CSV** każdej tabeli (opcjonalnie)
- [ ] **Zweryfikowany rozmiar** (>1MB jeśli masz dane)
- [ ] **Sprawdzone czy zawiera tabele** (`grep "CREATE TABLE"`)
- [ ] **Bezpiecznie przechowany** (cloud storage lub encrypted)
- [ ] **NIE w Git** (dodane do `.gitignore`)
- [ ] **Test restore** (opcjonalnie, na testowej bazie)

---

## 🆘 Troubleshooting

### Problem: `pg_dump: command not found`

**Rozwiązanie:**
```bash
# macOS (Homebrew)
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Pobierz PostgreSQL installer: https://www.postgresql.org/download/windows/
```

---

### Problem: `FATAL: password authentication failed`

**Rozwiązanie:**
1. Sprawdź hasło w Supabase Dashboard (Project Settings → Database)
2. Upewnij się że używasz `postgres` jako user (nie `anon`)
3. Sprawdź czy connection string jest poprawny
4. Sprawdź czy nie ma spacji w haśle (escape special characters)

---

### Problem: `could not translate host name to address`

**Rozwiązanie:**
1. Sprawdź czy host jest poprawny (skopiuj z Supabase Dashboard)
2. Sprawdź połączenie internetowe
3. Sprawdź czy projekt Supabase nie jest paused

---

### Problem: Backup trwa bardzo długo (>10 min)

**Rozwiązanie:**
- To normalne dla dużych baz (10k+ wierszy)
- Użyj `--verbose` aby zobaczyć postęp
- Rozważ backup tylko danych (`--data-only`) + osobno schema

---

### Problem: Plik backup jest bardzo duży (>500MB)

**Rozwiązanie:**
1. Użyj kompresji: `pg_dump ... | gzip > backup.sql.gz`
2. LUB użyj custom format: `pg_dump -Fc ... > backup.dump`
3. Rozważ backup tylko potrzebnych tabel

---

## 📞 Pomoc

**Więcej info:**
- pg_dump docs: https://www.postgresql.org/docs/current/app-pgdump.html
- Supabase docs: https://supabase.com/docs/guides/database/postgres/backup

**Pytania?**
- Email: support@tgmresearch.com
- GitHub: https://github.com/your-org/coding-ui/issues

---

## ✅ Następne Kroki Po Backupie

1. ✅ **Backup wykonany** (`coding_ui_backup.sql`)
2. 👉 **Przejdź do migracji:** `MIGRATION_CHECKLIST.md`
3. 👉 **Utwórz nowy projekt Supabase** (Paid tier)
4. 👉 **Uruchom schema:** `COMPLETE_SCHEMA_FOR_MIGRATION.sql`
5. 👉 **Import danych** (CSV lub restore SQL)

---

**Gotowe! Masz bezpieczny backup bazy! 💾🎉**


