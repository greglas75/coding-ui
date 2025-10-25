# 📁 Dokumentacja Migracji Supabase - Indeks

## 🎯 Start Here

**Migrujesz bazę Supabase z Free na Paid tier?** Zacznij tutaj!

---

## 📚 Dokumenty Do Migracji (W Kolejności)

### 1. **`MIGRACJA_SUPABASE_PL.md`** 🇵🇱
**📖 Dla kogo:** Quick overview po polsku
**⏱️ Czas:** 5-10 minut
**📋 Co zawiera:**
- Szybkie podsumowanie co robi aplikacja
- Główne tabele (skrót)
- Liczba użytkowników
- Kroki migracji (quick version)
- Troubleshooting

**👉 Zacznij od tego pliku jeśli chcesz szybki przegląd!**

---

### 2. **`SUPABASE_MIGRATION_INFO.md`** 🇬🇧
**📖 Dla kogo:** Szczegółowe informacje techniczne
**⏱️ Czas:** 20-30 minut
**📋 Co zawiera:**
- Pełny opis aplikacji i funkcji
- Szczegółowy opis wszystkich 6 tabel
- Kolumny, typy, constraints, indeksy
- Przykłady danych w każdej tabeli
- Row Level Security (RLS)
- Funkcje i triggery w bazie
- Szacunkowe rozmiary tabel
- Zmienne środowiskowe
- Kolejność uruchamiania migracji SQL

**👉 Przeczytaj przed migracją aby zrozumieć pełną strukturę!**

---

### 3. **`DATABASE_SCHEMA_DIAGRAM.md`** 📊
**📖 Dla kogo:** Wizualizacja struktury bazy
**⏱️ Czas:** 10-15 minut
**📋 Co zawiera:**
- Diagram ERD (Entity Relationship Diagram) w Mermaid
- Relacje między tabelami (1:N, N:M)
- Szczegółowy opis każdej tabeli z przykładami
- Opis wszystkich 6 funkcji SQL
- Query optimization tips
- Verification queries
- Sample usage examples

**👉 Zobacz wizualnie jak dane są połączone!**

---

### 4. **`COMPLETE_SCHEMA_FOR_MIGRATION.sql`** 🗄️
**📖 Dla kogo:** Do uruchomienia w Supabase SQL Editor
**⏱️ Czas:** 2-3 minuty (run)
**📋 Co zawiera:**
- **PEŁNY SCHEMAT BAZY** - wszystko w jednym pliku
- Tworzenie wszystkich 6 tabel
- Wszystkie indeksy (15-20)
- Row Level Security (RLS) policies
- Wszystkie triggery (1)
- Wszystkie funkcje (6)
- Verification queries
- Comments na tabelach i kolumnach

**👉 To jest GŁÓWNY PLIK do uruchomienia w nowej bazie!**

**Jak użyć:**
1. Otwórz nowy projekt Supabase (Paid tier)
2. Go to: SQL Editor → New Query
3. Skopiuj całą zawartość tego pliku
4. Wklej i kliknij **RUN**
5. Sprawdź czy wszystko przeszło (✅)

---

### 5. **`MIGRATION_CHECKLIST.md`** ✅
**📖 Dla kogo:** Step-by-step checklist podczas migracji
**⏱️ Czas:** 2-4 godziny (cała migracja)
**📋 Co zawiera:**
- Checklist PRZED migracją (backup, export)
- Checklist tworzenia nowego projektu
- Checklist migracji schematu
- Checklist importu danych (CSV lub SQL)
- Checklist konfiguracji aplikacji
- Checklist testowania (lokalnie + production)
- Checklist deployment (Vercel/Netlify)
- Checklist weryfikacji końcowej
- Troubleshooting (najczęstsze problemy)
- Cleanup (co zrobić po migracji)

**👉 Użyj tego jako przewodnika krok po kroku podczas migracji!**

**Jak użyć:**
1. Wydrukuj lub otwórz w drugim oknie
2. Zaznaczaj checkboxy [ ] w miarę postępów
3. Nie przeskakuj kroków!
4. Zapisuj credentials bezpiecznie

---

## 🗂️ Pliki SQL w `/docs/sql/`

### Pliki Składowe (Opcjonalne - jeśli nie używasz `COMPLETE_SCHEMA_FOR_MIGRATION.sql`)

Jeśli wolisz uruchomić migracje **osobno** zamiast jednego dużego pliku:

1. **`2025-categories-ui.sql`**
   - Tabela `categories`
   - RLS policies

2. **`2025-codes-and-relations.sql`**
   - Tabele `codes` + `codes_categories`
   - Trigger `assign_whitelisted_code()`
   - RLS policies

3. **`2025-answers-codes.sql`**
   - Tabela `answer_codes` (N:M)
   - RLS policies

4. **`2025-answers-dashboard.sql`**
   - Dodatkowe kolumny do tabeli `answers`
   - Indeksy

5. **`2025-10-07-add-ai-suggestions.sql`**
   - Kolumna `ai_suggestions` (JSONB)
   - GIN index
   - 3 funkcje AI (get_high_confidence_suggestions, get_ai_suggestion_accuracy, get_top_ai_suggested_codes)

6. **`2025-file-imports-history.sql`**
   - Tabela `file_imports`
   - 2 funkcje (get_import_stats, get_recent_imports)

**⚠️ UWAGA:** Jeśli używasz `COMPLETE_SCHEMA_FOR_MIGRATION.sql`, **nie musisz** uruchamiać tych plików osobno.

---

## 📊 Struktura Tabel (Quick Reference)

```
┌─────────────┐
│ categories  │ (10-50 rows)
│ id, name    │
└──────┬──────┘
       │ 1:N
       │
       ▼
┌─────────────┐      ┌──────────────────┐      ┌──────────┐
│  answers    │◄────►│ answer_codes (N:M│◄────►│  codes   │ (50-500 rows)
│ (10,000+)   │      │                  │      │ id, name │
│ ai_suggest. │      └──────────────────┘      └────┬─────┘
└─────────────┘                                      │
                                                     │
                     ┌──────────────────┐           │
                     │codes_categories  │◄──────────┘
                     │ (N:M relation)   │
                     └──────────────────┘

┌──────────────┐
│file_imports  │ (100-1000 rows)
│ audit log    │
└──────────────┘
```

---

## 🚀 Szybki Start (TL;DR)

### Jeśli masz 30 minut:

1. **Przeczytaj:** `MIGRACJA_SUPABASE_PL.md` (5 min)
2. **Backup:** Stara baza → Export CSV (10 min)
3. **Nowy projekt:** Supabase Paid tier (3 min)
4. **Run SQL:** `COMPLETE_SCHEMA_FOR_MIGRATION.sql` (2 min)
5. **Import:** CSV files (5 min)
6. **Test:** Zaktualizuj `.env` + `npm run dev` (5 min)

### Jeśli masz 2-4 godziny (zalecane):

1. **Przeczytaj:** `SUPABASE_MIGRATION_INFO.md` + `DATABASE_SCHEMA_DIAGRAM.md` (30 min)
2. **Backup:** Dokładny backup + verification (15 min)
3. **Nowy projekt:** Supabase Paid tier + setup (10 min)
4. **Run SQL:** `COMPLETE_SCHEMA_FOR_MIGRATION.sql` + verification (15 min)
5. **Import:** CSV files + verification (30 min)
6. **Config:** `.env` + test lokalnie (20 min)
7. **Tests:** E2E tests + manual testing (30 min)
8. **Deploy:** Production + verification (30 min)
9. **Monitor:** Check logs + performance (20 min)

---

## 🎯 Które Pliki Dla Kogo?

### Dla Product Manager / Non-Tech:
✅ `MIGRACJA_SUPABASE_PL.md` - Quick overview po polsku

### Dla Backend Developer:
✅ `SUPABASE_MIGRATION_INFO.md` - Pełne info techniczne
✅ `DATABASE_SCHEMA_DIAGRAM.md` - Struktura i relacje
✅ `COMPLETE_SCHEMA_FOR_MIGRATION.sql` - Schema to run

### Dla DevOps / Admin:
✅ `MIGRATION_CHECKLIST.md` - Step-by-step podczas migracji
✅ `COMPLETE_SCHEMA_FOR_MIGRATION.sql` - Schema to run

### Dla Frontend Developer:
✅ `MIGRACJA_SUPABASE_PL.md` - Quick overview
✅ `DATABASE_SCHEMA_DIAGRAM.md` - Struktura tabel (do queries)

### Dla QA / Tester:
✅ `MIGRATION_CHECKLIST.md` - Sekcja "Testowanie"
✅ `DATABASE_SCHEMA_DIAGRAM.md` - Verification queries

---

## 📋 Checklist Dokumentacji (Co Zawiera Co?)

| Plik | Opis aplikacji | Tabele | Funkcje SQL | Migracja | Checklist | Troubleshooting |
|------|---------------|--------|-------------|----------|-----------|-----------------|
| `MIGRACJA_SUPABASE_PL.md` | ✅ Krótki | ✅ Skrót | ❌ | ✅ Quick | ❌ | ✅ |
| `SUPABASE_MIGRATION_INFO.md` | ✅ Pełny | ✅ Pełny | ✅ Pełny | ✅ | ❌ | ❌ |
| `DATABASE_SCHEMA_DIAGRAM.md` | ❌ | ✅ Pełny | ✅ Pełny | ❌ | ❌ | ❌ |
| `COMPLETE_SCHEMA_FOR_MIGRATION.sql` | ❌ | ✅ (SQL) | ✅ (SQL) | ✅ | ❌ | ❌ |
| `MIGRATION_CHECKLIST.md` | ❌ | ❌ | ❌ | ✅ Pełny | ✅ | ✅ |

---

## 🆘 Najczęstsze Problemy

### "Nie wiem od czego zacząć"
→ Zacznij od: `MIGRACJA_SUPABASE_PL.md`

### "Potrzebuję pełnej dokumentacji"
→ Przeczytaj: `SUPABASE_MIGRATION_INFO.md` + `DATABASE_SCHEMA_DIAGRAM.md`

### "Chcę zobaczyć strukturę bazy"
→ Zobacz: `DATABASE_SCHEMA_DIAGRAM.md` (diagram ERD)

### "Co uruchomić w SQL Editor?"
→ Uruchom: `COMPLETE_SCHEMA_FOR_MIGRATION.sql`

### "Jak krok po kroku przeprowadzić migrację?"
→ Użyj: `MIGRATION_CHECKLIST.md` (zaznaczaj checkboxy)

### "Mam błąd podczas migracji"
→ Sprawdź: `MIGRATION_CHECKLIST.md` → Sekcja "Troubleshooting"

### "Dane się nie importują"
→ Sprawdź: `MIGRATION_CHECKLIST.md` → Sekcja "Import Danych"

### "Aplikacja nie łączy się z nową bazą"
→ Sprawdź: `.env` (VITE_SUPABASE_URL + ANON_KEY), restart dev server

---

## 📞 Wsparcie

**Email:** support@tgmresearch.com
**GitHub:** https://github.com/your-org/coding-ui/issues
**Dokumentacja aplikacji:** `/docs/` folder

---

## ✅ Podsumowanie

**Masz 4 główne dokumenty:**

1. 🇵🇱 **`MIGRACJA_SUPABASE_PL.md`** - Quick start po polsku
2. 📖 **`SUPABASE_MIGRATION_INFO.md`** - Pełna dokumentacja techniczna
3. 📊 **`DATABASE_SCHEMA_DIAGRAM.md`** - Diagramy i struktura
4. ✅ **`MIGRATION_CHECKLIST.md`** - Step-by-step checklist

**Plus 1 plik SQL:**

5. 🗄️ **`COMPLETE_SCHEMA_FOR_MIGRATION.sql`** - Schema do uruchomienia

---

**Powodzenia z migracją! 🚀**

**Kolejne kroki:**
1. Przeczytaj `MIGRACJA_SUPABASE_PL.md` (5 min)
2. Otwórz `MIGRATION_CHECKLIST.md` w drugim oknie
3. Zacznij migrację krok po kroku!


