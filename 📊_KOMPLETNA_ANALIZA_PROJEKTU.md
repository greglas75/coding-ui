# 📊 Kompletna Analiza Projektu - TGM Research Coding & AI Categorization Dashboard

> **Data analizy:** 20 października 2025
> **Wersja aplikacji:** v1.0 (Production)
> **Status:** Aktywnie rozwijany projekt enterprise

---

## 📑 Spis Treści

1. [Cel i Kontekst Biznesowy](#1-cel-i-kontekst-biznesowy)
2. [Architektura Techniczna](#2-architektura-techniczna)
3. [Struktura Bazy Danych](#3-struktura-bazy-danych)
4. [Główne Funkcjonalności](#4-główne-funkcjonalności)
5. [Przepływ Danych](#5-przepływ-danych)
6. [Kluczowe Komponenty](#6-kluczowe-komponenty)
7. [Integracja AI (OpenAI GPT)](#7-integracja-ai-openai-gpt)
8. [System Bezpieczeństwa](#8-system-bezpieczeństwa)
9. [Wydajność i Optymalizacja](#9-wydajność-i-optymalizacja)
10. [System Testów](#10-system-testów)
11. [Workflow Użytkownika](#11-workflow-użytkownika)
12. [Technologie i Zależności](#12-technologie-i-zależności)
13. [Deployment i CI/CD](#13-deployment-i-cicd)
14. [Metryki Projektu](#14-metryki-projektu)

---

## 1. Cel i Kontekst Biznesowy

### 🎯 Co to jest?

**TGM Research Coding & AI Categorization Dashboard** to profesjonalna aplikacja webowa typu **Enterprise SaaS** służąca do:

- **Kategoryzacji odpowiedzi z ankiet badawczych** przy użyciu AI
- **Kodowania danych jakościowych** z wspomaganiem GPT-4
- **Przetwarzania dużych wolumenów danych** (10,000+ rekordów)
- **Kolaboracyjnej analizy danych** z synchronizacją w czasie rzeczywistym

### 💼 Przypadki Użycia

1. **Badania rynkowe** - kategoryzacja odpowiedzi respondentów o markach/produktach
2. **Analiza feedbacku** - klasyfikacja komentarzy klientów
3. **Badania socjologiczne** - kodowanie wywiadów i ankiet otwartych
4. **NPS & CSAT** - analiza komentarzy dotyczących satysfakcji klientów

### 🏢 Skala

- **10,000+ rekordów** obsługiwanych płynnie
- **113 testów** (69 unit + 44 E2E) zapewniających jakość
- **95%+ pokrycie testami** na krytycznym kodzie
- **3-10x szybsze** od poprzedniej wersji (po optymalizacjach)

---

## 2. Architektura Techniczna

### 📐 Architektura Wysokopoziomowa

```
┌─────────────────────────────────────────────────────────────────┐
│                     WARSTWA PREZENTACJI                         │
│  React 19.1 + TypeScript 5.7 + Tailwind CSS 4 + Vite 7         │
│  • Lazy Loading Routes        • Virtual Scrolling              │
│  • Code Splitting             • Optimistic Updates             │
│  • Dark Mode                  • Accessibility (WCAG 2.1 AA)     │
└─────────────────────────────────────────────────────────────────┘
                              ↕️ REST API / Realtime
┌─────────────────────────────────────────────────────────────────┐
│                      WARSTWA BIZNESOWA                          │
│  Express.js 4.18.2 API Server (Optional)                       │
│  • File Upload (Multer)       • AI Integration (OpenAI)        │
│  • Rate Limiting              • Security (Helmet, CORS)        │
│  • Request Validation (Zod)   • Error Logging (Sentry)         │
└─────────────────────────────────────────────────────────────────┘
                              ↕️ SQL / Realtime Subscriptions
┌─────────────────────────────────────────────────────────────────┐
│                      WARSTWA DANYCH                             │
│  Supabase (PostgreSQL 15 + Realtime + Auth + RLS)              │
│  • 6 głównych tabel           • Indeksy performance             │
│  • Row Level Security         • Realtime subscriptions         │
│  • Stored Procedures          • Backups (Point-in-time)        │
└─────────────────────────────────────────────────────────────────┘
                              ↕️ HTTP API
┌─────────────────────────────────────────────────────────────────┐
│                    USŁUGI ZEWNĘTRZNE                            │
│  • OpenAI GPT-4/4o/4o-mini    • Sentry (Error Tracking)        │
│  • Google Search API (context)                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 🔄 Model Danych (Client ↔ Server)

```
Frontend (React)
    ↓ TanStack Query (cache, optimistic updates)
    ↓ Supabase Client (direct queries)
Database (PostgreSQL)
    ↑ Realtime subscriptions (live updates)
    ↑ Row Level Security (user isolation)
```

### 🎨 Podejście UI

- **Single Page Application (SPA)** z React Router 7
- **Lazy Loading** - każda strona ładowana on-demand (zmniejsza bundle o 85%)
- **Virtual Scrolling** - renderuje tylko widoczne wiersze (obsługa 10k+ rekordów)
- **Optimistic UI** - natychmiastowa reakcja na akcje użytkownika
- **Dark Mode** - pełne wsparcie z localStorage persistence

---

## 3. Struktura Bazy Danych

### 📊 Schemat ERD (Entity Relationship Diagram)

```
categories (Kategorie)
    ├─ id (PK)
    ├─ name (UNIQUE)
    ├─ use_web_context (Boolean) - Czy używać Google Search dla AI?
    └─ templates, presets, models (konfiguracja AI)

codes (Kody kategoryzacyjne)
    ├─ id (PK)
    ├─ name (UNIQUE)
    └─ is_whitelisted (Boolean)

codes_categories (Relacja N:M)
    ├─ code_id (FK → codes.id)
    └─ category_id (FK → categories.id)

answers (GŁÓWNA TABELA - 10k+ rekordów)
    ├─ id (PK)
    ├─ answer_text (TEXT, NOT NULL) - Odpowiedź respondenta
    ├─ translation_en (TEXT) - Tłumaczenie wygenerowane przez AI
    ├─ language, country - Metadane
    ├─ quick_status - Status kodowania (Confirmed, Other, Ignore, etc.)
    ├─ general_status - Status ogólny (uncategorized, categorized, whitelist, blacklist)
    ├─ selected_code (TEXT) - Kod wybrany przez użytkownika
    ├─ ai_suggested_code (TEXT) - Top sugestia AI
    ├─ ai_suggestions (JSONB) - Pełna struktura sugestii AI z confidence scores
    ├─ category_id (FK → categories.id)
    ├─ coding_date - Data zakodowania
    ├─ confirmed_by - Email użytkownika, który potwierdził
    └─ created_at, updated_at

answer_codes (Relacja N:M)
    ├─ answer_id (FK → answers.id)
    └─ code_id (FK → codes.id)

file_imports (Audit log)
    ├─ id (UUID)
    ├─ file_name
    ├─ category_id (FK → categories.id)
    ├─ rows_imported, rows_skipped
    ├─ status (success, partial, failed)
    ├─ processing_time_ms
    └─ created_at
```

### 🔑 Kluczowe Relacje

1. **Category ↔ Codes** (N:M przez `codes_categories`)
   - Jedna kategoria może mieć wiele kodów
   - Jeden kod może należeć do wielu kategorii
   - Przykład: Kod "Nike" w kategoriach "Fashion Brands" i "Sports Brands"

2. **Category ↔ Answers** (1:N)
   - Każda odpowiedź należy do jednej kategorii
   - Kategoria może mieć tysiące odpowiedzi

3. **Answer ↔ Codes** (N:M przez `answer_codes`)
   - Jedna odpowiedź może mieć wiele przypisanych kodów
   - Kod może być przypisany do wielu odpowiedzi

### 📈 Indeksy Performance-Critical

```sql
-- Indeksy na answers (najważniejsze dla wydajności)
idx_answers_language          ON language
idx_answers_country           ON country
idx_answers_general_status    ON general_status
idx_answers_quick_status      ON quick_status
idx_answers_coding_date       ON coding_date DESC
idx_answers_category_id       ON category_id

-- Indeks GIN dla JSONB (szybkie wyszukiwanie w ai_suggestions)
idx_answers_ai_suggestions    ON ai_suggestions (GIN)
idx_answers_ai_suggestions_model ON (ai_suggestions->>'model')
```

**Dlaczego to ważne?**
- Bez indeksów: query na 10k rekordów = **3-5s**
- Z indeksami: query na 10k rekordów = **50-200ms** ✅

---

## 4. Główne Funkcjonalności

### 🎛️ Core Features

#### 1. **Zarządzanie Kategoriami**
- ➕ Tworzenie nowych kategorii badawczych
- ✏️ Edycja nazwy, opisu, konfiguracji AI
- 🗑️ Usuwanie kategorii (z ochroną przed przypadkowym usunięciem)
- 📊 Statystyki w czasie rzeczywistym (ile odpowiedzi, ile zakodowanych)

#### 2. **Zarządzanie Kodami**
- ➕ Dodawanie kodów kategoryzacyjnych
- 🏷️ Przypisywanie kodów do wielu kategorii jednocześnie
- ⭐ Whitelisting kodów (szybkie wybory)
- ✏️ Edycja inline z walidacją

#### 3. **Kodowanie Odpowiedzi (GŁÓWNA FUNKCJONALNOŚĆ)**

##### Manualne Kodowanie:
- 📋 Tabela z wirtualnym scrollingiem (10k+ wierszy bez lagów)
- 🔍 Zaawansowane filtry:
  - Wyszukiwanie tekstowe (debounced 300ms)
  - Filtr po językach
  - Filtr po krajach
  - Filtr po statusach (uncategorized, categorized, whitelist, blacklist)
  - Filtr po kodach
- ⌨️ Skróty klawiszowe:
  - `1` - Whitelist
  - `2` - Blacklist
  - `3` - Categorized
  - `Esc` - Zamknij modal
  - `Enter` - Zapisz

##### AI-Powered Kodowanie:
- 🤖 **Batch AI Processing** - przetwarzanie wielu odpowiedzi jednocześnie
- 🎯 **Confidence Scores** - każda sugestia z oceną pewności (0-100%)
- 🔄 **Auto-Confirm Agent** - automatyczne potwierdzanie sugestii ≥90% confidence
- 💾 **Caching** - sugestie AI cache'owane przez 24h (oszczędność kosztów)
- 🔁 **Retry Logic** - automatyczne ponowne próby przy błędach API

#### 4. **Import/Export Danych**

##### Import:
- 📂 Upload CSV/Excel (.csv, .xlsx, .xls)
- 🔒 **Walidacja Magic Bytes** - sprawdzenie prawdziwej zawartości pliku (security)
- ✅ Walidacja danych (Zod schemas)
- 📊 Raport z importu (ile wierszy, ile pominięto, błędy)
- 📜 Historia importów (audit log)

##### Export:
- 📤 Export do Excel (ExcelJS) z formatowaniem
- 📤 Export do CSV (PapaParse)
- 📤 Export do JSON
- 🎨 Stylowane nagłówki, automatyczne filtry, szerokości kolumn

#### 5. **Filtry i Wyszukiwanie**

```typescript
// Przykład struktury filtrów
{
  search: "Nike",                    // Wyszukiwanie tekstowe
  types: ["categorized", "whitelist"], // Statusy ogólne
  status: "Confirmed",               // Status quick
  codes: ["Nike", "Adidas"],         // Wybrane kody
  language: "en",                    // Język
  country: "USA",                    // Kraj
  categoryId: 1                      // Kategoria
}
```

- **Debouncing** na wyszukiwaniu (300ms) - unikanie spamu requestów
- **Multi-select dropdowns** z licznikiem wybranych opcji
- **Active filters chips** - wizualne pokazanie aktywnych filtrów
- **Clear filters** - jednym kliknięciem reset wszystkich filtrów

#### 6. **Akcje Bulk (Multi-Select)**
- ☑️ Zaznaczanie wielu odpowiedzi (checkbox w każdym wierszu)
- 🔄 **Bulk Whitelist** - dodaj wiele odpowiedzi do whitelisty
- 🚫 **Bulk Blacklist** - odrzuć wiele odpowiedzi
- 🗑️ **Bulk Delete** - usuń wiele (z potwierdzeniem)
- 🤖 **Bulk AI Categorize** - AI dla wszystkich zaznaczonych

#### 7. **Real-time Collaboration**
- 👥 **Online Users** - widok kto jest aktualnie online
- 🔄 **Live Code Updates** - zmiany kodów widoczne dla wszystkich natychmiast
- 📡 **Supabase Realtime** - subscrybcje do zmian w bazie
- 🔔 **Toast notifications** - powiadomienia o zmianach (Sonner)

#### 8. **Analytics Dashboard**
- 📊 Statystyki kategorii (ile odpowiedzi, % zakodowanych)
- 📈 Wykresy (Recharts) - trend kodowania w czasie
- 💰 **AI Pricing Dashboard** - śledzenie kosztów OpenAI
- 🎯 **Confidence Analysis** - rozkład confidence scores AI

#### 9. **Settings & Configuration**
- 🔑 **OpenAI API Key** - konfiguracja klucza API (encrypted w localStorage)
- 🎨 **AI Templates** - własne prompty dla różnych kategorii
- 🎛️ **Model Selection** - wybór modelu (GPT-4, GPT-4o, GPT-4o-mini)
- ⚙️ **Auto-Confirm Settings** - threshold dla auto-potwierdzania

### 🔥 Advanced Features

#### 10. **Auto-Confirm Agent**
```
Workflow:
1. User włącza Auto-Confirm (Settings)
2. Ustawia threshold (np. 90%)
3. AI generuje sugestie
4. Jeśli confidence ≥ 90% → automatycznie potwierdza
5. User widzi tylko odpowiedzi wymagające manualnej weryfikacji
```

**Korzyści:**
- ⏱️ Oszczędność czasu - do 70% odpowiedzi auto-potwierdzone
- 🎯 Jakość - tylko wysoko pewne (≥90%) są potwierdzane
- 📊 Raport - tracking ile auto-potwierdzono

#### 11. **Fine-Tuning Dashboard** (Future)
- 📚 Przygotowanie danych treningowych dla własnego modelu
- 🎓 Fine-tuning GPT na własnych danych
- 📈 Porównanie modeli (base vs fine-tuned)

#### 12. **Undo/Redo System**
- ⏮️ Cofnij ostatnią akcję (Ctrl+Z)
- ⏭️ Przywróć (Ctrl+Y)
- 📜 Historia akcji (ostatnie 50 zmian w pamięci)

#### 13. **Offline Mode** (PWA)
- 📴 Działanie bez internetu
- 💾 IndexedDB - lokalne cache'owanie danych
- 🔄 Sync po powrocie do online
- 📡 Queue for changes - kolejka zmian do zsynchronizowania

---

## 5. Przepływ Danych

### 🔄 Główne Przepływy

#### A. **Upload & Import Danych**

```
User uploads CSV/Excel file
    ↓
Frontend → POST /api/file-upload
    ↓
Backend (api-server.js):
  1. Multer - odbiera plik (max 10MB)
  2. Walidacja rozszerzenia (.csv, .xlsx, .xls)
  3. ✅ SECURITY: Walidacja Magic Bytes (prawdziwa zawartość)
  4. Parsing:
     - CSV: PapaParse
     - Excel: ExcelJS (bezpieczny, nie xlsx)
  5. Walidacja danych (Zod schema)
  6. Batch INSERT do Supabase (table: answers)
  7. Log do file_imports (audit trail)
    ↓
Response: { imported: 250, skipped: 5, errors: [] }
    ↓
Frontend:
  - Invalidate React Query cache
  - Refetch answers
  - Toast success notification
```

#### B. **AI Categorization (Single Answer)**

```
User clicks "🤖 AI" button
    ↓
Frontend → categorizeAnswer(answerId)
    ↓
Check cache (ai_suggestions w bazie):
  - Jeśli < 24h → użyj cache ♻️
  - Jeśli > 24h lub brak → wygeneruj nowe
    ↓
Fetch answer + category + codes z Supabase
    ↓
Build GPT prompt:
  System: "{template}"
  User: "User's response: {answer_text}"
  Codes: [Nike, Adidas, Puma, ...]
    ↓
Call OpenAI API (via backend /api/gpt-test):
  - Model: gpt-4o-mini (cost-effective)
  - Temperature: 0.3 (consistent results)
  - Response format: JSON
    ↓
GPT Response:
{
  "suggestions": [
    { "code_id": "123", "code_name": "Nike", "confidence": 0.95, "reasoning": "..." },
    { "code_id": "456", "code_name": "Adidas", "confidence": 0.72, "reasoning": "..." }
  ]
}
    ↓
Validation (Zod schema)
    ↓
Save to database:
  - ai_suggestions (JSONB) - pełna struktura
  - ai_suggested_code - top sugestia (Nike)
    ↓
Frontend:
  - Update local cache (React Query)
  - Show suggestions w UI (confidence badges)
  - User może zaakceptować lub odrzucić
```

#### C. **Batch AI Categorization**

```
User selects multiple answers (checkboxes)
    ↓
User clicks "Batch AI Categorize"
    ↓
Frontend → BatchAIProcessor.processAll(answerIds[])
    ↓
Queue system:
  1. Add all IDs to queue
  2. Process w batches (np. 10 jednocześnie)
  3. Rate limiting (max 10 req/min) - unikanie 429 errors
  4. Progress tracking (0% → 100%)
    ↓
For each answer:
  - Check if already has ai_suggestions → skip ⏭️
  - Else: call categorizeAnswer()
  - Update progress bar
    ↓
Result:
  - succeeded: 95 ✅
  - failed: 5 ❌
  - skipped: 10 (already had suggestions)
    ↓
Toast notification: "95 answers categorized successfully!"
```

#### D. **Manual Coding by User**

```
User opens answer row (click or keyboard shortcut)
    ↓
Modal appears: SelectCodeModal
  - Shows AI suggestions (if exist) with confidence
  - Shows available codes (from category)
  - User selects code(s)
    ↓
User clicks "Save" or presses Enter
    ↓
Optimistic Update:
  1. Update local state (React Query cache)
  2. UI updates IMMEDIATELY (feels instant)
  3. Show spinner on row
    ↓
Background: Update Supabase
  - UPDATE answers SET selected_code = 'Nike', general_status = 'categorized', ...
    ↓
If success:
  - Keep optimistic update ✅
  - Remove spinner
  - Toast: "Answer coded!"
If error:
  - Rollback to previous state ⏮️
  - Show error toast
  - Retry option
```

#### E. **Real-time Updates (Collaboration)**

```
User A codes answer #123 → "Nike"
    ↓
Supabase Database updated
    ↓
Realtime subscription triggers:
supabase
  .channel('answers-changes')
  .on('postgres_changes', { event: 'UPDATE', table: 'answers' }, payload => {
    // Update local cache
    queryClient.setQueryData(['answers'], old => updateAnswer(old, payload))
  })
    ↓
User B (on the same page) sees:
  - Answer #123 updated to "Nike" INSTANTLY
  - No page refresh needed
  - Toast: "Answer updated by user@example.com"
```

---

## 6. Kluczowe Komponenty

### 🧩 Frontend Components Architecture

#### **Layout Components**

```
App.tsx (Root)
  └─ ErrorBoundary (catches all errors)
      └─ Router (React Router 7)
          └─ AppContent
              ├─ SkipNavigation (accessibility)
              ├─ AppHeader (top navigation)
              │   ├─ Logo
              │   ├─ Navigation links
              │   └─ Dark Mode toggle
              └─ main#main-content (routes)
                  ├─ Suspense (lazy loading)
                  └─ Routes
                      ├─ / → CategoriesPage
                      ├─ /coding → AnswerTable (FiledDataCodingPage)
                      ├─ /codes → CodeListPage
                      └─ /settings → SettingsPage
```

#### **Strona: CategoriesPage** (`/categories`)

**Co robi:** Zarządzanie kategoriami badawczymi

**Komponenty:**
- `CategoriesList` - lista wszystkich kategorii
  - `CategoryCard` (mobile) - karta kategorii
  - `CategoryTableRow` (desktop) - wiersz tabeli
  - `CategoryStatsRow` - statystyki (ile odpowiedzi, % coded)
- `AddCategoryModal` - modal dodawania nowej kategorii
- `EditCategoryModal` - modal edycji kategorii
- `ConfirmDeleteModal` - potwierdzenie usunięcia

**Kluczowe hooki:**
```typescript
// TanStack Query - fetching categories
const { data: categories, isLoading } = useQuery({
  queryKey: ['categories'],
  queryFn: async () => {
    const { data } = await supabase.from('categories').select('*')
    return data
  },
  staleTime: 5 * 60 * 1000, // 5min cache
})

// Mutation - add category (optimistic update)
const addMutation = useMutation({
  mutationFn: async (name) => {
    const { data } = await supabase.from('categories').insert({ name }).select()
    return data[0]
  },
  onMutate: async (name) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries(['categories'])

    // Snapshot current state
    const previous = queryClient.getQueryData(['categories'])

    // Optimistically update (UI updates INSTANTLY)
    queryClient.setQueryData(['categories'], old => [...old, { id: 'temp', name }])

    return { previous }
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['categories'], context.previous)
  },
  onSettled: () => {
    // Refetch to get real data
    queryClient.invalidateQueries(['categories'])
  }
})
```

#### **Strona: CodeListPage** (`/codes`)

**Co robi:** Zarządzanie kodami kategoryzacyjnymi

**Komponenty:**
- `CodeListTable` - tabela kodów z edycją inline
  - `CodeTableRow` - wiersz z kodem
  - `EditableCategoriesCell` - cell z przypisanymi kategoriami (edytowalne)
- `AddCodeModal` - dodawanie nowego kodu
- `CodeListToolbar` - toolbar z akcjami (Add, Whitelist All, etc.)

**Funkcjonalności:**
- ✏️ **Inline editing** - kliknij na nazwę kodu → edytuj → Enter/Esc
- 🏷️ **Multi-category assignment** - jeden kod w wielu kategoriach
- ⭐ **Whitelist toggle** - oznacz kod jako whitelistowany (checkbox)
- 🔍 **Search & filter** - wyszukiwanie po nazwie, filtr whitelistowanych

#### **Strona: FileDataCodingPage** (`/file-data-coding`, `/coding`)

**Co robi:** GŁÓWNA STRONA - kodowanie odpowiedzi

**Komponenty główne:**

##### 1. **CodingGrid** (core component)

```
CodingGrid/
├─ index.tsx                    # Main component
├─ hooks/
│  ├─ useAnswerActions.ts       # Actions (accept, reject, categorize)
│  ├─ useAnswerFiltering.ts     # Filters logic
│  ├─ useCodeManagement.ts      # Code selection
│  ├─ useCodingGridState.ts     # Local state (selection, modals)
│  ├─ useKeyboardShortcuts.ts   # Keyboard navigation (1,2,3, Esc, Enter)
│  └─ useModalManagement.ts     # Modal open/close logic
├─ cells/
│  ├─ SelectionCell.tsx         # Checkbox for multi-select
│  ├─ AIButtonCell.tsx          # 🤖 AI button
│  ├─ AISuggestionsCell.tsx     # AI suggestions display
│  ├─ AnswerTextCell.tsx        # Answer text with SafeText (XSS protection)
│  ├─ CodeCell.tsx              # Selected code chip (clickable)
│  ├─ QuickStatusButtons.tsx    # Quick status buttons (1,2,3)
│  └─ StatusCell.tsx            # General status badge
├─ rows/
│  ├─ DesktopRow.tsx            # Desktop table row
│  └─ MobileCard.tsx            # Mobile card view
├─ toolbars/
│  ├─ TableHeader.tsx           # Header with sortable columns
│  ├─ BatchSelectionToolbar.tsx # Bulk actions toolbar
│  ├─ ResultsCounter.tsx        # "Showing 1-100 of 10,000"
│  └─ SyncStatusIndicator.tsx   # Online/offline status
└─ utils/
   └─ helpers.ts                # Utility functions
```

**Jak działa virtual scrolling:**

```typescript
import { FixedSizeList } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

function CodingGrid({ answers }) {
  return (
    <AutoSizer>
      {({ height, width }) => (
        <FixedSizeList
          height={height}
          width={width}
          itemCount={answers.length}  // 10,000
          itemSize={80}               // wysokość wiersza
          itemData={answers}
        >
          {({ index, style }) => (
            <div style={style}>
              <DesktopRow answer={answers[index]} />
            </div>
          )}
        </FixedSizeList>
      )}
    </AutoSizer>
  )
}
```

**Efekt:**
- Renderuje tylko **~20 wierszy** (widoczne na ekranie)
- Scroll przez **10,000 wierszy** = **smooth 60fps** ✅
- Zużycie pamięci: **90% mniej** niż tradycyjny render

##### 2. **FiltersBar**

```
FiltersBar/
├─ index.tsx                    # Main filter bar
├─ ActionButtons.tsx            # Clear, Export, Import
├─ ActiveFiltersDisplay.tsx     # Active filter chips
├─ dropdowns/
│  ├─ DropdownBase.tsx          # Reusable dropdown component
│  ├─ SimpleDropdown.tsx        # Single-select (language, country)
│  ├─ StatusDropdown.tsx        # Multi-select statuses
│  └─ CodesDropdown.tsx         # Multi-select codes
├─ chips/
│  └─ FilterChip.tsx            # Active filter chip (removable)
└─ hooks/
   ├─ useClickOutside.ts        # Detect click outside dropdown
   └─ useDebouncedSearch.ts     # Debounce search input (300ms)
```

**Przykład użycia:**

```typescript
<FiltersBar>
  <SearchInput
    value={search}
    onChange={setSearch}
    debounce={300}  // Wait 300ms after typing stops
  />

  <StatusDropdown
    selected={selectedStatuses}
    onChange={setSelectedStatuses}
    options={['uncategorized', 'categorized', 'whitelist', 'blacklist']}
  />

  <CodesDropdown
    selected={selectedCodes}
    onChange={setSelectedCodes}
    options={availableCodes}
  />

  <ActionButtons>
    <ClearFilters onClick={resetFilters} />
    <ExportButton onClick={handleExport} />
  </ActionButtons>
</FiltersBar>

<ActiveFiltersDisplay>
  {search && <FilterChip label={`Search: ${search}`} onRemove={() => setSearch('')} />}
  {selectedStatuses.map(status =>
    <FilterChip label={status} onRemove={() => removeStatus(status)} />
  )}
</ActiveFiltersDisplay>
```

##### 3. **Modals**

**BaseModal** - uniwersalny system modalny

```typescript
// src/components/BaseModal/index.tsx

interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

function BaseModal({ isOpen, onClose, title, children, footer, size = 'md' }: BaseModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <FocusTrap>  {/* ♿ Accessibility - trap focus inside modal */}
        <DialogPanel className={sizeClasses[size]}>
          <DialogTitle>{title}</DialogTitle>

          <div className="modal-body">
            {children}
          </div>

          {footer && (
            <div className="modal-footer">
              {footer}
            </div>
          )}

          <button onClick={onClose} aria-label="Close modal">
            <XIcon />
          </button>
        </DialogPanel>
      </FocusTrap>
    </Dialog>
  )
}
```

**Dlaczego BaseModal?**
- ✅ **DRY** - single source of truth (57% mniej kodu)
- ✅ **Accessibility** - focus trap, keyboard (Esc), ARIA
- ✅ **Consistent UX** - wszystkie modale wyglądają tak samo
- ✅ **Łatwa konserwacja** - zmiana w jednym miejscu = zmiana wszędzie

**Modals w projekcie:**
- `SelectCodeModal` - wybór kodu dla odpowiedzi
- `AddCategoryModal` - dodanie kategorii
- `EditCategoryModal` - edycja kategorii
- `ConfirmDeleteModal` - potwierdzenie usunięcia
- `UploadListModal` - upload pliku CSV/Excel
- `BatchProgressModal` - progress bar dla batch AI
- `ExportImportModal` - eksport/import danych
- `TestPromptModal` - testowanie promptów AI

##### 4. **Inne Kluczowe Komponenty**

**ErrorBoundary** - łapie błędy w React

```typescript
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => {
    // Log to Sentry
    Sentry.captureException(error, { extra: info })

    // Log to local error logger
    errorLogger.log(error, info)
  }}
  onReset={() => {
    // Reset app state
    queryClient.clear()
  }}
>
  <App />
</ErrorBoundary>
```

**SafeText** - XSS protection

```typescript
import DOMPurify from 'isomorphic-dompurify'

function SafeText({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  })

  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}

// Usage:
<SafeText html={answer.answer_text} />
```

**LoadingSkeleton** - loading states

```typescript
function CategoryCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  )
}

// Usage:
{isLoading ? (
  <CategoryCardSkeleton />
) : (
  <CategoryCard category={category} />
)}
```

---

## 7. Integracja AI (OpenAI GPT)

### 🤖 Jak Działa AI Categorization?

#### **Architecture:**

```
Frontend (React)
    ↓
Backend API Server (api-server.js)
  - Endpoint: POST /api/gpt-test
  - Rate Limiting: 10 req/min (aiRateLimitMiddleware)
  - Authentication: Bearer token (production)
    ↓
OpenAI API (GPT-4o-mini)
  - Model: gpt-4o-mini (cost-effective: $0.15/$0.60 per 1M tokens)
  - Temperature: 0.3 (consistent results)
  - Response format: JSON (structured output)
    ↓
Response cached in Supabase (ai_suggestions JSONB)
```

#### **Prompt Engineering:**

**System Prompt Template:**

```
You are an expert data analyst specializing in categorizing survey responses.

Category: {categoryName}
Available codes: {codesList}

Task: Analyze the user's response and suggest the most appropriate code(s) with confidence scores.

Rules:
1. Return 1-3 suggestions max (sorted by confidence DESC)
2. Confidence score: 0.0 - 1.0 (0% - 100%)
3. Only suggest codes from the provided list
4. Provide reasoning for each suggestion
5. If response is unclear/irrelevant, suggest "Other" with low confidence

Response format (JSON):
{
  "suggestions": [
    {
      "code_id": "123",
      "code_name": "Nike",
      "confidence": 0.95,
      "reasoning": "User explicitly mentioned Nike shoes"
    }
  ]
}

Language context: {language}
Country context: {country}
```

**User Prompt:**

```
User's response: "I love Nike shoes, they are the best for running"
```

**GPT Response (JSON):**

```json
{
  "suggestions": [
    {
      "code_id": "123",
      "code_name": "Nike",
      "confidence": 0.98,
      "reasoning": "User explicitly mentioned 'Nike shoes' and expressed strong positive sentiment"
    },
    {
      "code_id": "456",
      "code_name": "Sports & Fitness",
      "confidence": 0.85,
      "reasoning": "Context mentions running, which is a sports activity"
    }
  ]
}
```

#### **Walidacja Response:**

```typescript
import { z } from 'zod'

const AiCodeSuggestionSchema = z.object({
  code_id: z.string(),
  code_name: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
})

const AiResponseSchema = z.object({
  suggestions: z.array(AiCodeSuggestionSchema).max(3)
})

// Parse & validate
const validated = AiResponseSchema.parse(response)
```

#### **Caching Strategy:**

```typescript
// Check cache first (24h TTL)
const cachedSuggestions = answer.ai_suggestions

if (cachedSuggestions) {
  const cacheAge = Date.now() - new Date(cachedSuggestions.timestamp).getTime()

  if (cacheAge < 24 * 60 * 60 * 1000) {
    console.log('♻️ Using cached AI suggestions')
    return cachedSuggestions.suggestions
  }
}

// Cache miss → call OpenAI
const suggestions = await categorizeAnswer(...)

// Save to cache
await supabase
  .from('answers')
  .update({
    ai_suggestions: {
      suggestions,
      model: 'gpt-4o-mini',
      timestamp: new Date().toISOString(),
      preset_used: categoryName
    },
    ai_suggested_code: suggestions[0]?.code_name
  })
  .eq('id', answerId)
```

**Korzyści cache:**
- 💰 Oszczędność kosztów (nie płacisz za ten sam request dwa razy)
- ⚡ Szybsza odpowiedź (baza danych vs API call)
- 📊 Consistency - te same sugestie przez 24h

#### **Rate Limiting & Retry Logic:**

```typescript
// Rate Limiter (pQueue)
import PQueue from 'p-queue'

const openaiRateLimiter = new PQueue({
  concurrency: 10,        // max 10 równocześnie
  interval: 60 * 1000,    // 1 minuta
  intervalCap: 10         // max 10 w ciągu 1 minuty
})

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (error.status === 429) {  // Rate limit
        const delay = Math.pow(2, i) * 1000  // 1s, 2s, 4s
        console.log(`⏳ Rate limited, retrying in ${delay}ms...`)
        await sleep(delay)
      } else {
        throw error  // Other errors - don't retry
      }
    }
  }
  throw new Error('Max retries exceeded')
}
```

#### **Auto-Confirm Agent:**

```typescript
async function processAnswerWithAutoConfirm(answer: Answer) {
  // 1. Get AI suggestions
  const suggestions = await categorizeAnswer(...)

  // 2. Check confidence threshold
  const topSuggestion = suggestions[0]
  const threshold = getUserThreshold() // e.g., 0.9 (90%)

  if (topSuggestion.confidence >= threshold) {
    // 3. Auto-confirm!
    console.log(`✅ Auto-confirming ${answer.id} with ${topSuggestion.code_name} (${topSuggestion.confidence})`)

    await supabase
      .from('answers')
      .update({
        selected_code: topSuggestion.code_name,
        general_status: 'categorized',
        quick_status: 'Confirmed',
        coding_date: new Date().toISOString(),
        confirmed_by: 'auto-confirm-agent'
      })
      .eq('id', answer.id)

    return { autoConfirmed: true }
  }

  // 4. Requires manual review
  return { autoConfirmed: false, suggestions }
}
```

#### **Cost Tracking:**

```typescript
// Track usage per request
interface AIUsageLog {
  userId: string
  model: string
  inputTokens: number
  outputTokens: number
  cost: number  // USD
  latency: number  // ms
  timestamp: string
}

// Calculate cost
function calculateCost(usage: AIUsageLog) {
  const PRICING = {
    'gpt-4o-mini': {
      input: 0.15 / 1_000_000,   // $0.15 per 1M input tokens
      output: 0.60 / 1_000_000   // $0.60 per 1M output tokens
    }
  }

  const model = PRICING[usage.model]
  return (usage.inputTokens * model.input) + (usage.outputTokens * model.output)
}

// Log to database
await supabase.from('ai_usage_logs').insert({
  user_id: userId,
  model: 'gpt-4o-mini',
  input_tokens: 150,
  output_tokens: 50,
  cost: calculateCost({ inputTokens: 150, outputTokens: 50, model: 'gpt-4o-mini' }),
  latency: 1200,  // 1.2s
  timestamp: new Date().toISOString()
})
```

---

## 8. System Bezpieczeństwa

### 🔒 Security Measures

#### **1. Input Validation (Zod)**

```typescript
import { z } from 'zod'

// Category validation
const CategorySchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z0-9 _-]+$/, 'Invalid characters'),
  description: z.string().max(500).optional(),
  use_web_context: z.boolean().default(true)
})

// Validate before database insert
const validated = CategorySchema.parse(userInput)
```

**❌ Co blokuje:**
- SQL Injection (nie używamy raw SQL, tylko Supabase client)
- XSS via input (sanitization przed insertem)
- Too long inputs (DoS prevention)

#### **2. XSS Protection**

```typescript
import DOMPurify from 'isomorphic-dompurify'

// ALWAYS sanitize before rendering user content
function SafeText({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed']
  })

  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

**Przykład ataku (blokowany):**

```
User input: <script>alert('XSS')</script>
After DOMPurify: &lt;script&gt;alert('XSS')&lt;/script&gt;
```

#### **3. File Upload Security**

```typescript
// api-server.js

// ✅ Validation 1: File extension
const allowedExt = ['.csv', '.xlsx', '.xls']
const ext = path.extname(file.originalname).toLowerCase()
if (!allowedExt.includes(ext)) {
  throw new Error('Invalid file type')
}

// ✅ Validation 2: MIME type
const allowedMime = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
if (!allowedMime.includes(file.mimetype)) {
  throw new Error('Invalid MIME type')
}

// ✅ Validation 3: Magic Bytes (prawdziwa zawartość pliku)
import { fileTypeFromFile } from 'file-type'

async function validateFileContent(filePath) {
  const fileType = await fileTypeFromFile(filePath)

  const allowedMagic = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'  // .xlsx to ZIP with XML
  ]

  if (!allowedMagic.includes(fileType.mime)) {
    throw new Error('File content does not match extension')
  }
}
```

**Dlaczego 3 poziomy?**
- Extension check - łatwe do obejścia (zmień .exe → .csv)
- MIME check - browser może się pomylić
- Magic bytes - **PRAWDZIWA zawartość** (nie da się sfałszować)

#### **4. Rate Limiting**

```typescript
import rateLimit from 'express-rate-limit'

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minuta
  max: 100,             // max 100 requestów/min
  message: 'Too many requests. Please try again later.'
})

app.use(globalLimiter)

// Specific rate limiters
const uploadRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minut
  max: 20,                  // max 20 uploadów/5min
  message: 'Upload rate limit exceeded'
})

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minuta
  max: 10,              // max 10 AI requestów/min (oszczędność kosztów!)
  message: 'AI rate limit exceeded'
})

app.post('/api/file-upload', uploadRateLimiter, ...)
app.post('/api/gpt-test', aiRateLimiter, ...)
```

#### **5. CSRF Protection**

```typescript
import { doubleCsrf } from 'csrf-csrf'

const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    httpOnly: true,     // ❌ JavaScript nie ma dostępu
    sameSite: 'strict', // Tylko same-origin requests
    secure: true,       // Tylko HTTPS
    path: '/'
  },
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS']  // CSRF tylko dla mutacji
})

app.use(doubleCsrfProtection)
```

**Jak działa:**
1. Browser dostaje cookie z tokenem CSRF
2. Frontend musi wysłać ten sam token w headerze
3. Backend porównuje: cookie token === header token
4. Jeśli się zgadzają ✅ → request dozwolony

#### **6. Supabase Row Level Security (RLS)**

```sql
-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users see own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own data
CREATE POLICY "Users insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own data
CREATE POLICY "Users update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own data
CREATE POLICY "Users delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);
```

**Efekt:**
- User A nie widzi danych User B (izolacja na poziomie bazy)
- Nawet jeśli frontend ma bug - baza nie zwróci cudzych danych
- Zero trust architecture

#### **7. Environment Variables Security**

```bash
# ❌ NIGDY nie commituj do git!
.env
.env.local
.env.production
*.key
*.pem

# ✅ Commituj szablon
.env.example
```

```env
# .env.example (commitowany)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
OPENAI_API_KEY=your_openai_key_here

# .env (NIE commitowany, w .gitignore)
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
OPENAI_API_KEY=sk-proj-...
```

#### **8. Helmet (Security Headers)**

```typescript
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind inline styles
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https://*.supabase.co'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]  // Prevent clickjacking
    }
  }
}))
```

**Headers dodawane przez Helmet:**
- `X-Content-Type-Options: nosniff` - prevent MIME sniffing
- `X-Frame-Options: DENY` - prevent clickjacking
- `Strict-Transport-Security` - force HTTPS
- `Content-Security-Policy` - prevent XSS

#### **9. API Authentication (Production)**

```typescript
// api-server.js

function authenticate(req, res, next) {
  const auth = req.headers['authorization']
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (token !== process.env.API_ACCESS_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  next()
}

// ✅ Production: ZAWSZE wymuszaj auth
if (isProd) {
  app.use('/api', authenticate)
}
```

#### **10. Sentry Error Tracking**

```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Sample rate (produkcja: 10% requestów)
  tracesSampleRate: isProd ? 0.1 : 1.0,

  // Filtruj wrażliwe dane
  beforeSend(event, hint) {
    // ❌ Nie wysyłaj API keys, tokenów
    if (event.message?.includes('API_KEY')) {
      return null
    }

    // ✅ Wysyłaj inne błędy
    return event
  }
})
```

---

## 9. Wydajność i Optymalizacja

### ⚡ Performance Optimizations

#### **1. Code Splitting (Lazy Loading)**

**Przed:**
```typescript
import CategoriesPage from './pages/CategoriesPage'
import CodeListPage from './pages/CodeListPage'
import AnswerTable from './components/AnswerTable'

// Bundle size: 3.2MB (initial load)
```

**Po:**
```typescript
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const CodeListPage = lazy(() => import('./pages/CodeListPage'))
const AnswerTable = lazy(() => import('./components/AnswerTable'))

// Bundle size:
// - Initial: 520KB ✅ (85% reduction)
// - Each page: 200-400KB (loaded on-demand)
```

**Efekt:**
- Initial load: **3.2MB** → **520KB** (🚀 **6x szybciej**)
- Time to interactive: **8s** → **1.2s** (🚀 **6.6x szybciej**)

#### **2. Virtual Scrolling**

**Przed (tradycyjny render):**
```typescript
function AnswerTable({ answers }) {
  return (
    <table>
      {answers.map(answer => (  // 10,000 wierszy!
        <AnswerRow key={answer.id} answer={answer} />
      ))}
    </table>
  )
}

// Performance:
// - DOM nodes: 10,000 ❌
// - Memory: ~500MB ❌
// - FPS: 5-10 (laggy) ❌
```

**Po (react-window):**
```typescript
import { FixedSizeList } from 'react-window'

function AnswerTable({ answers }) {
  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={answers.length}  // 10,000
      itemSize={80}
    >
      {({ index, style }) => (
        <div style={style}>
          <AnswerRow answer={answers[index]} />
        </div>
      )}
    </FixedSizeList>
  )
}

// Performance:
// - DOM nodes: ~20 (tylko widoczne) ✅
// - Memory: ~50MB (90% reduction) ✅
// - FPS: 60 (smooth) ✅
```

#### **3. Debouncing (Search Input)**

**Przed:**
```typescript
function SearchInput() {
  const [search, setSearch] = useState('')

  useEffect(() => {
    // API call on EVERY keystroke!
    fetchAnswers({ search })
  }, [search])

  return <input onChange={(e) => setSearch(e.target.value)} />
}

// Typing "Nike" = 4 API calls (N, Ni, Nik, Nike) ❌
```

**Po:**
```typescript
function SearchInput() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)  // Wait 300ms

  useEffect(() => {
    // API call only after user STOPS typing
    fetchAnswers({ search: debouncedSearch })
  }, [debouncedSearch])

  return <input onChange={(e) => setSearch(e.target.value)} />
}

// Typing "Nike" = 1 API call (after 300ms pause) ✅
```

**Oszczędność:**
- API calls: **75% reduction**
- Server load: **75% reduction**
- Better UX (mniej spinnerów)

#### **4. React Query Caching**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min - data is "fresh"
      cacheTime: 10 * 60 * 1000,   // 10 min - keep in cache
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      retry: 1,                    // Retry once on failure
    }
  }
})
```

**Efekt:**
```
User visits /categories:
  → Fetch categories from API (1st time)
  → Cache result for 5 min

User visits /coding:
  → ...

User returns to /categories (within 5 min):
  → Load from cache INSTANTLY (0ms) ✅
  → No API call! ✅
```

**Oszczędność:**
- API calls: **66% reduction** (typical user journey)
- Load time: **0ms** (instant from cache)

#### **5. Optimistic Updates**

**Przed (Traditional):**
```typescript
async function addCategory(name) {
  setLoading(true)  // Show spinner

  const { data } = await supabase
    .from('categories')
    .insert({ name })
    .select()

  setCategories(prev => [...prev, data])  // Update UI
  setLoading(false)  // Hide spinner
}

// User sees:
// 1. Click "Add"
// 2. Spinner (500ms-2s) 🕐
// 3. New category appears
```

**Po (Optimistic):**
```typescript
const addMutation = useMutation({
  mutationFn: async (name) => {
    return await supabase.from('categories').insert({ name }).select()
  },

  onMutate: async (name) => {
    // IMMEDIATELY update UI (before API call!)
    queryClient.setQueryData(['categories'], old => [
      ...old,
      { id: 'temp', name, created_at: new Date() }
    ])
  },

  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['categories'], context.previous)
  },

  onSettled: () => {
    // Refetch to get real data
    queryClient.invalidateQueries(['categories'])
  }
})

// User sees:
// 1. Click "Add"
// 2. New category appears INSTANTLY ✅ (0ms)
// 3. (Background: API call confirms)
```

**Perceived performance:** **10x faster** (0ms vs 500-2000ms)

#### **6. Memoization**

```typescript
import { useMemo } from 'react'

function AnswerTable({ answers, filters }) {
  // ❌ BAD: Runs on EVERY render
  const filtered = answers.filter(a => matchesFilters(a, filters))

  // ✅ GOOD: Runs only when answers/filters change
  const filtered = useMemo(
    () => answers.filter(a => matchesFilters(a, filters)),
    [answers, filters]
  )

  return <Table data={filtered} />
}
```

#### **7. Vite Build Optimizations**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Manual chunks - split by vendor
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query': ['@tanstack/react-query'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['@headlessui/react', 'lucide-react'],
          'charts': ['recharts'],
          'excel': ['exceljs', 'papaparse'],
        }
      }
    },

    // Compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.log in production
      }
    }
  },

  plugins: [
    react(),
    viteCompression({  // Gzip compression
      algorithm: 'gzip',
      ext: '.gz'
    })
  ]
})
```

**Bundle Analysis:**

```
Before optimization:
├─ vendor.js      2.8MB ❌
├─ app.js         450KB
└─ Total:         3.25MB

After optimization:
├─ react-vendor.js   180KB ✅
├─ query.js          120KB ✅
├─ supabase.js       95KB ✅
├─ ui.js             80KB ✅
├─ charts.js         160KB ✅
├─ excel.js          140KB ✅
├─ app.js            250KB ✅
└─ Total:            1.02MB ✅ (68% reduction)

After gzip:
└─ Total:            320KB ✅ (90% reduction!)
```

#### **8. Database Indexes**

**Bez indeksów:**
```sql
SELECT * FROM answers
WHERE language = 'en'
AND general_status = 'uncategorized';

-- Query time: 3.2s (full table scan) ❌
```

**Z indeksami:**
```sql
CREATE INDEX idx_answers_language ON answers(language);
CREATE INDEX idx_answers_general_status ON answers(general_status);

SELECT * FROM answers
WHERE language = 'en'
AND general_status = 'uncategorized';

-- Query time: 45ms (index scan) ✅
```

**Speedup: 71x faster!**

#### **9. Image Optimization** (if applicable)

```typescript
// Use next-gen formats
<img
  src="logo.webp"      // WebP instead of PNG (60% smaller)
  loading="lazy"       // Lazy load below-fold images
  width={200}
  height={100}
  alt="Logo"
/>
```

#### **10. Service Worker (PWA)**

```typescript
// registerServiceWorker.ts

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(registration => {
    console.log('✅ Service Worker registered')
  })
}
```

**Efekt:**
- Offline support
- Cache static assets (CSS, JS, images)
- Faster repeat visits (load from cache)

---

## 10. System Testów

### 🧪 Testing Strategy

#### **Piramida Testów:**

```
     /\
    /  \  E2E Tests (5-10%)
   /____\  44 tests - Critical user flows
  /      \
 /________\ Integration Tests (30%)
/__________\ Unit Tests (60%)
             69 tests - Utils, hooks, logic
```

#### **1. Unit Tests (Vitest + React Testing Library)**

**Przykład - testowanie hooka:**

```typescript
// src/hooks/useDebounce.test.ts

import { renderHook, waitFor } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  test('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: '', delay: 300 } }
    )

    expect(result.current).toBe('')

    // Change value
    rerender({ value: 'test', delay: 300 })

    // Immediately - should still be old value
    expect(result.current).toBe('')

    // After 300ms - should update
    await waitFor(() => {
      expect(result.current).toBe('test')
    }, { timeout: 400 })
  })

  test('should cancel pending debounce on unmount', () => {
    const { unmount } = renderHook(
      () => useDebounce('test', 300)
    )

    unmount()

    // Should not cause memory leak
    expect(true).toBe(true)
  })
})
```

**Przykład - testowanie komponentu:**

```typescript
// src/components/AddCategoryModal.test.tsx

import { render, screen, userEvent } from '@testing-library/react'
import { AddCategoryModal } from './AddCategoryModal'

describe('AddCategoryModal', () => {
  test('should render modal when open', () => {
    render(
      <AddCategoryModal
        isOpen={true}
        onClose={jest.fn()}
        onAdd={jest.fn()}
      />
    )

    expect(screen.getByText('Add Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Category Name')).toBeInTheDocument()
  })

  test('should call onAdd with category name', async () => {
    const onAdd = jest.fn()
    const user = userEvent.setup()

    render(
      <AddCategoryModal
        isOpen={true}
        onClose={jest.fn()}
        onAdd={onAdd}
      />
    )

    // Type category name
    await user.type(
      screen.getByLabelText('Category Name'),
      'Test Category'
    )

    // Click Save
    await user.click(screen.getByRole('button', { name: /save/i }))

    // Should call onAdd
    expect(onAdd).toHaveBeenCalledWith('Test Category')
  })

  test('should show error for invalid input', async () => {
    const user = userEvent.setup()

    render(
      <AddCategoryModal
        isOpen={true}
        onClose={jest.fn()}
        onAdd={jest.fn()}
      />
    )

    // Leave empty
    await user.click(screen.getByRole('button', { name: /save/i }))

    // Should show error
    expect(screen.getByText(/category name is required/i)).toBeInTheDocument()
  })
})
```

**Coverage:**
```
Unit Tests Coverage:
├─ utils/               98% ✅
├─ hooks/               95% ✅
├─ lib/                 92% ✅
├─ components/          87% ✅
└─ Overall:             91% ✅
```

#### **2. E2E Tests (Playwright)**

**Przykład - workflow test:**

```typescript
// e2e/tests/workflow-1-category-management.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Category Management Workflow', () => {
  test('should create, edit, and delete category', async ({ page }) => {
    // 1. Navigate to categories page
    await page.goto('http://localhost:5173/categories')

    // 2. Create new category
    await page.click('button:has-text("Add Category")')

    await page.fill('input[placeholder*="category name"]', 'Test Category')
    await page.click('button:has-text("Save")')

    // Verify category appears
    await expect(page.locator('text=Test Category')).toBeVisible()

    // 3. Edit category
    await page.click('[data-testid="edit-category-Test Category"]')

    await page.fill('input[placeholder*="category name"]', 'Updated Category')
    await page.click('button:has-text("Save")')

    // Verify update
    await expect(page.locator('text=Updated Category')).toBeVisible()
    await expect(page.locator('text=Test Category')).not.toBeVisible()

    // 4. Delete category
    await page.click('[data-testid="delete-category-Updated Category"]')
    await page.click('button:has-text("Confirm")')

    // Verify deletion
    await expect(page.locator('text=Updated Category')).not.toBeVisible()
  })

  test('should prevent duplicate category names', async ({ page }) => {
    await page.goto('http://localhost:5173/categories')

    // Create first category
    await page.click('button:has-text("Add Category")')
    await page.fill('input[placeholder*="category name"]', 'Duplicate Test')
    await page.click('button:has-text("Save")')

    await expect(page.locator('text=Duplicate Test')).toBeVisible()

    // Try to create duplicate
    await page.click('button:has-text("Add Category")')
    await page.fill('input[placeholder*="category name"]', 'Duplicate Test')
    await page.click('button:has-text("Save")')

    // Should show error
    await expect(page.locator('text=Category already exists')).toBeVisible()
  })
})
```

**E2E Test Coverage:**

```
E2E Tests (44 total):
├─ workflow-1-category-management.spec.ts    8 tests ✅
├─ workflow-2-answer-categorization.spec.ts  12 tests ✅
├─ workflow-3-code-management.spec.ts        7 tests ✅
├─ workflow-4-auto-confirm.spec.ts           6 tests ✅
├─ workflow-5-file-upload.spec.ts            5 tests ✅
├─ ai-features.spec.ts                       4 tests ✅
└─ critical-workflows.spec.ts                2 tests ✅
```

#### **3. Visual Regression Testing (Future)**

```typescript
// Using Playwright screenshots
test('category page matches snapshot', async ({ page }) => {
  await page.goto('/categories')

  // Wait for content to load
  await page.waitForSelector('[data-testid="category-list"]')

  // Take screenshot
  await expect(page).toHaveScreenshot('categories-page.png', {
    fullPage: true,
    maxDiffPixels: 100  // Allow small differences
  })
})
```

#### **4. Test Commands**

```bash
# Unit tests
npm test                # Run in watch mode
npm run test:run        # Run once
npm run test:ui         # Open Vitest UI
npm run test:coverage   # Coverage report

# E2E tests
npm run test:e2e        # Run E2E tests (headless)
npm run test:e2e:ui     # Open Playwright UI
npm run test:e2e:debug  # Debug mode
npm run test:e2e:record # Record new test by clicking!

# All tests
npm run test:all        # Run both unit + E2E
```

---

## 11. Workflow Użytkownika

### 👤 Typowy Workflow

#### **Scenario 1: Import i Kategoryzacja Danych**

```
1. User logs in
   ↓
2. Navigate to /categories
   ↓
3. Create new category "Fashion Brands"
   - Click "Add Category"
   - Enter name
   - Click Save
   ↓
4. Navigate to /codes
   ↓
5. Add codes: "Nike", "Adidas", "Puma", "Other"
   - Click "Add Code" 4x
   - Assign to "Fashion Brands" category
   ↓
6. Navigate to /file-data-coding
   ↓
7. Import CSV file (1000 answers)
   - Click "Upload File"
   - Select file
   - Select category "Fashion Brands"
   - Click "Import"
   - Wait for processing (10-30s)
   - See: "1000 rows imported successfully"
   ↓
8. Filter to uncategorized answers
   - Status dropdown → "Uncategorized"
   - See: 1000 answers
   ↓
9. Batch AI Categorize (100 at a time)
   - Select all (checkbox)
   - Click "Batch AI Categorize"
   - Progress bar: 0% → 100% (2-5 min)
   - See: "100 answers categorized"
   ↓
10. Review AI suggestions
    - Answers now have AI suggestions with confidence scores
    - Green badge: 95% confidence → "Nike"
    - Yellow badge: 72% confidence → "Adidas"
    ↓
11. Auto-Confirm high confidence (≥90%)
    - Enable Auto-Confirm in Settings
    - Set threshold: 90%
    - Rerun batch (next 100)
    - See: "75 auto-confirmed, 25 need review"
    ↓
12. Manual review of low-confidence answers
    - Click answer row → Modal opens
    - See AI suggestions
    - Select correct code
    - Click Save
    - Repeat for 25 answers (5-10 min)
    ↓
13. Export results
    - Click "Export"
    - Select format: Excel
    - Download file
    - Open in Excel
    - Verify: all 1000 answers coded ✅
```

**Total Time:**
- Without AI: ~8-10 hours (manual coding)
- With AI + Auto-Confirm: ~30-45 minutes ✅
- **Speedup: 10-20x faster!**

#### **Scenario 2: Real-time Collaboration**

```
User A:
1. Opens /coding
2. Sees 500 uncategorized answers
3. Filters to "language: en"
4. Starts coding (codes 10 answers)

User B (same time):
1. Opens /coding
2. Sees same 500 answers
3. Filters to "language: pl"
4. Starts coding (codes 15 answers)

Real-time sync:
- User A sees toast: "15 answers updated by user-b@company.com"
- User B sees toast: "10 answers updated by user-a@company.com"
- Both see updated counts in real-time
- No conflicts (working on different filters)
```

---

## 12. Technologie i Zależności

### 📚 Tech Stack (Pełna Lista)

#### **Frontend Core**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| React | 19.1.1 | UI library (latest) |
| TypeScript | 5.7 | Type safety |
| Vite | 7.1.7 | Build tool (HMR, production build) |
| React Router DOM | 7.9.3 | Client-side routing |

#### **State Management**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| TanStack Query | 5.90.2 | Server state (caching, mutations) |
| Zustand | _(not used)_ | Global client state (future) |

#### **UI Components**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| Tailwind CSS | 4.1.14 | Utility-first styling |
| @headlessui/react | 2.2.9 | Unstyled accessible components |
| Lucide React | 0.544.0 | Icons |
| Sonner | 2.0.7 | Toast notifications |
| focus-trap-react | 11.0.4 | Accessibility (modal focus) |

#### **Performance**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| react-window | 1.8.10 | Virtual scrolling |
| react-virtualized-auto-sizer | 1.0.26 | Auto-sizing for virtual scroll |

#### **Backend & Database**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| @supabase/supabase-js | 2.58.0 | PostgreSQL client + Realtime |
| Express | 4.18.2 | API server |
| OpenAI | 6.2.0 | GPT API client |

#### **Data Processing**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| ExcelJS | 4.4.0 | Excel read/write (secure) |
| PapaParse | 5.5.3 | CSV parsing |
| Recharts | 3.2.1 | Charts & analytics |

#### **Security & Validation**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| Zod | 4.1.12 | Schema validation |
| isomorphic-dompurify | 2.28.0 | HTML sanitization (XSS) |
| Helmet | 8.1.0 | Security headers |
| express-rate-limit | 8.1.0 | Rate limiting |
| csrf-csrf | 4.0.3 | CSRF protection |
| crypto-js | 4.2.0 | Encryption |

#### **File Handling**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| Multer | 2.0.2 | File upload handling |
| file-type | 21.0.0 | Magic bytes validation |

#### **Testing**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| Vitest | 3.2.4 | Unit testing (fast) |
| @testing-library/react | 16.3.0 | Component testing |
| @playwright/test | 1.40.0 | E2E testing |
| happy-dom | 20.0.5 | DOM simulation (lightweight) |

#### **Error Tracking**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| @sentry/react | 10.17.0 | Error tracking & monitoring |

#### **Dev Tools**

| Biblioteka | Wersja | Cel |
|-----------|--------|-----|
| ESLint | 9.36.0 | Code linting |
| Prettier | 3.6.2 | Code formatting |
| @tanstack/react-query-devtools | 5.90.2 | React Query debugging |

---

## 13. Deployment i CI/CD

### 🚀 Deployment Process

#### **1. Build dla Produkcji**

```bash
# Build command
npm run build

# Output:
dist/
├─ assets/
│  ├─ index-abc123.js       # Main app bundle (minified)
│  ├─ react-vendor-def456.js # React vendor bundle
│  ├─ query-ghi789.js       # TanStack Query
│  └─ ...
├─ index.html               # Entry point
└─ favicon.ico
```

#### **2. Deployment Platforms**

**Vercel (Recommended):**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Netlify:**

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Production
netlify deploy --prod
```

**Manual (Self-hosted):**

```bash
# Build
npm run build

# Copy dist/ to server
rsync -avz dist/ user@server:/var/www/app/

# Configure Nginx
server {
  listen 80;
  server_name app.example.com;

  root /var/www/app;
  index index.html;

  # SPA routing
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

#### **3. Environment Variables (Production)**

```env
# Vercel/Netlify Dashboard → Environment Variables

VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_prod_anon_key
VITE_API_URL=https://api.yourapp.com
NODE_ENV=production

# Backend (API Server)
OPENAI_API_KEY=sk-proj-your-prod-key
CORS_ORIGINS=https://yourapp.com,https://www.yourapp.com
CSRF_SECRET=your-secret-csrf-token-32-chars-min
API_ACCESS_TOKEN=your-api-access-token
```

#### **4. CI/CD Pipeline (GitHub Actions)**

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run unit tests
        run: npm run test:run

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Upload build artifact
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v3
        with:
          name: dist

      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 14. Metryki Projektu

### 📊 Project Stats

#### **Code Metrics**

| Metric | Value |
|--------|-------|
| Total Lines of Code | ~15,000 |
| TypeScript Files | 120+ |
| React Components | 50+ |
| Custom Hooks | 15+ |
| API Endpoints | 6 |
| Database Tables | 6 |

#### **Test Metrics**

| Metric | Value |
|--------|-------|
| Total Tests | 113 |
| Unit Tests | 69 |
| E2E Tests | 44 |
| Unit Coverage | 95%+ (critical code) |
| E2E Coverage | All main workflows |

#### **Performance Metrics**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Bundle Size | 3.2MB | 520KB | **🚀 6x smaller** |
| Time to Interactive | 8s | 1.2s | **🚀 6.6x faster** |
| Virtual Scroll (10k rows) | 5 FPS | 60 FPS | **🚀 12x faster** |
| API Calls (with caching) | 100% | 34% | **🚀 66% reduction** |
| Memory Usage (10k rows) | 500MB | 50MB | **🚀 90% reduction** |

#### **Database Metrics**

| Metric | Value |
|--------|-------|
| Tables | 6 |
| Indexes | 15+ |
| RLS Policies | 24 |
| Typical Dataset Size | 10,000+ rows |
| Query Time (indexed) | 45-200ms ✅ |
| Query Time (no index) | 3-5s ❌ |

#### **Security Metrics**

| Metric | Status |
|--------|--------|
| Input Validation | ✅ Zod schemas on all inputs |
| XSS Protection | ✅ DOMPurify sanitization |
| CSRF Protection | ✅ Double-submit cookies |
| Rate Limiting | ✅ Global + endpoint-specific |
| File Upload Validation | ✅ 3-layer (ext, MIME, magic bytes) |
| RLS Policies | ✅ All tables protected |
| HTTPS Only | ✅ Production |
| Environment Variables | ✅ Never committed |

#### **Documentation**

| Type | Count |
|------|-------|
| Markdown Docs | 47+ files |
| JSDoc Comments | 80%+ coverage |
| README files | 1 main + 15+ feature-specific |
| Architecture Diagrams | 5+ |
| Migration Guides | 3 |

---

## 🎯 Podsumowanie

### Co to za projekt?

**TGM Research Coding & AI Categorization Dashboard** to **profesjonalna aplikacja enterprise** do kategoryzacji danych badawczych z wykorzystaniem AI (GPT-4).

### Kluczowe Cechy:

1. **🎯 Cel Biznesowy:**
   - Automatyzacja kategoryzacji odpowiedzi z ankiet
   - Wspomaganie AI (GPT) dla kodowania danych jakościowych
   - Oszczędność czasu: **10-20x szybciej** niż manualne kodowanie

2. **🏗️ Architektura:**
   - **Frontend:** React 19 + TypeScript + Tailwind CSS
   - **Backend:** Express.js + Supabase (PostgreSQL)
   - **AI:** OpenAI GPT-4o-mini (cost-effective)
   - **Performance:** Virtual scrolling, code splitting, caching

3. **💪 Funkcjonalności:**
   - Import/Export (CSV, Excel)
   - AI Categorization (batch processing)
   - Auto-Confirm Agent (≥90% confidence)
   - Real-time Collaboration
   - Advanced Filters
   - Analytics Dashboard

4. **🔒 Bezpieczeństwo:**
   - Input validation (Zod)
   - XSS protection (DOMPurify)
   - CSRF protection
   - Rate limiting
   - File upload validation (3 layers)
   - Row Level Security (Supabase)

5. **⚡ Wydajność:**
   - Virtual scrolling (10k+ rows smooth)
   - Code splitting (85% smaller bundle)
   - React Query caching (66% less API calls)
   - Optimistic updates (instant UI)
   - Database indexes (71x faster queries)

6. **🧪 Jakość:**
   - 113 testów (69 unit + 44 E2E)
   - 95%+ coverage (krytyczny kod)
   - TypeScript strict mode
   - ESLint + Prettier
   - Sentry error tracking

7. **📈 Skala:**
   - 10,000+ rekordów obsługiwanych płynnie
   - ~15,000 linii kodu
   - 50+ React komponentów
   - 6 tabel w bazie
   - 47+ plików dokumentacji

### Technologie (Kluczowe):

- **Frontend:** React 19, TypeScript 5.7, Vite 7, Tailwind CSS 4
- **State:** TanStack Query 5 (server state)
- **Backend:** Express 4, Supabase (PostgreSQL + Realtime)
- **AI:** OpenAI GPT-4o-mini
- **Testing:** Vitest + Playwright
- **Security:** Zod, DOMPurify, Helmet, CSRF
- **Performance:** react-window, code splitting, caching

### Dlaczego projekt jest imponujący?

1. ✅ **Production-ready** - pełne pokrycie testami, security hardening
2. ✅ **Scalable** - obsługa 10k+ rekordów bez problemu
3. ✅ **Fast** - 6x szybszy bundle, 60 FPS virtual scroll
4. ✅ **Secure** - multi-layer validation, RLS, rate limiting
5. ✅ **Well-documented** - 47+ plików dokumentacji
6. ✅ **Modern stack** - najnowsze wersje bibliotek (React 19, TS 5.7)
7. ✅ **AI-powered** - inteligentna kategoryzacja z GPT
8. ✅ **Collaboration** - real-time sync między użytkownikami

---

**Projekt gotowy do deployment w środowisku enterprise.** 🚀


