# 🚀 Migracja Supabase - Start Tutaj!

## ⚡ Quick Start (5 minut)

Migrujesz bazę Supabase z **Free tier** na **Paid tier**? Masz wszystko czego potrzebujesz!

---

## 📋 Odpowiedzi na Twoje Pytania

### ❓ Co robi ta aplikacja?

**TGM Research - Coding & AI Categorization Dashboard**

✅ Enterprise SaaS do automatycznej kategoryzacji danych z badań za pomocą AI (GPT-4)
✅ Obsługuje 10,000+ odpowiedzi jednocześnie
✅ Real-time collaboration, import CSV/Excel, analytics dashboard

**📖 Więcej:** `MIGRACJA_SUPABASE_PL.md` (sekcja: "Co Robi Ta Aplikacja?")

---

### ❓ Czy ma własną bazę danych w Supabase?

**TAK** - Własna baza PostgreSQL w Supabase

✅ 6 głównych tabel
✅ 15-20 indeksów
✅ 6 funkcji SQL + 1 trigger
✅ Row Level Security (RLS) enabled

**📖 Więcej:** `SUPABASE_MIGRATION_INFO.md` (sekcja: "Czy Ma Własną Bazę?")

---

### ❓ Jakie główne tabele?

1. **`answers`** (10,000+ rows) - Odpowiedzi z badań do kategoryzacji
2. **`categories`** (10-50 rows) - Kategorie kodowania
3. **`codes`** (50-500 rows) - Kody kategoryzacji
4. **`codes_categories`** (100-1000 rows) - Relacja N:M (kody ↔ kategorie)
5. **`answer_codes`** (10,000+ rows) - Relacja N:M (odpowiedzi ↔ kody)
6. **`file_imports`** (100-1000 rows) - Historia importów (audit)

**📖 Więcej:** `DATABASE_SCHEMA_DIAGRAM.md` (pełne diagramy + opisy)

---

### ❓ Liczba użytkowników?

**Obecnie (Development):** 1-5 użytkowników
**Docelowo (Production):** 10-100+ użytkowników (B2B SaaS)

**📖 Więcej:** `SUPABASE_MIGRATION_INFO.md` (sekcja: "Liczba Użytkowników")

---

## 🗂️ Które Pliki Przeczytać?

### 1️⃣ Potrzebujesz Quick Overview? (5-10 min)

**📄 Przeczytaj:** `MIGRACJA_SUPABASE_PL.md`

**Co zawiera:**
- Krótki opis aplikacji
- Główne tabele (skrót)
- Kroki migracji (quick version)
- Troubleshooting

👉 **Zacznij od tego pliku!**

---

### 2️⃣ Chcesz Pełną Dokumentację Techniczną? (20-30 min)

**📄 Przeczytaj:** `SUPABASE_MIGRATION_INFO.md`

**Co zawiera:**
- Szczegółowy opis wszystkich 6 tabel
- Kolumny, typy, constraints, indeksy
- Funkcje SQL i triggery
- Przykłady danych
- Zmienne środowiskowe
- Kolejność migracji

👉 **Przeczytaj przed migracją!**

---

### 3️⃣ Chcesz Zobaczyć Strukturę Bazy? (10-15 min)

**📄 Przeczytaj:** `DATABASE_SCHEMA_DIAGRAM.md`

**Co zawiera:**
- Diagram ERD (Entity Relationship Diagram)
- Relacje między tabelami (wizualizacja)
- Szczegółowe opisy każdej tabeli
- Query optimization tips
- Verification queries

👉 **Zobacz wizualnie jak dane są połączone!**

---

### 4️⃣ Gotowy na Migrację? (2-4 godziny)

**📄 Użyj:** `MIGRATION_CHECKLIST.md`

**Co zawiera:**
- Step-by-step checklist (zaznaczaj [ ] w miarę postępów)
- Backup starej bazy
- Tworzenie nowego projektu
- Import danych
- Testowanie
- Deployment
- Troubleshooting

**📄 + Uruchom:** `COMPLETE_SCHEMA_FOR_MIGRATION.sql`

**Co zawiera:**
- Pełny schemat bazy (wszystko w jednym pliku)
- 6 tabel + indeksy + funkcje + triggery
- Gotowe do uruchomienia w Supabase SQL Editor

👉 **Użyj checklistu jako przewodnika!**

---

### 5️⃣ Potrzebujesz Indeksu Wszystkich Plików?

**📄 Przeczytaj:** `📁_DOKUMENTACJA_MIGRACJI_INDEX.md`

**Co zawiera:**
- Spis treści wszystkich dokumentów
- Tabela porównawcza (co zawiera co?)
- "Które pliki dla kogo?" (PM, Developer, DevOps, QA)
- Najczęstsze problemy i rozwiązania

👉 **Jeśli nie wiesz który plik otworzyć, zacznij tutaj!**

---

## 🚀 Szybka Ścieżka Migracji (30 minut)

Jeśli masz mało czasu:

```
0. Backup (5 min) ⚠️ ZACZNIJ OD TEGO!
   └─ Uruchom: ./backup-supabase.sh
   └─ LUB zobacz: 💾_BACKUP_QUICK_START.md

1. Backup CSV (opcjonalnie, 10 min)
   └─ Export CSV z każdej tabeli (Supabase Dashboard)

2. Nowy projekt (5 min)
   └─ Utwórz w Supabase (Pro/Team tier)
   └─ Zapisz credentials (URL + ANON_KEY)

3. Schema (2 min)
   └─ Run: COMPLETE_SCHEMA_FOR_MIGRATION.sql

4. Import (5 min)
   └─ Import CSV do każdej tabeli

5. Config (5 min)
   └─ Zaktualizuj .env z nowymi credentials
   └─ npm run dev (test lokalnie)

6. Deploy (3 min)
   └─ Zaktualizuj env vars w Vercel/Netlify
   └─ Redeploy
```

**📖 Szczegóły:** `MIGRATION_CHECKLIST.md` (pełny checklist)

---

## 📁 Struktura Plików

```
/Users/greglas/coding-ui/

📄 Dokumentacja Migracji:
├── 🚀_START_MIGRACJA_TUTAJ.md ← TY JESTEŚ TUTAJ
├── 📁_DOKUMENTACJA_MIGRACJI_INDEX.md (indeks wszystkich plików)
├── MIGRACJA_SUPABASE_PL.md (quick overview po polsku)
├── SUPABASE_MIGRATION_INFO.md (pełna dokumentacja techniczna)
├── DATABASE_SCHEMA_DIAGRAM.md (diagramy + struktura)
├── MIGRATION_CHECKLIST.md (step-by-step checklist)
└── COMPLETE_SCHEMA_FOR_MIGRATION.sql (schema do uruchomienia)

💾 Backup:
├── 💾_BACKUP_QUICK_START.md (quick start - 3 kroki)
├── BACKUP_INSTRUKCJE.md (szczegółowe instrukcje)
└── backup-supabase.sh (gotowy skrypt do uruchomienia)

🔄 Migracja z Prefiksem (coui_):
├── MIGRACJA_Z_PREFIKSEM_COUI.md (instrukcje migracji z prefiksem)
├── COMPLETE_SCHEMA_WITH_PREFIX.sql (schema z prefiksem coui_)
└── update-table-names-to-coui.sh (automatyczna zmiana w kodzie)

🗂️ Składowe SQL (opcjonalne):
└── docs/sql/
    ├── 2025-categories-ui.sql
    ├── 2025-codes-and-relations.sql
    ├── 2025-answers-dashboard.sql
    ├── 2025-10-07-add-ai-suggestions.sql
    └── 2025-file-imports-history.sql
```

---

## 🎯 Dla Kogo Jest Który Plik?

| Rola | Pliki Do Przeczytania |
|------|----------------------|
| **Product Manager** | `MIGRACJA_SUPABASE_PL.md` |
| **Backend Developer** | `SUPABASE_MIGRATION_INFO.md` + `DATABASE_SCHEMA_DIAGRAM.md` + SQL |
| **DevOps / Admin** | `💾_BACKUP_QUICK_START.md` + `MIGRATION_CHECKLIST.md` + `backup-supabase.sh` |
| **Frontend Developer** | `MIGRACJA_SUPABASE_PL.md` + `DATABASE_SCHEMA_DIAGRAM.md` |
| **QA / Tester** | `MIGRATION_CHECKLIST.md` (sekcja "Testowanie") |
| **WSZYSCY (zaczynają od backup)** | **`💾_BACKUP_QUICK_START.md` + `backup-supabase.sh`** ⚠️

---

## ⚡ Quick Commands

### Backup Starej Bazy
```sql
-- W Supabase SQL Editor (stary projekt):
CREATE TABLE answers_backup AS SELECT * FROM answers;
CREATE TABLE categories_backup AS SELECT * FROM categories;
CREATE TABLE codes_backup AS SELECT * FROM codes;
-- (etc. dla wszystkich tabel)
```

### Sprawdź Liczby Wierszy (Po Migracji)
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

### Zaktualizuj .env
```env
# Nowe credentials:
VITE_SUPABASE_URL=https://new-project.supabase.co
VITE_SUPABASE_ANON_KEY=new_anon_key_here
```

### Test Lokalnie
```bash
npm run dev
# Open: http://localhost:5173
```

### Deploy Production
```bash
# Vercel:
vercel --prod

# Netlify:
netlify deploy --prod
```

---

## 🆘 Najczęstsze Problemy

### Problem: "Nie wiem od czego zacząć"
**✅ Rozwiązanie:** Otwórz `MIGRACJA_SUPABASE_PL.md` (5 min read)

### Problem: "Potrzebuję checklisty krok po kroku"
**✅ Rozwiązanie:** Użyj `MIGRATION_CHECKLIST.md` (zaznaczaj [ ])

### Problem: "Co uruchomić w SQL Editor?"
**✅ Rozwiązanie:** Uruchom `COMPLETE_SCHEMA_FOR_MIGRATION.sql`

### Problem: "Chcę zobaczyć strukturę tabel"
**✅ Rozwiązanie:** Zobacz `DATABASE_SCHEMA_DIAGRAM.md` (diagram ERD)

### Problem: "Aplikacja nie łączy się z nową bazą"
**✅ Rozwiązanie:**
1. Sprawdź `.env` (VITE_SUPABASE_URL + ANON_KEY)
2. Restart dev server: `Ctrl+C` → `npm run dev`
3. Clear browser cache (Ctrl+Shift+Delete)

### Problem: "Data nie są widoczne po imporcie"
**✅ Rozwiązanie:**
1. Sprawdź RLS policies (czy są włączone)
2. Sprawdź Console w przeglądarce (F12)
3. Sprawdź liczby wierszy: `SELECT COUNT(*) FROM answers;`

---

## 📞 Kontakt i Wsparcie

**Email:** support@tgmresearch.com
**GitHub Issues:** https://github.com/your-org/coding-ui/issues
**Dokumentacja App:** `/docs/` folder w repo

---

## ✅ Następne Kroki

### Krok 0: ⚠️ BACKUP NAJPIERW! (5 min)
👉 Otwórz: `💾_BACKUP_QUICK_START.md`
👉 Uruchom: `./backup-supabase.sh`

**⚠️ NIE PRZESKAKUJ TEGO KROKU!** Backup to Twoja polisa ubezpieczeniowa!

### Krok 1: Przeczytaj Quick Overview (5 min)
👉 Otwórz: `MIGRACJA_SUPABASE_PL.md`

### Krok 2: Przygotuj Backup CSV (opcjonalnie, 10 min)
👉 Export CSV ze starej bazy (dodatkowy backup)

### Krok 3: Otwórz Checklist (2-4 godziny)
👉 Użyj: `MIGRATION_CHECKLIST.md` (zaznaczaj checkboxy)

### Krok 4: Uruchom SQL (2 min)
👉 Run: `COMPLETE_SCHEMA_FOR_MIGRATION.sql` w nowym projekcie

### Krok 5: Test & Deploy
👉 Zaktualizuj `.env` → Test lokalnie → Deploy production

---

## 🎉 Gotowe!

Masz **wszystkie** pliki potrzebne do pomyślnej migracji:

✅ Quick overview po polsku
✅ Pełna dokumentacja techniczna
✅ Diagramy i struktura bazy
✅ Step-by-step checklist
✅ Gotowy SQL schema do uruchomienia
✅ Troubleshooting i FAQ

**Powodzenia z migracją! 🚀**

---

**🔥 Quick Tip:** Wydrukuj `MIGRATION_CHECKLIST.md` lub otwórz w drugim oknie podczas migracji!

