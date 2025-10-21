# 🔄 Migracja z Prefiksem coui_ - Instrukcje

## 📋 Co Zostało Zmienione?

Dodałem prefiks `coui_` (Coding UI) do wszystkich tabel w bazie danych.

### ✅ Dlaczego Prefiks?

- ✅ **Unikanie konfliktów** - Nowa instancja Supabase może mieć inne projekty
- ✅ **Organizacja** - Łatwo zidentyfikować tabele należące do Coding UI
- ✅ **Best practice** - Standard w shared database environments
- ✅ **Bezpieczeństwo** - Izolacja od innych aplikacji

---

## 🔄 Mapping Nazw Tabel (Stare → Nowe)

| Stara Nazwa | Nowa Nazwa (z prefiksem) |
|-------------|--------------------------|
| `answers` | `coui_answers` |
| `categories` | `coui_categories` |
| `codes` | `coui_codes` |
| `codes_categories` | `coui_codes_categories` |
| `answer_codes` | `coui_answer_codes` |
| `file_imports` | `coui_file_imports` |

### Funkcje SQL (również z prefiksem):

| Stara Nazwa | Nowa Nazwa |
|-------------|-----------|
| `assign_whitelisted_code()` | `coui_assign_whitelisted_code()` |
| `get_high_confidence_suggestions()` | `coui_get_high_confidence_suggestions()` |
| `get_ai_suggestion_accuracy()` | `coui_get_ai_suggestion_accuracy()` |
| `get_top_ai_suggested_codes()` | `coui_get_top_ai_suggested_codes()` |
| `get_import_stats()` | `coui_get_import_stats()` |
| `get_recent_imports()` | `coui_get_recent_imports()` |

---

## 📦 Pliki SQL

### 1. **`COMPLETE_SCHEMA_WITH_PREFIX.sql`** ✅ (Nowy - Użyj tego!)

**Co zawiera:**
- Wszystkie tabele z prefiksem `coui_`
- Wszystkie funkcje z prefiksem `coui_`
- Wszystkie indeksy zaktualizowane
- Wszystkie FOREIGN KEYs zaktualizowane
- RLS policies zaktualizowane
- Triggery zaktualizowane

**Użycie:**
```sql
-- Uruchom w Supabase SQL Editor (nowy projekt):
-- Skopiuj całą zawartość COMPLETE_SCHEMA_WITH_PREFIX.sql
-- Wklej i kliknij RUN
```

### 2. **`COMPLETE_SCHEMA_FOR_MIGRATION.sql`** (Stary - BEZ prefiksu)

**Kiedy użyć:**
- Jeśli migrujesz do dedykowanej instancji tylko dla Coding UI
- Jeśli nie potrzebujesz prefiksu

---

## 🔧 Zmiany w Kodzie Aplikacji

### Krok 1: Znajdź Wszystkie Queries do Supabase

Wszystkie pliki które używają Supabase queries znajdują się w:

```
src/
├── hooks/
│   ├── useAnswersQuery.ts
│   ├── useAcceptSuggestion.ts
│   └── ...
├── api/
│   └── categorize.ts
└── components/
    ├── AnswerTable.tsx
    ├── CodingGrid/
    └── ...
```

---

### Krok 2: Zamień Nazwy Tabel (Find & Replace)

**⚠️ WAŻNE:** Rób to ostrożnie! Użyj Find & Replace z całymi słowami.

#### Opcja A: Manualna Zamiana (Zalecane)

W każdym pliku TypeScript/TSX, znajdź i zamień:

```typescript
// PRZED:
.from('answers')
.from('categories')
.from('codes')
.from('codes_categories')
.from('answer_codes')
.from('file_imports')

// PO:
.from('coui_answers')
.from('coui_categories')
.from('coui_codes')
.from('coui_codes_categories')
.from('coui_answer_codes')
.from('coui_file_imports')
```

---

#### Opcja B: Automatyczna Zamiana (Skrypt)

Stwórz skrypt `update-table-names.sh`:

```bash
#!/bin/bash

echo "🔄 Updating table names to coui_ prefix..."

# Find all .ts and .tsx files and replace table names
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s/\.from('answers')/\.from('coui_answers')/g" \
  -e "s/\.from('categories')/\.from('coui_categories')/g" \
  -e "s/\.from('codes')/\.from('coui_codes')/g" \
  -e "s/\.from('codes_categories')/\.from('coui_codes_categories')/g" \
  -e "s/\.from('answer_codes')/\.from('coui_answer_codes')/g" \
  -e "s/\.from('file_imports')/\.from('coui_file_imports')/g" \
  {} +

echo "✅ Done!"
echo ""
echo "⚠️  Please review changes with: git diff"
```

**Użycie:**
```bash
chmod +x update-table-names.sh
./update-table-names.sh
git diff  # Sprawdź zmiany
```

---

### Krok 3: Przykłady Zmian w Kodzie

#### Przykład 1: Query Hook

**PRZED:**
```typescript
// src/hooks/useAnswersQuery.ts
export function useAnswersQuery(categoryId: number) {
  return useQuery({
    queryKey: ['answers', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('answers')  // ❌ Stara nazwa
        .select('*')
        .eq('category_id', categoryId);

      if (error) throw error;
      return data;
    },
  });
}
```

**PO:**
```typescript
// src/hooks/useAnswersQuery.ts
export function useAnswersQuery(categoryId: number) {
  return useQuery({
    queryKey: ['answers', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coui_answers')  // ✅ Nowa nazwa z prefiksem
        .select('*')
        .eq('category_id', categoryId);

      if (error) throw error;
      return data;
    },
  });
}
```

---

#### Przykład 2: Mutation

**PRZED:**
```typescript
// src/hooks/useAddCategory.ts
const mutation = useMutation({
  mutationFn: async (name: string) => {
    const { data, error } = await supabase
      .from('categories')  // ❌
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
});
```

**PO:**
```typescript
// src/hooks/useAddCategory.ts
const mutation = useMutation({
  mutationFn: async (name: string) => {
    const { data, error } = await supabase
      .from('coui_categories')  // ✅
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
});
```

---

#### Przykład 3: Relacja z JOIN

**PRZED:**
```typescript
const { data, error } = await supabase
  .from('codes')
  .select(`
    *,
    codes_categories(
      category:categories(*)
    )
  `)
  .eq('id', codeId);
```

**PO:**
```typescript
const { data, error } = await supabase
  .from('coui_codes')
  .select(`
    *,
    coui_codes_categories(
      category:coui_categories(*)
    )
  `)
  .eq('id', codeId);
```

---

#### Przykład 4: RPC (SQL Functions)

**PRZED:**
```typescript
const { data, error } = await supabase
  .rpc('get_high_confidence_suggestions', {
    p_category_id: categoryId,
    p_min_confidence: 0.90,
  });
```

**PO:**
```typescript
const { data, error } = await supabase
  .rpc('coui_get_high_confidence_suggestions', {
    p_category_id: categoryId,
    p_min_confidence: 0.90,
  });
```

---

### Krok 4: Znajdź Wszystkie Wystąpienia

Użyj `grep` aby znaleźć wszystkie pliki do zmiany:

```bash
# Znajdź wszystkie użycia starych nazw tabel
grep -r "\.from('answers')" src/
grep -r "\.from('categories')" src/
grep -r "\.from('codes')" src/
grep -r "\.from('codes_categories')" src/
grep -r "\.from('answer_codes')" src/
grep -r "\.from('file_imports')" src/

# Znajdź użycia RPC
grep -r "\.rpc('get_" src/
grep -r "\.rpc('assign_" src/
```

---

## 🧪 Testowanie Po Zmianach

### 1. TypeScript Check

```bash
npm run type-check
```

**Nie powinno być błędów** - jeśli są, sprawdź czy wszystkie nazwy tabel zostały zamienione.

---

### 2. Test Lokalnie

```bash
# 1. Zaktualizuj .env z nowymi credentials (nowa instancja Supabase)
VITE_SUPABASE_URL=https://new-project.supabase.co
VITE_SUPABASE_ANON_KEY=new_key_here

# 2. Uruchom dev server
npm run dev

# 3. Sprawdź w przeglądarce
open http://localhost:5173
```

**Testy manualne:**
- [ ] Lista kategorii się wczytuje
- [ ] Dodawanie nowej kategorii działa
- [ ] Lista kodów się wczytuje
- [ ] Dodawanie nowego kodu działa
- [ ] Lista odpowiedzi się wczytuje (File Data Coding)
- [ ] Filtrowanie działa
- [ ] Import pliku CSV działa
- [ ] AI suggestions działają (jeśli masz OpenAI key)

---

### 3. Uruchom Testy E2E

```bash
npm run test:e2e
```

**Jeśli testy failują:**
- Sprawdź czy test fixtures używają starych nazw tabel
- Zaktualizuj pliki w `/e2e/` jeśli potrzeba

---

## 📋 Checklist Migracji z Prefiksem

### Przed Migracją:

- [ ] **Backup starej bazy** (uruchom `./backup-supabase.sh`)
- [ ] **Nowy projekt Supabase** (Paid tier)
- [ ] **Zapisane credentials** (URL + ANON_KEY)

### Migracja Bazy:

- [ ] **Uruchom schema** w nowym projekcie:
  ```sql
  -- Skopiuj COMPLETE_SCHEMA_WITH_PREFIX.sql
  -- Wklej w Supabase SQL Editor
  -- Run
  ```

- [ ] **Sprawdź tabele:**
  ```sql
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'coui_%';
  ```
  **Powinno pokazać 6 tabel:**
  - coui_answers
  - coui_categories
  - coui_codes
  - coui_codes_categories
  - coui_answer_codes
  - coui_file_imports

- [ ] **Import danych** (CSV lub restore z backupu do tabel z prefiksem)

### Zmiany w Kodzie:

- [ ] **Find & Replace** nazw tabel w `src/`
- [ ] **Sprawdź RPC calls** (funkcje SQL)
- [ ] **TypeScript check** (`npm run type-check`)
- [ ] **Lint check** (`npm run lint`)

### Testowanie:

- [ ] **Test lokalnie** (`npm run dev`)
- [ ] **Test kategorii** (list, add, edit, delete)
- [ ] **Test kodów** (list, add, edit, delete)
- [ ] **Test odpowiedzi** (list, filter, AI suggestions)
- [ ] **Test importu** (CSV file upload)
- [ ] **E2E tests** (`npm run test:e2e`)

### Deployment:

- [ ] **Zaktualizuj `.env` production** (Vercel/Netlify)
- [ ] **Redeploy** (`vercel --prod` lub `netlify deploy --prod`)
- [ ] **Test production** (sprawdź czy wszystko działa)
- [ ] **Monitor logs** (Supabase Dashboard → Logs)

---

## 🔍 Grep Commands (Do Sprawdzenia)

Użyj tych komend aby sprawdzić czy wszystkie wystąpienia zostały zamienione:

```bash
# Sprawdź czy WSZYSTKIE stare nazwy zostały zamienione (powinno zwrócić 0)
echo "Checking for OLD table names (should be 0):"
grep -r "\.from('answers')" src/ | wc -l
grep -r "\.from('categories')" src/ | wc -l
grep -r "\.from('codes')" src/ | wc -l
grep -r "\.from('codes_categories')" src/ | wc -l
grep -r "\.from('answer_codes')" src/ | wc -l
grep -r "\.from('file_imports')" src/ | wc -l

echo ""
echo "Checking for NEW table names (should be >0):"
grep -r "\.from('coui_answers')" src/ | wc -l
grep -r "\.from('coui_categories')" src/ | wc -l
grep -r "\.from('coui_codes')" src/ | wc -l
```

---

## 🆘 Troubleshooting

### Problem: "relation coui_answers does not exist"

**Rozwiązanie:**
1. Sprawdź czy schema został uruchomiony w Supabase
2. Sprawdź czy używasz poprawnych credentials (.env)
3. Sprawdź w Supabase Dashboard → Table Editor czy tabele istnieją

---

### Problem: "function coui_get_high_confidence_suggestions does not exist"

**Rozwiązanie:**
1. Sprawdź czy funkcje zostały utworzone:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name LIKE 'coui_%';
   ```
2. Jeśli nie ma, uruchom ponownie schema SQL

---

### Problem: "Cannot read properties of null"

**Rozwiązanie:**
1. Sprawdź czy dane zostały zaimportowane
2. Sprawdź liczby wierszy:
   ```sql
   SELECT COUNT(*) FROM coui_answers;
   SELECT COUNT(*) FROM coui_categories;
   ```
3. Jeśli 0, zaimportuj dane z CSV lub backupu

---

### Problem: Testy E2E failują

**Rozwiązanie:**
1. Zaktualizuj test fixtures w `/e2e/`
2. Sprawdź czy testy używają starych nazw tabel
3. Uruchom pojedynczy test:
   ```bash
   npx playwright test workflow-1-category-management.spec.ts --debug
   ```

---

## 📞 Pomoc

**Dokumentacja:**
- `MIGRATION_CHECKLIST.md` - Step-by-step migration
- `DATABASE_SCHEMA_DIAGRAM.md` - Schema z prefiksem
- `BACKUP_INSTRUKCJE.md` - Backup i restore

**Kontakt:**
- 📧 Email: support@tgmresearch.com
- 🐛 GitHub: https://github.com/your-org/coding-ui/issues

---

## ✅ Podsumowanie

### Masz 2 opcje migracji:

#### Opcja 1: Z Prefiksem (Zalecane dla shared Supabase)
✅ Użyj: `COMPLETE_SCHEMA_WITH_PREFIX.sql`
✅ Zaktualizuj kod: Zamień nazwy tabel
✅ Best practice: Organizacja i bezpieczeństwo

#### Opcja 2: Bez Prefiksu (Dedykowana instancja)
✅ Użyj: `COMPLETE_SCHEMA_FOR_MIGRATION.sql`
✅ Kod bez zmian
✅ Prostsze: Brak refactoringu kodu

---

**Wybierz opcję 1 jeśli:**
- Nowa instancja Supabase będzie używana przez inne projekty
- Chcesz best practice i organizację
- Nie masz problemu z refactoringiem kodu

**Wybierz opcję 2 jeśli:**
- Nowa instancja jest dedykowana TYLKO dla Coding UI
- Chcesz uniknąć zmian w kodzie
- Migrujesz szybko bez refactoringu

---

**Gotowe! Powodzenia z migracją z prefiksem! 🚀**

