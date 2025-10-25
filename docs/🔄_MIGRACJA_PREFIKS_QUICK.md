# 🔄 Migracja z Prefiksem coui_ - Quick Reference

## ⚡ 3 Minuty Do Startu

### Krok 1: Backup (5 min)
```bash
./backup-supabase.sh
```

### Krok 2: Nowy Projekt Supabase + Schema (5 min)
1. Utwórz nowy projekt Supabase (Paid tier)
2. Otwórz SQL Editor
3. Skopiuj całość: `COMPLETE_SCHEMA_WITH_PREFIX.sql`
4. Wklej i kliknij **RUN**

### Krok 3: Import Danych (10 min)
- CSV import przez Dashboard LUB
- Restore z backupu (do tabel z prefiksem!)

### Krok 4: Zaktualizuj Kod (5 min)
```bash
# Automatycznie:
./update-table-names-to-coui.sh

# LUB Manualnie:
# Zamień .from('answers') na .from('coui_answers')
# (w całym src/)
```

### Krok 5: Test (5 min)
```bash
# Zaktualizuj .env
VITE_SUPABASE_URL=https://new-project.supabase.co
VITE_SUPABASE_ANON_KEY=new_key

# Test
npm run dev
```

---

## 🗂️ Mapping Tabel (Copy-Paste)

```
answers            → coui_answers
categories         → coui_categories
codes              → coui_codes
codes_categories   → coui_codes_categories
answer_codes       → coui_answer_codes
file_imports       → coui_file_imports
```

---

## 📋 Pliki Do Użycia

| Plik | Kiedy Użyć |
|------|-----------|
| **`COMPLETE_SCHEMA_WITH_PREFIX.sql`** | ✅ Z prefiksem (zalecane) |
| `COMPLETE_SCHEMA_FOR_MIGRATION.sql` | BEZ prefiksu (dedykowana instancja) |
| **`update-table-names-to-coui.sh`** | Automatyczna zmiana w kodzie |
| **`MIGRACJA_Z_PREFIKSEM_COUI.md`** | Pełne instrukcje |

---

## 🚀 Automatyczna Zmiana w Kodzie

```bash
# 1. Backup kodu (na wszelki wypadek)
git add . && git commit -m "before table rename"

# 2. Uruchom skrypt
./update-table-names-to-coui.sh

# 3. Sprawdź zmiany
git diff

# 4. Test
npm run type-check
npm run dev
```

**Co robi skrypt?**
- ✅ Zamienia `.from('answers')` → `.from('coui_answers')`
- ✅ Zamienia `.from('categories')` → `.from('coui_categories')`
- ✅ Zamienia `.rpc('get_*')` → `.rpc('coui_get_*')`
- ✅ Wszystkie pliki `.ts` i `.tsx` w `src/`
- ✅ Pokazuje podsumowanie zmian

---

## ✅ Weryfikacja (Po Zmianach)

### 1. Sprawdź czy wszystkie nazwy zamienione:
```bash
# Stare nazwy (powinno być 0):
grep -r "\.from('answers')" src/ | wc -l
grep -r "\.from('categories')" src/ | wc -l

# Nowe nazwy (powinno być >0):
grep -r "\.from('coui_answers')" src/ | wc -l
grep -r "\.from('coui_categories')" src/ | wc -l
```

### 2. TypeScript Check:
```bash
npm run type-check
```

### 3. Test Aplikacji:
```bash
npm run dev
# Open http://localhost:5173
```

**Testuj:**
- [ ] Lista kategorii
- [ ] Dodawanie kategorii
- [ ] Lista kodów
- [ ] Lista odpowiedzi
- [ ] Import CSV

---

## 🆘 Quick Troubleshooting

### ❌ "relation coui_answers does not exist"

**Fix:**
```sql
-- Sprawdź czy tabele istnieją:
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'coui_%';

-- Jeśli nie ma, uruchom ponownie:
-- COMPLETE_SCHEMA_WITH_PREFIX.sql
```

---

### ❌ "Cannot read properties of null"

**Fix:**
```bash
# Sprawdź czy dane zaimportowane:
# W Supabase SQL Editor:
SELECT COUNT(*) FROM coui_answers;
SELECT COUNT(*) FROM coui_categories;

# Jeśli 0, zaimportuj dane!
```

---

### ❌ TypeScript errors po zmianie

**Fix:**
```bash
# Sprawdź czy wszystkie .from('old') zamienione:
grep -r "\.from('answers')" src/
grep -r "\.from('categories')" src/

# Jeśli są, zamień manualnie lub uruchom skrypt ponownie
```

---

## 📊 2 Opcje Migracji

### Opcja A: Z Prefiksem coui_ ⭐ (Zalecane)

**Kiedy:**
- Shared Supabase instance (wiele projektów)
- Best practice (organizacja)
- Production-ready

**Pliki:**
- `COMPLETE_SCHEMA_WITH_PREFIX.sql`
- `update-table-names-to-coui.sh`

**Pros:**
- ✅ Unikanie konfliktów nazw
- ✅ Lepsze organizacja
- ✅ Izolacja od innych projektów

**Cons:**
- ⚠️ Wymaga zmiany kodu (5-10 min)

---

### Opcja B: Bez Prefiksu (Simple)

**Kiedy:**
- Dedykowana instancja TYLKO dla Coding UI
- Szybka migracja bez zmian w kodzie

**Pliki:**
- `COMPLETE_SCHEMA_FOR_MIGRATION.sql`

**Pros:**
- ✅ Brak zmian w kodzie
- ✅ Szybciej (0 refactoringu)

**Cons:**
- ⚠️ Brak izolacji
- ⚠️ Możliwe konflikty w przyszłości

---

## 🎯 Zalecenie

👉 **Użyj Opcji A (z prefiksem)** jeśli:
- Nowa instancja będzie używana przez wiele projektów
- Planujesz dodać inne aplikacje do tej samej instancji
- Chcesz best practice

👉 **Użyj Opcji B (bez prefiksu)** jeśli:
- Dedykowana instancja TYLKO dla Coding UI
- Brak czasu na refactoring kodu
- Quick & dirty migration

---

## 📞 Pełna Dokumentacja

**Szczegółowe instrukcje:**
- 📖 `MIGRACJA_Z_PREFIKSEM_COUI.md` (pełny przewodnik)
- 📖 `MIGRATION_CHECKLIST.md` (step-by-step)
- 📖 `DATABASE_SCHEMA_DIAGRAM.md` (diagramy)

**Kontakt:**
- 📧 support@tgmresearch.com

---

**Gotowe! Powodzenia z migracją! 🚀**

**Quick Start:**
1. `./backup-supabase.sh` (backup)
2. Run `COMPLETE_SCHEMA_WITH_PREFIX.sql` (nowy projekt)
3. `./update-table-names-to-coui.sh` (update kod)
4. `npm run dev` (test)


