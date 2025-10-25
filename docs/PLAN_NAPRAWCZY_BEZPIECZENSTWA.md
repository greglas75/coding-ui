# 🔒 PLAN NAPRAWCZY BEZPIECZEŃSTWA - ASAP
**Data:** 19 października 2025
**Aplikacja:** Research Data Categorization App
**Status:** KRYTYCZNY - Wymaga natychmiastowej akcji

---

## 📊 PODSUMOWANIE WYKONAWCZE

### Ogólna Ocena: **WYSOKIE RYZYKO** 🔴

**Znalezione problemy:**
- 🔴 **2 KRYTYCZNE** - Wymagają akcji w ciągu 24h
- 🟠 **7 WYSOKIE** - Muszą być naprawione przed wdrożeniem
- 🔶 **12 ŚREDNIE** - Do naprawy w ciągu miesiąca
- 🟢 **8 NISKIE** - Planowe usprawnienia

**Aktualny stan:**
```
✅ .env NIE jest w repozytorium git (dobra wiadomość)
❌ npm audit: 2 CVE (1 critical, 1 high)
❌ Wszystkie zabezpieczenia API są WYŁĄCZONE:
   - ENABLE_API_AUTH ❌ nie ustawione
   - ENABLE_CSRF ❌ nie ustawione
   - ENABLE_RATE_LIMIT ❌ nie ustawione
❌ Polityki RLS w Supabase całkowicie OTWARTE
❌ Klucz OpenAI widoczny w przeglądarce (VITE_OPENAI_API_KEY)
```

---

## 🚨 FAZA 1: NATYCHMIASTOWA (DZIŚ - max 4h)

### Priorytet 1.1: Napraw podatności w zależnościach ⏱️ 10 min

**Problem:**
- `happy-dom@20.0.0` - CRITICAL CVE-1109004
- `xlsx@0.18.5` - HIGH CVE-1108110, CVE-1108111

**Rozwiązanie:**
```bash
# Krok 1: Zaktualizuj pakiety
npm install xlsx@latest
npm install happy-dom@latest --save-dev

# Krok 2: Weryfikuj
npm audit

# Oczekiwany wynik: 0 critical, 0 high
```

**Weryfikacja:**
```bash
npm audit | grep "vulnerabilities"
# Powinno pokazać: "found 0 vulnerabilities"
```

---

### Priorytet 1.2: Włącz zabezpieczenia API ⏱️ 5 min

**Problem:** Wszystkie zabezpieczenia są wyłączone

**Rozwiązanie - Zaktualizuj `.env`:**
```bash
# Dodaj na końcu pliku .env:
ENABLE_API_AUTH=true
ENABLE_CSRF=true
ENABLE_RATE_LIMIT=true
ENABLE_CSP=true
STRICT_UPLOAD_VALIDATION=true

# Ustaw CORS (zmień na swoje domeny)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Wygeneruj token API (tylko jeśli nie masz)
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_ACCESS_TOKEN=WYGENERUJ_LOSOWY_TOKEN_64_ZNAKOWY
```

**Weryfikacja:**
```bash
# Uruchom serwer
npm run dev:full

# W innym terminalu:
curl http://localhost:3001/api/health
# Powinno wymagać tokena
```

---

### Priorytet 1.3: Usuń klucz OpenAI z frontendu ⏱️ 30 min

**Problem:** `VITE_OPENAI_API_KEY` jest widoczny w przeglądarce

**Rozwiązanie:**

**Krok 1: Usuń klucz z .env frontendu**
```bash
# W .env usuń lub zakomentuj:
# VITE_OPENAI_API_KEY=...

# Zostaw tylko:
OPENAI_API_KEY=twoj_klucz_tutaj
```

**Krok 2: Usuń plik src/lib/openai.ts**
```bash
# ❌ Ten plik eksponuje API key
rm src/lib/openai.ts
```

**Krok 3: Znajdź wszystkie miejsca używające openai.ts**
```bash
grep -r "from.*openai" src/ --include="*.ts" --include="*.tsx"
```

**Krok 4: Zaktualizuj komponenty na API backend**

Znajdź kod typu:
```typescript
// ❌ STARY KOD (niebezpieczny)
import { categorizeAnswer } from '@/lib/openai';
const result = await categorizeAnswer({...});
```

Zamień na:
```typescript
// ✅ NOWY KOD (bezpieczny)
const response = await fetch('/api/gpt-test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.API_ACCESS_TOKEN}`
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a categorization assistant' },
      { role: 'user', content: answerText }
    ],
    max_completion_tokens: 500,
    temperature: 0.1
  })
});

const result = await response.json();
```

**Weryfikacja:**
```bash
# Zbuduj aplikację
npm run build

# Sprawdź czy klucz NIE jest w bundlu
grep -r "sk-proj-" dist/
# Powinno być puste!
```

---

### Priorytet 1.4: Zmodyfikuj api-server.js - wymuszaj zabezpieczenia ⏱️ 1h

**Problem:** Zabezpieczenia są opcjonalne

**Plik:** `api-server.js`

**Zmiana 1: Wymuszaj autentykację w produkcji (linia ~151)**

Znajdź:
```javascript
// ❌ STARY KOD
if (process.env.ENABLE_API_AUTH === 'true') {
  app.use('/api', authenticate);
}
```

Zamień na:
```javascript
// ✅ NOWY KOD - ZAWSZE w produkcji
if (isProd) {
  // W produkcji ZAWSZE wymagaj autentykacji
  app.use('/api', authenticate);
  log.info('🔒 API authentication REQUIRED (production mode)');
} else {
  // W developmencie opcjonalnie (domyślnie włączone)
  if (process.env.ENABLE_API_AUTH !== 'false') {
    app.use('/api', authenticate);
    log.warn('🔓 API authentication enabled (development mode)');
  } else {
    log.warn('⚠️  API authentication DISABLED (development only!)');
  }
}
```

**Zmiana 2: Wymuszaj CSRF (linia ~122)**

Znajdź:
```javascript
// ❌ STARY KOD
if (process.env.ENABLE_CSRF === 'true') {
```

Zamień na:
```javascript
// ✅ NOWY KOD
if (isProd || process.env.ENABLE_CSRF !== 'false') {
  app.use(cookieParser());

  try {
    const csurf = (await import('csurf')).default;
    app.use(csurf({
      cookie: {
        httpOnly: true,
        sameSite: isProd ? 'strict' : 'lax',
        secure: isProd
      }
    }));
    log.info('✅ CSRF protection enabled');
  } catch (e) {
    if (isProd) {
      log.error('❌ CSRF required in production but failed to load', {}, e);
      process.exit(1);
    }
    log.warn('⚠️  CSRF enabled but csurf not installed');
  }
}
```

**Zmiana 3: Wymuszaj Rate Limiting (linia ~134)**

Znajdź:
```javascript
// ❌ STARY KOD
if (process.env.ENABLE_RATE_LIMIT === 'true') {
  const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
  app.use(globalLimiter);
}
```

Zamień na:
```javascript
// ✅ NOWY KOD - ZAWSZE włączone
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 100 : 300, // Bardziej restrykcyjne w produkcji
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please try again later.'
});
app.use(globalLimiter);
log.info(`✅ Rate limiting enabled: ${isProd ? 100 : 300} req/min`);

// Specjalny limiter dla kosztownych operacji AI
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // Tylko 10 requestów AI na minutę
  message: 'AI rate limit exceeded. Please wait.'
});
```

**Zmiana 4: Wyłącz debug endpoint w produkcji (linia ~156)**

Znajdź:
```javascript
// ❌ STARY KOD
if (!isProd || process.env.ENABLE_DEBUG_LOGS === 'true') {
```

Zamień na:
```javascript
// ✅ NOWY KOD - TYLKO w development
if (!isProd && process.env.ENABLE_DEBUG_LOGS !== 'false') {
```

**Zmiana 5: Aplikuj AI rate limiter do endpointów (szukaj app.post('/api/gpt-test')**

```javascript
// Znajdź linię:
app.post('/api/gpt-test', async (req, res) => {

// Zamień na:
app.post('/api/gpt-test', aiRateLimiter, async (req, res) => {
```

**Weryfikacja:**
```bash
# Uruchom serwer w trybie produkcyjnym
NODE_ENV=production node api-server.js

# Sprawdź logi - powinny pokazać:
# ✅ API authentication REQUIRED
# ✅ CSRF protection enabled
# ✅ Rate limiting enabled
```

---

### Priorytet 1.5: Zabezpiecz plik .env ⏱️ 2 min

**Weryfikuj .gitignore:**
```bash
cat .gitignore | grep "\.env"
```

Powinno zawierać:
```
.env
.env*
.env.local
.env.production
```

Jeśli nie ma, dodaj:
```bash
echo ".env" >> .gitignore
echo ".env*" >> .gitignore
```

**Sprawdź czy .env nie jest w git:**
```bash
git ls-files .env
# Powinno być PUSTE!

# Jeśli NIE jest puste:
git rm --cached .env
git commit -m "Remove .env from repository"
```

---

## 📅 FAZA 2: PILNE (Ten Tydzień - 6-8h)

### Priorytet 2.1: Napraw polityki RLS w Supabase ⏱️ 2h

**Problem:** Polityki `using (true)` pozwalają każdemu na wszystko!

**Rozwiązanie:**

**Krok 1: Otwórz Supabase SQL Editor**
https://supabase.com/dashboard/project/[TWOJ-PROJECT]/sql

**Krok 2: Dodaj kolumnę user_id do tabel**

```sql
-- Dodaj user_id do wszystkich tabel
ALTER TABLE codes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE answers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE file_imports ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_codes_user_id ON codes(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);
CREATE INDEX IF NOT EXISTS idx_file_imports_user_id ON file_imports(user_id);
```

**Krok 3: Migracja istniejących danych**

```sql
-- OPCJA A: Jeśli masz testowe dane - możesz je usunąć
-- TRUNCATE codes, categories, answers, file_imports CASCADE;

-- OPCJA B: Przypisz do swojego użytkownika (zamień UUID)
-- UPDATE codes SET user_id = 'TWOJ_USER_UUID' WHERE user_id IS NULL;
-- UPDATE categories SET user_id = 'TWOJ_USER_UUID' WHERE user_id IS NULL;
-- UPDATE answers SET user_id = 'TWOJ_USER_UUID' WHERE user_id IS NULL;
-- UPDATE file_imports SET user_id = 'TWOJ_USER_UUID' WHERE user_id IS NULL;

-- Jak znaleźć swój UUID:
SELECT id, email FROM auth.users LIMIT 1;
```

**Krok 4: Usuń stare niebezpieczne polityki**

```sql
-- CODES TABLE
DROP POLICY IF EXISTS "codes read" ON codes;
DROP POLICY IF EXISTS "codes write" ON codes;

-- CATEGORIES TABLE
DROP POLICY IF EXISTS "categories read" ON categories;
DROP POLICY IF EXISTS "categories write" ON categories;

-- ANSWERS TABLE
DROP POLICY IF EXISTS "answers read" ON answers;
DROP POLICY IF EXISTS "answers write" ON answers;
DROP POLICY IF EXISTS "answers UPDATE (anon ok)" ON answers;

-- CODES_CATEGORIES TABLE
DROP POLICY IF EXISTS "codes_categories read" ON codes_categories;
DROP POLICY IF EXISTS "codes_categories write" ON codes_categories;

-- FILE_IMPORTS TABLE
DROP POLICY IF EXISTS "file_imports read" ON file_imports;
DROP POLICY IF EXISTS "file_imports write" ON file_imports;
```

**Krok 5: Utwórz bezpieczne polityki**

```sql
-- ═══════════════════════════════════════════════════════════
-- 🔒 CODES TABLE - Secure Policies
-- ═══════════════════════════════════════════════════════════

CREATE POLICY "codes_select_own" ON codes
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "codes_insert_own" ON codes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "codes_update_own" ON codes
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "codes_delete_own" ON codes
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 🔒 CATEGORIES TABLE - Secure Policies
-- ═══════════════════════════════════════════════════════════

CREATE POLICY "categories_select_own" ON categories
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "categories_insert_own" ON categories
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "categories_update_own" ON categories
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "categories_delete_own" ON categories
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 🔒 ANSWERS TABLE - Secure Policies
-- ═══════════════════════════════════════════════════════════

CREATE POLICY "answers_select_own" ON answers
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "answers_insert_own" ON answers
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "answers_update_own" ON answers
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "answers_delete_own" ON answers
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 🔒 CODES_CATEGORIES TABLE - Secure Policies
-- ═══════════════════════════════════════════════════════════

CREATE POLICY "codes_categories_select_own" ON codes_categories
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM codes WHERE codes.id = code_id AND codes.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM categories WHERE categories.id = category_id AND categories.user_id = auth.uid())
    )
  );

CREATE POLICY "codes_categories_insert_own" ON codes_categories
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM codes WHERE codes.id = code_id AND codes.user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM categories WHERE categories.id = category_id AND categories.user_id = auth.uid())
  );

CREATE POLICY "codes_categories_delete_own" ON codes_categories
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM codes WHERE codes.id = code_id AND codes.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM categories WHERE categories.id = category_id AND categories.user_id = auth.uid())
    )
  );

-- ═══════════════════════════════════════════════════════════
-- 🔒 FILE_IMPORTS TABLE - Secure Policies
-- ═══════════════════════════════════════════════════════════

CREATE POLICY "file_imports_select_own" ON file_imports
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "file_imports_insert_own" ON file_imports
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
```

**Krok 6: WERYFIKACJA (KRYTYCZNE!)**

```sql
-- Test 1: Jako niezalogowany użytkownik (powinno zwrócić 0)
SELECT count(*) FROM codes;
-- Oczekiwane: 0 lub error

-- Test 2: Jako zalogowany (powinno działać)
SELECT count(*) FROM codes WHERE user_id = auth.uid();
-- Oczekiwane: liczba twoich kodów

-- Test 3: Próba zapisu jako inny użytkownik (powinno NIE UDAĆ SIĘ)
-- INSERT INTO codes (name, user_id) VALUES ('Test', 'inny-uuid');
-- Oczekiwane: ERROR - RLS policy violation
```

---

### Priorytet 2.2: Dodaj walidację magic bytes dla plików ⏱️ 1h

**Problem:** Walidacja tylko po rozszerzeniu, można podmienić .exe na .csv

**Rozwiązanie:**

```bash
# Zainstaluj pakiet
npm install file-type
```

**Dodaj do api-server.js (na początku):**
```javascript
import { fileTypeFromBuffer } from 'file-type';
```

**Dodaj funkcję walidacji (po konfiguracji multer):**
```javascript
// ✅ Walidacja magic bytes (zawartości pliku)
async function validateFileContent(filePath) {
  const buffer = fs.readFileSync(filePath);
  const fileType = await fileTypeFromBuffer(buffer);

  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  // CSV nie ma magic bytes, więc pozwalamy na null
  if (fileType && !allowedTypes.includes(fileType.mime)) {
    throw new Error(`Invalid file type detected: ${fileType.mime}. Only CSV/Excel allowed.`);
  }

  return true;
}
```

**Użyj w endpoint file-upload (znajdź linię ~439, wewnątrz try block):**
```javascript
// Znajdź:
if (!req.file) {
  return res.status(400).json({ error: 'No file uploaded' });
}

// Dodaj ZARAZ PO TYM:
// ✅ Waliduj magic bytes
await validateFileContent(req.file.path);
```

---

### Priorytet 2.3: Zainstaluj i skonfiguruj prawdziwy Sentry ⏱️ 30 min

**Problem:** Sentry jest zmockowany, nie trackuje błędów

```bash
npm install @sentry/react @sentry/vite-plugin
```

**Zaktualizuj src/lib/sentry.ts:**
```typescript
import * as Sentry from '@sentry/react';

// Inicjalizuj tylko w produkcji
if (import.meta.env.VITE_SENTRY_DSN && import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance monitoring
    tracesSampleRate: 0.1, // 10% transakcji

    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // ✅ BEZPIECZEŃSTWO: Filtruj wrażliwe dane
    beforeSend(event) {
      // Usuń PII
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      // Usuń wrażliwe headery
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
        delete event.request.headers['X-API-Key'];
      }

      return event;
    },

    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });

  console.log('✅ Sentry error tracking enabled');
}

export function isSentryEnabled(): boolean {
  return !!import.meta.env.VITE_SENTRY_DSN && import.meta.env.PROD;
}

// Reszta funkcji bez zmian
export const logError = Sentry.captureException;
export const logMessage = Sentry.captureMessage;
export const addBreadcrumb = Sentry.addBreadcrumb;
```

---

### Priorytet 2.4: Zainstaluj csurf dla CSRF protection ⏱️ 10 min

```bash
npm install csurf
```

Kod już istnieje w api-server.js, więc po instalacji będzie działać.

---

## 🗓️ FAZA 3: WAŻNE (Ten Miesiąc - 2-3 dni)

### Priorytet 3.1: Implementuj autentykację Supabase Auth ⏱️ 1 dzień

**Kroki:**

1. Włącz Supabase Auth w panelu
2. Utwórz strony login/register
3. Dodaj `AuthProvider` w App.tsx
4. Zabezpiecz route'y z `ProtectedRoute`
5. Dodaj logout button
6. Skonfiguruj session timeout (30 min)

**Dokumentacja:** https://supabase.com/docs/guides/auth

---

### Priorytet 3.2: Ulepsz CORS - wymuszaj whitelist w produkcji ⏱️ 30 min

**W api-server.js, znajdź CORS config (linia ~108):**

```javascript
// ❌ STARY KOD
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || undefined;
app.use(cors({ origin: corsOrigins || true }));
```

Zamień na:
```javascript
// ✅ NOWY KOD
const corsOrigins = isProd
  ? (process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [])
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

// W produkcji WYMUSZAJ whitelist
if (isProd && corsOrigins.length === 0) {
  log.error('❌ CORS_ORIGINS must be set in production!');
  process.exit(1);
}

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

log.info('✅ CORS configured', { origins: corsOrigins });
```

---

### Priorytet 3.3: Ulepsz walidację filtrów ⏱️ 1h

**Problem:** Zbyt długie limity mogą prowadzić do ReDoS

**W api-server.js (linia ~280), zaktualizuj schema:**

```typescript
const filterSchema = z.object({
  search: z.string()
    .max(50) // ✅ Krócej niż 200
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Invalid characters in search') // ✅ Tylko bezpieczne znaki
    .optional(),
  types: z.array(z.enum(['uncategorized', 'whitelist', 'blacklist', 'categorized'])).optional(),
  status: z.enum(['Confirmed', 'Not confirmed', 'Other', 'Ignore', 'Incomplete']).optional(),
  codes: z.array(z.string().max(50))
    .max(10) // ✅ Zmniejsz z 50 do 10
    .optional(),
  language: z.string().max(10).optional(),
  country: z.string().max(50).optional(),
  categoryId: z.coerce.number().positive().optional()
});
```

---

### Priorytet 3.4: Dodaj Content Security Policy (CSP) headers ⏱️ 30 min

**Już zaimplementowane w api-server.js!** Tylko upewnij się że:
```bash
# W .env
ENABLE_CSP=true
```

I zweryfikuj konfigurację (linia ~90):
```javascript
app.use(helmet({
  contentSecurityPolicy: enableCsp ? {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind wymaga tego
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openai.com', 'https://*.supabase.co'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null
    }
  } : false
}));
```

---

## ✅ CHECKLIST PRZED WDROŻENIEM

### Krytyczne (MUSI być zrobione)

- [ ] `npm audit` pokazuje 0 critical/high
- [ ] Wszystkie zabezpieczenia API włączone (.env)
- [ ] OpenAI key TYLKO na backendzie (nie w VITE_*)
- [ ] Polityki RLS wymuszają user_id
- [ ] .env w .gitignore i nie w repozytorium
- [ ] api-server.js wymusza auth w produkcji
- [ ] CSRF protection włączone
- [ ] Rate limiting włączone
- [ ] CSP headers włączone
- [ ] File upload z magic byte validation

### Ważne (Bardzo pożądane)

- [ ] Sentry skonfigurowane i działa
- [ ] CORS whitelist w produkcji
- [ ] Autentykacja Supabase Auth
- [ ] Session timeout (30 min)
- [ ] Debug logs wyłączone w produkcji

### Opcjonalne (Do rozważenia)

- [ ] 2FA dla adminów
- [ ] API versioning (/api/v1/)
- [ ] Automated security scans (Snyk)
- [ ] Penetration test

---

## 🧪 TESTY WERYFIKACYJNE

### Test 1: Zależności
```bash
npm audit
# Oczekiwane: 0 vulnerabilities
```

### Test 2: Zabezpieczenia API
```bash
# Bez autentykacji (powinno ODRZUCIĆ)
curl -X POST http://localhost:3001/api/file-upload
# Oczekiwane: 401 Unauthorized

# 101 requestów (powinno rate limitować)
for i in {1..101}; do curl http://localhost:3001/api/health; done
# Oczekiwane: Ostatnie zwracają 429 Too Many Requests
```

### Test 3: RLS Policies
```sql
-- W Supabase SQL Editor
-- Test jako anonymous (powinno zwrócić 0 lub error)
SELECT count(*) FROM codes;
```

### Test 4: OpenAI NIE w bundlu
```bash
npm run build
grep -r "VITE_OPENAI" dist/
grep -r "sk-proj-" dist/
# Oba powinny być PUSTE!
```

---

## 💰 SZACOWANE KOSZTY

### Czas pracy
| Faza | Czas | Koszt (100 PLN/h) |
|------|------|-------------------|
| Faza 1 (Dziś) | 4h | 400 PLN |
| Faza 2 (Ten tydzień) | 6h | 600 PLN |
| Faza 3 (Ten miesiąc) | 16h | 1,600 PLN |
| **RAZEM** | **26h** | **2,600 PLN** |

### Koszt BRAKU naprawy (potencjalne straty)
- Wyciek danych: 50,000 - 500,000 PLN
- Kradzież klucza OpenAI: 1,000 - 10,000 PLN/miesiąc
- DDoS / nadużycie API: 5,000 - 50,000 PLN
- Kary GDPR (jeśli UE): 40,000,000 PLN lub 2% obrotu

**Naprawa kosztuje 100x MNIEJ niż potencjalne straty!**

---

## 📞 WSPARCIE I PYTANIA

### Kolejność wykonywania
1. Zacznij od **Fazy 1** - DZIŚ
2. Przetestuj każdy krok zanim przejdziesz dalej
3. Commituj po każdym działającym kroku
4. Rób backupy przed zmianami w bazie

### W razie problemów
1. Sprawdź logi: `tail -f logs/app.log`
2. Sprawdź npm logs: `npm run dev:full`
3. Sprawdź browser console (DevTools)
4. Sprawdź Supabase logs w panelu
5. Zweryfikuj .env ma wszystkie zmienne

### Dodatkowe zasoby
- Security audit report: `🔒_SECURITY_AUDIT_REPORT.md`
- Przewodnik fix: `SECURITY_FIXES_IMMEDIATE.md`
- Security check script: `security-check.sh`

---

## 🚀 NASTĘPNE KROKI

1. **TERAZ**: Wykonaj Fazę 1 (4h)
2. **Jutro**: Przetestuj wszystko
3. **Ten tydzień**: Wykonaj Fazę 2 (6h)
4. **Ten miesiąc**: Wykonaj Fazę 3 (16h)
5. **Za 3 miesiące**: Kolejny security audit

---

**⚠️ WAŻNE:** NIE WDRAŻAJ na produkcję dopóki nie wykonasz minimum **Fazy 1 + Fazy 2**!

**Data utworzenia planu:** 19 października 2025
**Status:** DO WYKONANIA
**Priorytet:** KRYTYCZNY 🔴
