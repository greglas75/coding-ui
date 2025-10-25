# 📄 Migracja Supabase z Prefiksem coui_ - Cheat Sheet

## ⚡ 10 Kroków (45 minut)

### ☑️ 0. PRZYGOTOWANIE (5 min)
```
□ Zaloguj do starej instancji Supabase
□ Zapisz Host: db.xxxxx.supabase.co
□ Zapisz Password (Settings → Database)
□ Sprawdź liczby wierszy w tabelach (zapamiętaj!)
```

### ☑️ 1. BACKUP (10 min) ⚠️ NIE PRZESKAKUJ!
```bash
# Edytuj credentials:
nano backup-supabase.sh
# Zmień: DB_PASSWORD i DB_HOST

# Uruchom backup:
./backup-supabase.sh

# Zweryfikuj:
ls -lh backups/$(date +%Y-%m-%d)/
gunzip -c backups/*/coding_ui_backup_*.sql.gz | grep "CREATE TABLE"
```
**✅ Powinno pokazać 6 tabel (answers, categories, codes...)**

### ☑️ 2. NOWY PROJEKT SUPABASE (5 min)
```
□ Otwórz: https://supabase.com
□ Kliknij: "New project"
□ Name: coding-ui-production
□ Database Password: ZAPISZ NOWE!
□ Pricing: Pro/Team
□ Region: US East (Ohio)
□ Poczekaj 2-3 min (setup)
□ Idź do: Settings → API
□ Zapisz: Project URL + anon public key
```

### ☑️ 3. URUCHOM SCHEMA (5 min)
```bash
# Otwórz plik:
open COMPLETE_SCHEMA_WITH_PREFIX.sql

# W Supabase (nowy projekt):
# 1. SQL Editor → New query
# 2. Wklej CAŁY plik (Cmd+A, Cmd+C, Cmd+V)
# 3. RUN

# Zweryfikuj (w SQL Editor):
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'coui_%';
```
**✅ Powinno pokazać 6 tabel z prefiksem coui_**

### ☑️ 4. IMPORT DANYCH (10 min)
```
STARA INSTANCJA (export):
□ Table Editor → każda tabela → "..." → Export CSV
□ Zapisz: answers.csv, categories.csv, codes.csv, etc.

NOWA INSTANCJA (import):
□ coui_categories ← categories.csv
□ coui_codes ← codes.csv
□ coui_codes_categories ← codes_categories.csv
□ coui_answers ← answers.csv
□ coui_answer_codes ← answer_codes.csv
□ coui_file_imports ← file_imports.csv

# Zweryfikuj liczby:
SELECT 'coui_answers', COUNT(*) FROM coui_answers
UNION ALL SELECT 'coui_categories', COUNT(*) FROM coui_categories;
```
**✅ Liczby powinny się zgadzać z krokiem 0!**

### ☑️ 5. ZAKTUALIZUJ KOD (5 min)
```bash
# Commit changes:
git add . && git commit -m "before table rename"

# Uruchom skrypt:
./update-table-names-to-coui.sh
# Wpisz: y

# Sprawdź zmiany:
git diff
```
**✅ Powinno pokazać: `.from('answers')` → `.from('coui_answers')`**

### ☑️ 6. ZAKTUALIZUJ .env (2 min)
```bash
nano .env

# Zmień:
VITE_SUPABASE_URL=https://xxxxx.supabase.co  # nowy URL
VITE_SUPABASE_ANON_KEY=eyJhbG...              # nowy key

# Zapisz: Ctrl+O, Enter, Ctrl+X
```

### ☑️ 7. TEST LOKALNY (5 min)
```bash
# TypeScript check:
npm run type-check

# Uruchom:
npm run dev

# Otwórz: http://localhost:5173
# Sprawdź Console (F12) - brak błędów?
# Test: Dodaj kategorię, kod, sprawdź odpowiedzi
```
**✅ Wszystko działa? Przejdź dalej!**

### ☑️ 8. COMMIT (2 min)
```bash
git add .
git commit -m "feat: migrate to coui_ prefix"
git push origin main
```

### ☑️ 9. DEPLOY PRODUCTION (5 min)
```
VERCEL:
□ Settings → Environment Variables
□ Edytuj: VITE_SUPABASE_URL (nowa wartość)
□ Edytuj: VITE_SUPABASE_ANON_KEY (nowa wartość)
□ Deployments → Redeploy

NETLIFY:
□ Site settings → Environment variables
□ Edytuj zmienne
□ Deploys → Trigger deploy

□ Test: Otwórz production URL
□ Sprawdź: Console (F12), dodaj kategorię
```
**✅ Production działa? SUCCESS! 🎉**

### ☑️ 10. MONITORING (5 min)
```
□ Nowa instancja → Database → Logs (są requesty?)
□ Sprawdź błędy (nie powinno być)
□ Backups włączone? (Pro tier = auto)
```

---

## 🔍 Quick Verification Commands

```bash
# 1. Sprawdź backup:
ls -lh backups/$(date +%Y-%m-%d)/

# 2. Sprawdź tabele (SQL Editor):
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'coui_%';

# 3. Sprawdź dane (SQL Editor):
SELECT COUNT(*) FROM coui_answers;
SELECT COUNT(*) FROM coui_categories;

# 4. Sprawdź czy stare nazwy zamienione:
grep -r "\.from('answers')" src/ | wc -l  # powinno: 0
grep -r "\.from('coui_answers')" src/ | wc -l  # powinno: >0

# 5. TypeScript check:
npm run type-check

# 6. Test lokalny:
npm run dev
```

---

## 🆘 Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| `pg_dump: command not found` | `brew install postgresql` |
| `password authentication failed` | Sprawdź hasło (krok 0) |
| `relation coui_answers does not exist` | Uruchom schema ponownie (krok 3) |
| `Cannot read properties of null` | Zaimportuj dane (krok 4) |
| TypeScript errors | Uruchom skrypt ponownie (krok 5) |
| 404 na production | Sprawdź env vars (krok 9) |

---

## 📊 Mapping Tabel

```
answers            → coui_answers
categories         → coui_categories
codes              → coui_codes
codes_categories   → coui_codes_categories
answer_codes       → coui_answer_codes
file_imports       → coui_file_imports
```

---

## 📋 Checklist Końcowy

- [ ] Backup zweryfikowany (6 tabel w pliku .sql.gz)
- [ ] Nowy projekt utworzony (Pro/Team tier)
- [ ] Schema uruchomiony (6 tabel coui_*)
- [ ] Dane zaimportowane (liczby się zgadzają)
- [ ] Kod zaktualizowany (0 starych nazw pozostało)
- [ ] .env zaktualizowany (nowe URL + key)
- [ ] TypeScript check OK
- [ ] Test lokalny OK
- [ ] Committed & pushed
- [ ] Production deployed
- [ ] Production test OK

---

## 📞 Pełna Dokumentacja

**Szczegółowy przewodnik:** `⚡_KROK_PO_KROKU_OPCJA_A.md`
**Troubleshooting:** `MIGRACJA_Z_PREFIKSEM_COUI.md`
**Quick reference:** `🔄_MIGRACJA_PREFIKS_QUICK.md`

---

**🎉 Gotowe! Powodzenia! 🚀**

**Wydrukuj tę stronę** i zaznaczaj checkboxy ☑️ w miarę postępów!


