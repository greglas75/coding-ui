# 🚀 Migracja Supabase - Szybki Przewodnik (PL)

## 📋 Co Robi Ta Aplikacja?

**TGM Research - Coding & AI Categorization Dashboard**

✅ **Przeznaczenie:** Enterprise SaaS do kategoryzacji danych z badań/ankiet
✅ **Główna funkcja:** Automatyczne kategoryzowanie odpowiedzi za pomocą AI (GPT-4)
✅ **Użytkownicy:** Zespoły badawcze, analitycy danych
✅ **Skala:** Obsługuje 10,000+ odpowiedzi jednocześnie

### Kluczowe Funkcje:
- 🤖 **AI Auto-Categorization** - GPT-4 sugeruje kody dla odpowiedzi
- ✅ **Manual Review** - Użytkownik przegląda i potwierdza sugestie
- 📊 **Categories & Codes** - Organizacja kodów w kategorie
- 📁 **CSV/Excel Import** - Import dużych plików (10k+ wierszy)
- 📈 **Analytics Dashboard** - Statystyki i postępy kategoryzacji
- ⚡ **Auto-Confirm** - Automatyczne potwierdzanie pewnych sugestii (≥90%)
- 🔄 **Realtime Sync** - Współpraca w czasie rzeczywistym

---

## 🗄️ Czy Ma Własną Bazę w Supabase?

**TAK** - Aplikacja korzysta z **własnej bazy PostgreSQL w Supabase**.

### Konfiguracja:
- **Backend:** Supabase (PostgreSQL + Realtime + Auth)
- **Frontend:** React 19 + TypeScript + Vite
- **API:** Node.js + Express (opcjonalnie, dla GPT)
- **AI:** OpenAI GPT-4

### Zmienne środowiskowe:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## 📊 Główne Tabele w Bazie

### 1. **`answers`** (GŁÓWNA TABELA)
**Co przechowuje:** Odpowiedzi z ankiet/badań do kategoryzacji
**Liczba wierszy:** 10,000+ (główna tabela z danymi)
**Kluczowe kolumny:**
- `answer_text` - Tekst odpowiedzi
- `selected_code` - Wybrany kod (przez użytkownika)
- `ai_suggested_code` - Sugestia AI (top 1)
- `ai_suggestions` - Pełne sugestie AI (JSONB z confidence scores)
- `category_id` - ID kategorii
- `quick_status` - Status: Other, Ignore, Blacklist, Confirmed
- `coding_date` - Kiedy zakodowano

**Przykład:**
```
id: 12345
answer_text: "I love Nike shoes for running!"
selected_code: "Nike"
ai_suggested_code: "Nike"
ai_suggestions: {
  "suggestions": [
    {"code_name": "Nike", "confidence": 0.98, "reasoning": "..."},
    {"code_name": "Adidas", "confidence": 0.15, "reasoning": "..."}
  ],
  "model": "gpt-4.1-nano"
}
category_id: 2
quick_status: "Confirmed"
```

---

### 2. **`categories`**
**Co przechowuje:** Kategorie do organizacji kodów
**Liczba wierszy:** 10-50
**Kluczowe kolumny:**
- `name` - Nazwa kategorii (np. "Sports Brands", "Home Fragrances")
- `use_web_context` - Czy używać Google Search dla AI

**Przykład:**
```
id: 1, name: "Home Fragrances"
id: 2, name: "Sports Brands"
id: 3, name: "Toothpaste Brands"
```

---

### 3. **`codes`**
**Co przechowuje:** Kody do przypisywania odpowiedziom
**Liczba wierszy:** 50-500
**Kluczowe kolumny:**
- `name` - Nazwa kodu (np. "Nike", "Adidas", "Lavender")
- `is_whitelisted` - Czy automatycznie przypisywać do odpowiedzi

**Przykład:**
```
id: 1, name: "Nike", is_whitelisted: true
id: 2, name: "Adidas", is_whitelisted: true
id: 3, name: "Lavender", is_whitelisted: false
```

**Whitelisting:** Jeśli `is_whitelisted = true`, to kod jest **automatycznie** przypisywany do nowych odpowiedzi, które go zawierają (np. "I love Nike" → auto-assign "Nike").

---

### 4. **`codes_categories`** (Relacja N:M)
**Co przechowuje:** Powiązania między kodami a kategoriami
**Liczba wierszy:** 100-1000

**Przykład:**
```
code_id: 1 (Nike), category_id: 2 (Sports Brands)
code_id: 2 (Adidas), category_id: 2 (Sports Brands)
code_id: 3 (Lavender), category_id: 1 (Home Fragrances)
```

**Uwaga:** Jeden kod może należeć do **wielu kategorii** (np. "Nike" → Sports Brands + Clothing Brands).

---

### 5. **`answer_codes`** (Relacja N:M)
**Co przechowuje:** Powiązania między odpowiedziami a kodami
**Liczba wierszy:** 10,000+

**Przykład:**
```
answer_id: 12345, code_id: 1  (Answer 12345 → Nike)
answer_id: 12345, code_id: 8  (Answer 12345 → Running Shoes)
```

**Uwaga:** Jedna odpowiedź może mieć **wiele kodów** (multi-coding).

---

### 6. **`file_imports`**
**Co przechowuje:** Historia importów plików (audyt)
**Liczba wierszy:** 100-1000
**Kluczowe kolumny:**
- `file_name` - Nazwa pliku
- `rows_imported` - Liczba zaimportowanych wierszy
- `status` - success, failed, partial
- `user_email` - Kto zaimportował

---

## 👥 Liczba Użytkowników

### Obecne (Development):
✅ **1-5 użytkowników** (zespół TGM Research)
✅ **Środowisko:** Development/Staging
✅ **Dane:** ~1,000-10,000 wierszy testowych

### Docelowe (Production):
✅ **10-100+ użytkowników** (B2B SaaS, zespoły badawcze)
✅ **Concurrent users:** 5-50
✅ **Dane:** 100,000+ odpowiedzi na klienta

---

## 🔄 Dlaczego Migracja?

**Powód:** Przejście z **Free tier** na **Paid tier** (Pro/Team)

**Dlaczego?**
- ✅ **Więcej miejsca** na dane (Free: 500MB → Pro: 8GB+)
- ✅ **Więcej połączeń** (Free: 60 → Pro: 200+)
- ✅ **Lepsza wydajność** (dedicated resources)
- ✅ **Automatyczne backupy** (Pro tier)
- ✅ **Production-ready** (SLA, support)

---

## 📦 Pliki Do Migracji

### Kluczowe pliki SQL (uruchom w tej kolejności):

1. **`COMPLETE_SCHEMA_FOR_MIGRATION.sql`**
   → Pełny schemat bazy (wszystko w jednym pliku)

2. **LUB** uruchom osobno:
   - `2025-categories-ui.sql` - Tabela categories
   - `2025-codes-and-relations.sql` - Tabele codes + relations
   - `2025-answers-dashboard.sql` - Kolumny w answers
   - `2025-10-07-add-ai-suggestions.sql` - AI suggestions (JSONB)
   - `2025-file-imports-history.sql` - File imports audit

### Checklisty i dokumentacja:

- ✅ **`MIGRATION_CHECKLIST.md`** - Szczegółowy checklist krok po kroku
- ✅ **`SUPABASE_MIGRATION_INFO.md`** - Pełne info o aplikacji i bazie
- ✅ **`DATABASE_SCHEMA_DIAGRAM.md`** - Diagram ERD i struktura tabel

---

## 🚀 Kroki Migracji (Quick Version)

### 1. Backup Starej Bazy
```sql
-- W Supabase SQL Editor (stary projekt):
CREATE TABLE answers_backup AS SELECT * FROM answers;
CREATE TABLE categories_backup AS SELECT * FROM categories;
-- (etc. dla wszystkich tabel)
```

### 2. Export Danych
- Supabase Dashboard → Table Editor → każda tabela → Export CSV
- Zapisz w `/backups/`

### 3. Nowy Projekt Supabase
- Utwórz nowy projekt (Pro/Team tier)
- Zapisz nowe credentials (URL + ANON_KEY)

### 4. Uruchom Schemat SQL
- Skopiuj: `COMPLETE_SCHEMA_FOR_MIGRATION.sql`
- Wklej w SQL Editor (nowy projekt)
- Run

### 5. Import Danych
- Dashboard → Table Editor → Import CSV (dla każdej tabeli)
- LUB użyj `psql` + `\COPY` (dla dużych plików)

### 6. Sprawdź Liczby Wierszy
```sql
SELECT
  'answers' as table, COUNT(*) FROM answers
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
-- (etc.)
```

### 7. Zaktualizuj `.env`
```env
VITE_SUPABASE_URL=https://new-project.supabase.co
VITE_SUPABASE_ANON_KEY=new_key_here
```

### 8. Test Lokalnie
```bash
npm run dev
# Sprawdź czy aplikacja działa z nową bazą
```

### 9. Deploy do Production
```bash
# Zaktualizuj env vars w Vercel/Netlify
# Redeploy
vercel --prod
```

---

## ✅ Weryfikacja Po Migracji

### Sprawdź:
- [ ] Wszystkie tabele zmigrowane (6 tabel)
- [ ] Liczby wierszy się zgadzają
- [ ] Aplikacja działa lokalnie
- [ ] Aplikacja działa na production
- [ ] Testy E2E przechodzą
- [ ] AI suggestions działają
- [ ] Import plików działa
- [ ] Brak błędów w console

### Monitoring:
- Supabase Dashboard → Logs
- Sprawdź wydajność queries (<500ms dla answers)
- Sprawdź backupy są aktywne

---

## 🆘 Pomoc

### Problemy?

**"Cannot connect to Supabase"**
→ Sprawdź `.env`, restart dev server

**"Data nie są widoczne"**
→ Sprawdź RLS policies, sprawdź czy import się udał

**"Slow queries"**
→ Sprawdź indeksy: `SELECT * FROM pg_indexes WHERE schemaname = 'public';`

### Kontakt:
- 📧 Email: support@tgmresearch.com
- 📖 Docs: `/docs/` folder
- 🐛 Issues: GitHub

---

## 📄 Podsumowanie

✅ **Co robi aplikacja?**
→ Enterprise SaaS do kategoryzacji danych badawczych z AI (GPT-4)

✅ **Czy ma własną bazę w Supabase?**
→ TAK - PostgreSQL z 6 tabelami

✅ **Główne tabele?**
→ `answers` (10k+), `categories` (10-50), `codes` (50-500), + 3 relacje

✅ **Liczba użytkowników?**
→ Obecnie: 1-5, Docelowo: 10-100+

✅ **Pliki do migracji?**
→ `COMPLETE_SCHEMA_FOR_MIGRATION.sql` + dane CSV

✅ **Checklist?**
→ `MIGRATION_CHECKLIST.md` (szczegółowy przewodnik)

---

**Powodzenia z migracją! 🚀**

**Przydatne pliki:**
- 📋 Checklist: `MIGRATION_CHECKLIST.md`
- 📊 Diagram: `DATABASE_SCHEMA_DIAGRAM.md`
- ℹ️ Info: `SUPABASE_MIGRATION_INFO.md`
- 🗄️ SQL: `COMPLETE_SCHEMA_FOR_MIGRATION.sql`


