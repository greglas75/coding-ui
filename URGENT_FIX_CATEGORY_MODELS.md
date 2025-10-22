# 🚨 URGENT: Fix Category Model Saving

## Problem

Po uruchomieniu migracji SQL nadal nie zapisują się modele AI w edycji kategorii.

## Debug Steps

### 1. Sprawdź strukturę tabeli w Supabase

Uruchom w Supabase SQL Editor:

```sql
-- Sprawdź czy kolumny modeli AI istnieją
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name IN (
    'model', 'openai_model', 'claude_model', 'gemini_model',
    'vision_model', 'llm_preset', 'gpt_template',
    'sentiment_enabled', 'sentiment_mode'
  )
ORDER BY column_name;
```

### 2. Sprawdź dane w konsoli

Po kliknięciu "Save" w edycji kategorii, sprawdź w konsoli:

1. **Payload** - czy zawiera wybrany model:

   ```
   📤 Saving category payload: { model: "gpt-4o-mini", ... }
   ```

2. **Update result** - czy Supabase zwraca dane:

   ```
   ✅ Update successful: [{ id: 1, model: "gpt-4o-mini", ... }]
   ```

3. **Błędy** - czy są jakieś błędy:
   ```
   ❌ Supabase error: { message: "...", details: "..." }
   ```

### 3. Jeśli kolumny nie istnieją

Uruchom w Supabase SQL Editor:

```sql
-- Dodaj wszystkie brakujące kolumny
ALTER TABLE categories ADD COLUMN IF NOT EXISTS openai_model TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS claude_model TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS gemini_model TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS vision_model TEXT DEFAULT 'gemini-2.5-flash-lite';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS llm_preset TEXT DEFAULT 'LLM Proper Name';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS gpt_template TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sentiment_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sentiment_mode TEXT DEFAULT 'smart';
```

### 4. Test po naprawie

1. Odśwież stronę (F5)
2. Idź do Categories
3. Edytuj kategorię
4. Zmień model AI
5. Kliknij "Save & Close"
6. Sprawdź w konsoli czy:
   - Payload zawiera model
   - Update successful
   - Brak błędów

## Status

- ✅ **Kod naprawiony** - dodałem debugowanie
- ⚠️ **Baza danych** - sprawdź czy kolumny istnieją
- 🧪 **Test** - sprawdź konsolę po zapisie

## Co sprawdzić w konsoli:

1. **Czy payload zawiera model?**
2. **Czy update successful?**
3. **Czy są błędy Supabase?**

Napisz mi co widzisz w konsoli po kliknięciu "Save"!
