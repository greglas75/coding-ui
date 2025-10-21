# 📋 Informacje o Aplikacji i Bazie Danych - Migracja Supabase

## 🎯 Co Robi Ta Aplikacja?

**Nazwa:** TGM Research - Coding & AI Categorization Dashboard

**Typ:** Enterprise SaaS do kategoryzacji danych badawczych

**Opis:** Profesjonalna aplikacja webowa do kategoryzacji odpowiedzi z badań/ankiet przy użyciu AI (GPT-4) i manualnego kodowania.

### Główne Funkcje:
- 📊 **Zarządzanie kategoriami** - Tworzenie i organizacja kategorii kodowania
- 🏷️ **Zarządzanie kodami** - Definiowanie kodów i przypisywanie do wielu kategorii
- 🤖 **AI-Powered Suggestions** - Automatyczne sugestie kodów przez GPT-4
- ✅ **Manualna kategoryzacja** - Przeglądanie i potwierdzanie sugestii AI
- 🔍 **Zaawansowane filtrowanie** - Wyszukiwanie i filtrowanie po wielu kryteriach
- 📈 **Dashboard statystyk** - Śledzenie postępów kategoryzacji
- ⚡ **Auto-Confirm Agent** - Automatyczne potwierdzanie sugestii AI o wysokiej pewności (≥90%)
- 📦 **Operacje masowe** - Whitelist/Blacklist wielu odpowiedzi naraz
- 🔄 **Real-time Sync** - Aktualizacje na żywo przez Supabase realtime
- 🎭 **Virtual Scrolling** - Obsługa 10,000+ odpowiedzi bez problemów z wydajnością

### Skala Projektu:
- **Obsługuje:** 10,000+ wierszy danych
- **Testy:** 113 testów (69 unit + 44 E2E)
- **Komponenty:** 50+
- **Linie kodu:** ~15,000
- **Coverage:** 95%+ (critical code)

---

## 🗄️ Czy Ma Własną Bazę Danych w Supabase?

**TAK** - Aplikacja korzysta z **własnej bazy danych PostgreSQL w Supabase**.

### Konfiguracja:
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Frontend:** React 19 + TypeScript + Vite
- **API Server:** Node.js + Express (opcjonalnie, dla integracji GPT)
- **AI Engine:** OpenAI GPT-4

### Zmienne Środowiskowe:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001  # opcjonalnie
OPENAI_API_KEY=your_openai_api_key  # opcjonalnie
```

---

## 📊 Główne Tabele w Bazie Danych

### 1. **`answers`** (Tabela Główna - Odpowiedzi z Badań)

**Opis:** Przechowuje wszystkie odpowiedzi z ankiet/badań do kategoryzacji.

**Kolumny:**
```sql
id                  BIGSERIAL PRIMARY KEY
answer_text         TEXT NOT NULL              -- Oryginalny tekst odpowiedzi
translation         TEXT                       -- Tłumaczenie (edytowalne przez użytkownika)
translation_en      TEXT                       -- Tłumaczenie EN (generowane przez AI)
language            TEXT                       -- Język odpowiedzi (np. "PL", "EN")
country             TEXT                       -- Kraj (np. "Poland", "USA")
quick_status        TEXT                       -- 'Other', 'Ignore', 'Global Blacklist', 'Blacklist', 'Confirmed'
general_status      TEXT                       -- Status ogólny (alias do 'status')
selected_code       TEXT                       -- Wybrany kod przez użytkownika
ai_suggested_code   TEXT                       -- Kod zaproponowany przez AI (top suggestion)
ai_suggestions      JSONB                      -- Pełne sugestie AI z confidence scores
category_id         BIGINT REFERENCES categories(id)
coding_date         TIMESTAMPTZ                -- Data kodowania
confirmed_by        TEXT                       -- Email użytkownika, który potwierdził
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

**Indeksy:**
```sql
idx_answers_language        ON language
idx_answers_country         ON country
idx_answers_general_status  ON general_status
idx_answers_quick_status    ON quick_status
idx_answers_coding_date     ON coding_date DESC
idx_answers_ai_suggestions  USING GIN (ai_suggestions)  -- JSONB index
```

**Szacowana liczba wierszy:** 10,000+ (zależnie od użycia)

**Przykład JSONB w `ai_suggestions`:**
```json
{
  "suggestions": [
    {
      "code_id": "123",
      "code_name": "Nike",
      "confidence": 0.95,
      "reasoning": "User mentioned nike in response"
    },
    {
      "code_id": "456",
      "code_name": "Adidas",
      "confidence": 0.75,
      "reasoning": "Similar brand mentioned secondarily"
    }
  ],
  "model": "gpt-4.1-nano",
  "timestamp": "2025-10-07T12:00:00Z",
  "preset_used": "LLM Brand List"
}
```

---

### 2. **`categories`** (Kategorie Kodowania)

**Opis:** Kategorie do organizacji kodów (np. "Home Fragrances", "Sports Brands").

**Kolumny:**
```sql
id               BIGSERIAL PRIMARY KEY
name             TEXT NOT NULL UNIQUE
slug             TEXT GENERATED ALWAYS AS (regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) STORED
use_web_context  BOOLEAN DEFAULT TRUE    -- Czy używać Google Search context dla AI
created_at       TIMESTAMPTZ DEFAULT NOW()
updated_at       TIMESTAMPTZ DEFAULT NOW()
```

**Indeksy:**
```sql
UNIQUE INDEX on name
INDEX on slug
```

**Szacowana liczba wierszy:** 10-50 kategorii

---

### 3. **`codes`** (Kody Kategoryzacji)

**Opis:** Kody do przypisywania odpowiedziom (np. "Nike", "Adidas", "Lavender").

**Kolumny:**
```sql
id              BIGSERIAL PRIMARY KEY
name            TEXT NOT NULL UNIQUE
slug            TEXT GENERATED ALWAYS AS (regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) STORED
is_whitelisted  BOOLEAN DEFAULT FALSE   -- Automatyczne przypisywanie przy dopasowaniu
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

**Indeksy:**
```sql
idx_codes_slug             ON slug
idx_codes_is_whitelisted   ON is_whitelisted
UNIQUE INDEX on name
```

**Szacowana liczba wierszy:** 50-500 kodów

---

### 4. **`codes_categories`** (Relacja N:M - Kody ↔ Kategorie)

**Opis:** Tabela łącząca kody z kategoriami (jeden kod może należeć do wielu kategorii).

**Kolumny:**
```sql
code_id      BIGINT NOT NULL REFERENCES codes(id) ON DELETE CASCADE
category_id  BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE
PRIMARY KEY (code_id, category_id)
```

**Indeksy:**
```sql
PRIMARY KEY on (code_id, category_id)
```

**Szacowana liczba wierszy:** 100-1000 relacji

---

### 5. **`answer_codes`** (Relacja N:M - Odpowiedzi ↔ Kody)

**Opis:** Tabela łącząca odpowiedzi z kodami (jedna odpowiedź może mieć wiele kodów).

**Kolumny:**
```sql
answer_id  BIGINT REFERENCES answers(id) ON DELETE CASCADE
code_id    BIGINT REFERENCES codes(id) ON DELETE CASCADE
PRIMARY KEY (answer_id, code_id)
```

**Szacowana liczba wierszy:** 10,000+ relacji (zależnie od liczby odpowiedzi)

---

### 6. **`file_imports`** (Historia Importów Plików)

**Opis:** Śledzenie wszystkich importów plików CSV/Excel do audytu.

**Kolumny:**
```sql
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
file_name             TEXT NOT NULL
category_name         TEXT
category_id           BIGINT REFERENCES categories(id) ON DELETE SET NULL
rows_imported         INTEGER DEFAULT 0
rows_skipped          INTEGER DEFAULT 0
user_email            TEXT DEFAULT 'system'
status                TEXT CHECK (status IN ('success', 'failed', 'partial'))
error_message         TEXT
file_size_kb          NUMERIC(10, 2)
processing_time_ms    INTEGER
created_at            TIMESTAMPTZ DEFAULT NOW()
```

**Indeksy:**
```sql
idx_file_imports_created_at   ON created_at DESC
idx_file_imports_status       ON status
idx_file_imports_category_id  ON category_id
idx_file_imports_user_email   ON user_email
```

**Szacowana liczba wierszy:** 100-1000 importów

---

## 🔒 Row Level Security (RLS)

**Status:** ✅ Włączone na wszystkich tabelach

### Polityki RLS (Obecne - Prototyp):

```sql
-- categories
CREATE POLICY "categories read" ON categories FOR SELECT USING (true);
CREATE POLICY "categories write" ON categories FOR ALL USING (true) WITH CHECK (true);

-- codes
CREATE POLICY "codes read" ON codes FOR SELECT USING (true);
CREATE POLICY "codes write" ON codes FOR ALL USING (true) WITH CHECK (true);

-- codes_categories
CREATE POLICY "codes_categories read" ON codes_categories FOR SELECT USING (true);
CREATE POLICY "codes_categories write" ON codes_categories FOR ALL USING (true) WITH CHECK (true);

-- answers
CREATE POLICY "answers UPDATE (anon ok)" ON answers FOR UPDATE USING (true) WITH CHECK (true);

-- answer_codes
CREATE POLICY "answer_codes read" ON answer_codes FOR SELECT USING (true);
CREATE POLICY "answer_codes write" ON answer_codes FOR INSERT WITH CHECK (true);
```

**⚠️ UWAGA:** Obecne polityki są otwarte dla prototypu. **Przed production należy je dostosować** do faktycznej logiki autoryzacji (auth.uid(), role-based access, etc.).

---

## 🔧 Funkcje i Triggery w Bazie

### 1. **`assign_whitelisted_code()`** - Auto-przypisywanie Whitelistowanych Kodów

**Opis:** Automatycznie przypisuje kod do nowej odpowiedzi, jeśli tekst zawiera whitelistowany kod.

**Trigger:**
```sql
CREATE TRIGGER trg_assign_whitelisted_code
BEFORE INSERT ON answers
FOR EACH ROW EXECUTE FUNCTION assign_whitelisted_code();
```

**Logika:**
- Jeśli `answer_text` zawiera whitelistowany kod (`is_whitelisted = true`)
- Ustaw `selected_code = <kod>`
- Ustaw `quick_status = 'Confirmed'`
- Ustaw `general_status = 'whitelist'`
- Ustaw `coding_date = NOW()`

---

### 2. **`get_high_confidence_suggestions()`** - Pobranie Sugestii AI o Wysokiej Pewności

**Parametry:**
- `p_category_id` (BIGINT, default: NULL) - Filtruj po kategorii
- `p_min_confidence` (REAL, default: 0.85) - Minimalna pewność (0.0-1.0)
- `p_limit` (INT, default: 100) - Limit wyników

**Zwraca:**
```sql
answer_id       BIGINT
answer_text     TEXT
suggested_code  TEXT
confidence      REAL
reasoning       TEXT
model           TEXT
```

**Użycie:**
```sql
SELECT * FROM get_high_confidence_suggestions(1, 0.90, 50);
```

---

### 3. **`get_ai_suggestion_accuracy()`** - Dokładność Sugestii AI

**Parametry:**
- `p_category_id` (BIGINT, default: NULL)
- `p_days` (INT, default: 30)

**Zwraca:**
```sql
total_suggestions    BIGINT
correct_suggestions  BIGINT
accuracy_rate        REAL
avg_confidence       REAL
```

---

### 4. **`get_top_ai_suggested_codes()`** - Top Sugerowane Kody

**Parametry:**
- `p_category_id` (BIGINT, default: NULL)
- `p_limit` (INT, default: 20)

**Zwraca:**
```sql
code_name         TEXT
suggestion_count  BIGINT
avg_confidence    REAL
min_confidence    REAL
max_confidence    REAL
```

---

### 5. **`get_import_stats()`** - Statystyki Importów

**Parametry:**
- `days` (INTEGER, default: 7)

**Zwraca:**
```sql
total_imports          BIGINT
successful_imports     BIGINT
failed_imports         BIGINT
total_rows_imported    BIGINT
avg_processing_time_ms NUMERIC
```

---

### 6. **`get_recent_imports()`** - Ostatnie Importy

**Parametry:**
- `limit_count` (INTEGER, default: 20)

**Zwraca:**
```sql
id                  UUID
file_name           TEXT
category_name       TEXT
rows_imported       INTEGER
rows_skipped        INTEGER
user_email          TEXT
status              TEXT
error_message       TEXT
file_size_kb        NUMERIC
processing_time_ms  INTEGER
created_at          TIMESTAMPTZ
```

---

## 📈 Szacunkowa Liczba Użytkowników

**Status:** Aplikacja jest **prototypem/MVP** przygotowanym do **Enterprise SaaS**.

### Obecne Wykorzystanie:
- **Użytkownicy:** 1-5 (team TGM Research)
- **Środowisko:** Development/Staging
- **Dane testowe:** ~1,000-10,000 wierszy odpowiedzi

### Potencjalna Skala (Po Uruchomieniu Production):
- **Użytkownicy:** 10-100+ (B2B SaaS, zespoły badawcze)
- **Dane:** 100,000+ odpowiedzi na klienta
- **Concurrent users:** 5-50

### Wymagania Przed Production:
1. ✅ Upgrade Supabase z Free tier → Pro/Team (migracja w toku)
2. ⚠️ Implementacja faktycznej autentykacji (Supabase Auth + RLS policies)
3. ⚠️ Zaostrzenie polityk RLS (user_id-based access)
4. ✅ Rate limiting (już zaimplementowane)
5. ✅ Security hardening (input validation, XSS protection - done)
6. ⚠️ Monitoring i logging (Sentry - częściowo wdrożone)

---

## 📦 Pełny Schemat Bazy - Export do Migracji

### Kolejność Uruchamiania Migracji SQL:

```bash
# 1. Podstawowe tabele
docs/sql/2025-categories-ui.sql          # Tabela categories
docs/sql/2025-codes-and-relations.sql    # Tabele codes + codes_categories + triggery
docs/sql/2025-answers-codes.sql          # Tabela answer_codes (relacja N:M)

# 2. Rozszerzenia tabeli answers
docs/sql/2025-answers-dashboard.sql      # Dodatkowe kolumny do tabeli answers

# 3. AI Features
docs/sql/2025-10-07-add-ai-suggestions.sql  # Kolumna ai_suggestions (JSONB) + funkcje

# 4. Import History
docs/sql/2025-file-imports-history.sql   # Tabela file_imports

# 5. Opcjonalne Optymalizacje (jeśli potrzebne)
docs/sql/2025-apply-optimizations.sql    # Indeksy i optymalizacje wydajności
docs/sql/2025-full-text-search.sql       # Full-text search (jeśli potrzebne)
```

---

## 🔄 Kroki Migracji Supabase (Free → Paid)

### 1. **Przygotowanie**
```bash
# Backup danych (wykonaj w Supabase SQL Editor)
SELECT * FROM answers INTO answers_backup_20251013;
SELECT * FROM categories INTO categories_backup_20251013;
SELECT * FROM codes INTO codes_backup_20251013;
SELECT * FROM codes_categories INTO codes_categories_backup_20251013;
```

### 2. **Export Danych**
- Supabase Dashboard → Table Editor → Export as CSV (dla każdej tabeli)
- LUB użyj: `pg_dump` (jeśli masz bezpośredni dostęp do PostgreSQL)

### 3. **Nowy Projekt (Paid Tier)**
1. Utwórz nowy projekt Supabase (Pro/Team tier)
2. Zapisz nowe credentials:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### 4. **Uruchom Migracje SQL**
1. Otwórz **SQL Editor** w nowym projekcie
2. Wykonaj pliki SQL w podanej kolejności (sekcja wyżej)
3. Sprawdź, że wszystkie tabele i funkcje zostały utworzone:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

### 5. **Import Danych**
- Supabase Dashboard → Table Editor → Import CSV
- LUB użyj: `psql` + `COPY` command

### 6. **Aktualizuj `.env`**
```env
VITE_SUPABASE_URL=https://new-project.supabase.co
VITE_SUPABASE_ANON_KEY=new_anon_key_here
```

### 7. **Testowanie**
```bash
# Uruchom aplikację lokalnie
npm run dev

# Sprawdź połączenie z nową bazą
# Przetestuj:
# - Dodawanie kategorii
# - Dodawanie kodów
# - Import pliku CSV
# - Sugestie AI
# - Filtrowanie
```

### 8. **Deployment**
```bash
# Zaktualizuj env vars w production (Vercel/Netlify)
# Redeploy aplikacji
npm run build
vercel --prod  # lub netlify deploy --prod
```

---

## 📞 Kontakt i Wsparcie

**Email:** support@tgmresearch.com
**GitHub:** https://github.com/your-org/coding-ui
**Dokumentacja:** `/Users/greglas/coding-ui/docs/`

---

## ✅ Podsumowanie dla Migracji

### Co Robi Aplikacja?
✅ **Enterprise SaaS do kategoryzacji danych badawczych z AI (GPT-4)**

### Czy Ma Własną Bazę w Supabase?
✅ **TAK** - PostgreSQL + Realtime w Supabase

### Główne Tabele:
1. ✅ **`answers`** - Odpowiedzi z badań (10k+ wierszy)
2. ✅ **`categories`** - Kategorie kodowania (10-50)
3. ✅ **`codes`** - Kody kategoryzacji (50-500)
4. ✅ **`codes_categories`** - Relacja N:M (100-1000)
5. ✅ **`answer_codes`** - Relacja N:M (10k+)
6. ✅ **`file_imports`** - Historia importów (100-1000)

### Liczba Użytkowników:
✅ **Obecne:** 1-5 (development)
✅ **Docelowe:** 10-100+ (B2B SaaS production)

---

**Gotowe do migracji! 🚀**

Jeśli masz pytania, sprawdź dokumentację w `/docs/` lub kontaktuj się z zespołem.


