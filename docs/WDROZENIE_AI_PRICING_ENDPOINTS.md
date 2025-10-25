# 🎯 Wdrożenie API Endpoints dla Systemu Cen AI

**Data utworzenia:** 2025-10-10
**Status:** Gotowe do wdrożenia
**Czas realizacji:** ~10 minut

---

## 📋 Cel Wdrożenia

Dodać brakujące API endpointy do `api-server.js` dla systemu dynamicznych cen modeli AI.

**Wszystkie inne komponenty są już gotowe:**
- ✅ Backend fetcher (`server/pricing/pricingFetcher.js`)
- ✅ React Query hook (`src/hooks/useAIPricing.ts`)
- ✅ Pricing Dashboard UI (`src/components/PricingDashboard.tsx`)
- ✅ TypeScript types (`src/types/pricing.ts`)
- ✅ Cache file (`src/data/ai-pricing-cache.json`)

**Brakuje tylko:** 2 endpointy w `api-server.js`

---

## 🔍 Prerequisite - Co Już Istnieje

Przed rozpoczęciem, upewnij się że masz:

1. **Backend Fetcher** - `server/pricing/pricingFetcher.js` (366 linii)
   - System cache'owania (24h TTL)
   - Fallback do pliku dysku
   - Obsługa OpenAI, Anthropic, Google

2. **Frontend Hook** - `src/hooks/useAIPricing.ts` (148 linii)
   - Integracja z React Query
   - Auto-refetch co godzinę
   - Helper functions

3. **UI Dashboard** - `src/components/PricingDashboard.tsx` (286 linii)
   - Live display cen
   - Filtrowanie po providerze
   - Przycisk odświeżania

4. **Settings Page** - `src/pages/SettingsPage.tsx`
   - Już używa `useAIPricing` hook
   - Wyświetla `PricingDashboard`
   - Czeka tylko na działające API

---

## 🛠️ Implementacja

### Krok 1: Import PricingFetcher

Otwórz plik `/Users/greglas/coding-ui/api-server.js`

**Po linii 9** (po `import path from 'path';`) dodaj:

```javascript
import pricingFetcher from './server/pricing/pricingFetcher.js';
```

**Wynik:**
```javascript
import fs from 'fs';
import path from 'path';
import pricingFetcher from './server/pricing/pricingFetcher.js';  // ← NOWA LINIA

const app = express();
const port = 3001;
```

---

### Krok 2: Dodanie Endpointów

**Przed linią 539** (przed `app.listen(port, () => {`) dodaj:

```javascript
// ═══════════════════════════════════════════════════════════════
// 💰 AI PRICING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/ai-pricing
 * Fetch AI model pricing data (with 24h cache)
 */
app.get('/api/ai-pricing', async (req, res) => {
  try {
    console.log('📊 GET /api/ai-pricing');

    const pricingData = await pricingFetcher.fetchPricing();

    // Add response metadata
    const response = {
      ...pricingData,
      cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Error in /api/ai-pricing:', error);
    res.status(500).json({
      error: 'Failed to fetch pricing data',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai-pricing/refresh
 * Force refresh pricing data (clear cache)
 */
app.post('/api/ai-pricing/refresh', async (req, res) => {
  try {
    console.log('🔄 POST /api/ai-pricing/refresh - forcing cache refresh');

    const pricingData = await pricingFetcher.forceRefresh();

    res.json({
      success: true,
      message: 'Pricing data refreshed successfully',
      data: pricingData,
    });
  } catch (error) {
    console.error('❌ Error refreshing pricing:', error);
    res.status(500).json({
      error: 'Failed to refresh pricing data',
      message: error.message,
    });
  }
});
```

---

### Krok 3: Aktualizacja Console Logów

**W linii ~541-546** (w funkcji `app.listen`) zaktualizuj listę endpointów:

**Było:**
```javascript
app.listen(port, () => {
  console.log(`🚀 API server running on http://localhost:${port}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - POST http://localhost:${port}/api/file-upload (File upload)`);
  console.log(`   - POST http://localhost:${port}/api/answers/filter (Filter answers)`);
  console.log(`   - POST http://localhost:${port}/api/gpt-test (GPT test)`);
  console.log(`   - GET  http://localhost:${port}/api/health (Health check)`);
});
```

**Powinno być:**
```javascript
app.listen(port, () => {
  console.log(`🚀 API server running on http://localhost:${port}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - POST http://localhost:${port}/api/file-upload (File upload)`);
  console.log(`   - POST http://localhost:${port}/api/answers/filter (Filter answers)`);
  console.log(`   - POST http://localhost:${port}/api/gpt-test (GPT test)`);
  console.log(`   - GET  http://localhost:${port}/api/ai-pricing (AI pricing)`);           // ← NOWA LINIA
  console.log(`   - POST http://localhost:${port}/api/ai-pricing/refresh (Refresh pricing)`);  // ← NOWA LINIA
  console.log(`   - GET  http://localhost:${port}/api/health (Health check)`);
});
```

---

## ✅ Weryfikacja Działania

### 1. Restart Serwera API

```bash
# Zatrzymaj obecny serwer (Ctrl+C)
# Uruchom ponownie:
npm run dev:api
```

**Oczekiwany output:**
```
🚀 API server running on http://localhost:3001
📡 Endpoints:
   - POST http://localhost:3001/api/file-upload (File upload)
   - POST http://localhost:3001/api/answers/filter (Filter answers)
   - POST http://localhost:3001/api/gpt-test (GPT test)
   - GET  http://localhost:3001/api/ai-pricing (AI pricing)           ← NOWE
   - POST http://localhost:3001/api/ai-pricing/refresh (Refresh pricing)  ← NOWE
   - GET  http://localhost:3001/api/health (Health check)
```

---

### 2. Test Endpoint w Terminalu

```bash
# Test GET endpoint
curl http://localhost:3001/api/ai-pricing | jq .dataSource

# Oczekiwany wynik: "live" lub "cache"

# Test struktury danych
curl http://localhost:3001/api/ai-pricing | jq '.models | keys'

# Oczekiwany wynik: ["anthropic", "google", "openai"]

# Test refresh endpoint
curl -X POST http://localhost:3001/api/ai-pricing/refresh | jq .success

# Oczekiwany wynik: true
```

---

### 3. Test w Aplikacji Web

1. **Otwórz Settings Page:**
   ```
   http://localhost:5173/settings
   ```

2. **Sprawdź czy widzisz:**
   - ✅ Live Pricing Dashboard z modelami
   - ✅ Ceny dla każdego modelu
   - ✅ Przycisk "Odśwież" działa
   - ✅ Sortowanie po kosztach
   - ✅ Ostatnia aktualizacja (timestamp)

3. **Otwórz Console Deweloperską (F12):**
   - ✅ Brak błędów
   - ✅ Log: `✅ AI pricing data loaded: live`
   - ✅ Przy kliknięciu "Odśwież": `🔄 Manually refreshing pricing data...`

4. **Sprawdź Settings dla każdego providera:**
   - OpenAI tab → powinien pokazywać dynamiczne ceny
   - Claude tab → powinien pokazywać dynamiczne ceny
   - Gemini tab → powinien pokazywać dynamiczne ceny

---

### 4. Test Cache'owania

```bash
# Pierwsze wywołanie (live fetch)
curl http://localhost:3001/api/ai-pricing | jq .dataSource
# Wynik: "live"

# Drugie wywołanie (z cache)
curl http://localhost:3001/api/ai-pricing | jq .dataSource
# Wynik: "cache"

# Force refresh
curl -X POST http://localhost:3001/api/ai-pricing/refresh

# Następne wywołanie (live fetch po refresh)
curl http://localhost:3001/api/ai-pricing | jq .dataSource
# Wynik: "live"
```

---

## 💾 Local Backup Po Zakończeniu

Po pomyślnym wdrożeniu i weryfikacji, utwórz backup:

### 1. Backup Zmodyfikowanego Pliku

```bash
# Z głównego katalogu projektu:
cp api-server.js api-server.js.backup-$(date +%Y%m%d-%H%M%S)

# Przykład: api-server.js.backup-20251010-153045
```

### 2. Dokumentacja Zmian

Stwórz plik `CHANGELOG_AI_PRICING.md`:

```bash
cat > CHANGELOG_AI_PRICING.md << 'EOF'
# Changelog - AI Pricing Endpoints

## Data wdrożenia: 2025-10-10

### Zmiany w api-server.js:

1. **Import (linia ~10):**
   - Dodano: `import pricingFetcher from './server/pricing/pricingFetcher.js'`

2. **Nowe endpointy (przed app.listen):**
   - `GET /api/ai-pricing` - pobieranie cen (z 24h cache)
   - `POST /api/ai-pricing/refresh` - wymuszenie odświeżenia cache

3. **Aktualizacja logów (w app.listen):**
   - Dodano nowe endpointy do listy w console.log

### Weryfikacja:
- [x] Serwer startuje bez błędów
- [x] GET endpoint działa
- [x] POST refresh endpoint działa
- [x] UI w /settings ładuje dashboard
- [x] Cache działa poprawnie (24h TTL)

### Backup:
- Plik: api-server.js.backup-TIMESTAMP
- Lokalizacja: /Users/greglas/coding-ui/

### Integracja:
- Hook: src/hooks/useAIPricing.ts
- Dashboard: src/components/PricingDashboard.tsx
- Settings: src/pages/SettingsPage.tsx
- Fetcher: server/pricing/pricingFetcher.js
- Cache: src/data/ai-pricing-cache.json
EOF
```

### 3. Commit do Git (opcjonalnie)

```bash
git add api-server.js
git add CHANGELOG_AI_PRICING.md
git commit -m "feat: Add AI pricing API endpoints

- Add GET /api/ai-pricing endpoint with 24h cache
- Add POST /api/ai-pricing/refresh for cache refresh
- Integrate with existing pricingFetcher service
- Update API endpoint logging

Completes AI pricing system integration"
```

### 4. Weryfikacja Backupu

```bash
# Sprawdź że backup istnieje
ls -lh api-server.js.backup-*

# Sprawdź różnicę między oryginalnym a obecnym
diff api-server.js.backup-* api-server.js | head -50
```

---

## 🔧 Troubleshooting

### Problem: `Cannot find module './server/pricing/pricingFetcher.js'`

**Rozwiązanie:**
```bash
# Sprawdź czy plik istnieje
ls -la server/pricing/pricingFetcher.js

# Jeśli nie istnieje, sprawdź dokumentację:
cat docs/AI_PRICING_API_IMPLEMENTATION_PLAN.md
```

---

### Problem: `pricingFetcher.fetchPricing is not a function`

**Przyczyna:** Import nie działa poprawnie

**Rozwiązanie:**
1. Sprawdź czy `pricingFetcher.js` eksportuje domyślnie:
   ```javascript
   // W server/pricing/pricingFetcher.js powinno być:
   export default pricingFetcher;
   ```

2. Sprawdź składnię importu:
   ```javascript
   // W api-server.js:
   import pricingFetcher from './server/pricing/pricingFetcher.js';
   ```

---

### Problem: `Error: ENOENT: no such file or directory, open 'src/data/ai-pricing-cache.json'`

**Rozwiązanie:**
```bash
# Utwórz folder i pusty plik cache
mkdir -p src/data
echo '{"lastUpdated":"","dataSource":"fallback","models":{"openai":[],"anthropic":[],"google":[]}}' > src/data/ai-pricing-cache.json
```

---

### Problem: Frontend pokazuje błąd "Failed to fetch pricing data"

**Diagnostyka:**
```bash
# 1. Sprawdź czy serwer działa
curl http://localhost:3001/api/health

# 2. Sprawdź logi serwera API
# Powinieneś zobaczyć: "📊 GET /api/ai-pricing"

# 3. Sprawdź czy endpoint odpowiada
curl -v http://localhost:3001/api/ai-pricing

# 4. Sprawdź CORS
# W konsoli przeglądarki nie powinno być błędów CORS
```

---

### Problem: Dashboard się nie ładuje na Settings page

**Sprawdź:**
1. Console przeglądarki - jakie błędy?
2. Network tab - czy request do `/api/ai-pricing` się wykonuje?
3. Czy hook jest poprawnie zaimportowany w SettingsPage?

**Debugging:**
```javascript
// W src/pages/SettingsPage.tsx sprawdź czy jest:
import { useAIPricing } from '../hooks/useAIPricing';
import { PricingDashboard } from '../components/PricingDashboard';

// I w komponencie:
const { getPricingForProvider } = useAIPricing();
```

---

### Problem: Cache nie wygasa po 24h

**Sprawdź:**
```javascript
// W server/pricing/pricingFetcher.js:
this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 godziny w milisekundach
```

**Wymuszenie odświeżenia:**
```bash
curl -X POST http://localhost:3001/api/ai-pricing/refresh
```

---

## 📚 Dodatkowe Zasoby

### Dokumentacja
- **Plan implementacji:** `docs/AI_PRICING_API_IMPLEMENTATION_PLAN.md` (800 linii)
- **Auto-update guide:** `docs/AI_PRICING_AUTO_UPDATE.md` (333 linie)

### Pliki Kluczowe
- **Backend:** `server/pricing/pricingFetcher.js` (366 linii)
- **Frontend Hook:** `src/hooks/useAIPricing.ts` (148 linii)
- **UI Dashboard:** `src/components/PricingDashboard.tsx` (286 linii)
- **Types:** `src/types/pricing.ts` (39 linii)
- **Cache:** `src/data/ai-pricing-cache.json`

### Testowanie
```bash
# Test pełnego flow
npm run dev:api          # Terminal 1
npm run dev              # Terminal 2

# Otwórz w przeglądarce:
# http://localhost:5173/settings

# W trzecim terminalu:
curl http://localhost:3001/api/ai-pricing | jq
```

---

## ✅ Checklist Finalna

Po zakończeniu upewnij się że:

- [ ] Import pricingFetcher dodany
- [ ] GET endpoint `/api/ai-pricing` działa
- [ ] POST endpoint `/api/ai-pricing/refresh` działa
- [ ] Console.log pokazuje nowe endpointy
- [ ] Serwer restartuje się bez błędów
- [ ] Curl testy przechodzą
- [ ] UI pokazuje Pricing Dashboard
- [ ] Przycisk "Odśwież" działa
- [ ] Cache działa (24h TTL)
- [ ] Backup utworzony: `api-server.js.backup-TIMESTAMP`
- [ ] Changelog utworzony: `CHANGELOG_AI_PRICING.md`
- [ ] Git commit wykonany (opcjonalnie)
- [ ] Wszystkie testy przeszły pomyślnie

---

## 🎉 Gotowe!

Po wykonaniu wszystkich kroków i weryfikacji, system dynamicznych cen AI jest w pełni zintegrowany!

**Co teraz działa:**
- ✅ Frontend pobiera ceny z API (zamiast hardcoded)
- ✅ Cache redukuje obciążenie (24h TTL)
- ✅ Użytkownicy widzą aktualne ceny w Settings
- ✅ Dashboard pokazuje porównanie modeli
- ✅ Możliwość ręcznego odświeżenia
- ✅ Automatyczne fallback do cache

**Następne kroki (opcjonalnie):**
1. Dodać web scraping dla live cen
2. Dodać historię zmian cen
3. Dodać alerty przy zmianach >10%
4. Dodać GitHub Actions do auto-update

---

**Ostatnia aktualizacja:** 2025-10-10
**Autor:** AI Assistant
**Status:** ✅ Gotowe do wdrożenia




