# 📋 Plan Wdrożenia: API Endpoint dla Automatycznej Aktualizacji Cen AI

## 🎯 Cel
Implementacja API endpoint do automatycznego pobierania i cache'owania cen modeli AI oraz ich dostępności.

---

## 📊 Przegląd Architektury

```
Frontend (React)
    ↓
useAIPricing Hook
    ↓
GET /api/ai-pricing
    ↓
Backend (Node.js/Express)
    ↓
Pricing Scraper → Cache (24h)
    ↓
Provider APIs / Scraping
```

---

## 🔧 Komponenty do Implementacji

### 1. Backend - API Endpoint
**Plik:** `api-server.js` (rozszerzyć istniejący)

### 2. Pricing Data Storage
**Plik:** `src/data/ai-pricing.json` (cache lokalny)

### 3. React Hook
**Plik:** `src/hooks/useAIPricing.ts` (nowy)

### 4. UI Updates
**Plik:** `src/pages/SettingsPage.tsx` (modyfikacja)

---

## 📝 Krok po Kroku

### KROK 1: Struktura Danych - Pricing Schema

**Plik:** `src/types/pricing.ts` (nowy)

```typescript
export interface ModelPricing {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  costPer1M: number; // USD per 1M tokens
  costPer1000Responses: number; // Estimated cost for 1000 categorizations
  inputCostPer1M?: number; // Some providers have different input/output pricing
  outputCostPer1M?: number;
  avgLatency: number; // milliseconds
  quality: number; // 0-10 scale
  contextWindow: number; // max tokens
  available: boolean;
  deprecated?: boolean;
  releaseDate?: string;
  description?: string;
}

export interface PricingData {
  lastUpdated: string; // ISO 8601
  dataSource: string; // 'cache' | 'live' | 'fallback'
  models: {
    openai: ModelPricing[];
    anthropic: ModelPricing[];
    google: ModelPricing[];
  };
}

export interface PricingResponse extends PricingData {
  cacheExpiry: string;
  nextUpdate: string;
}
```

---

### KROK 2: Backend - Pricing Scraper/Fetcher

**Plik:** `server/pricing/pricingFetcher.js` (nowy)

```javascript
// Pricing Fetcher - pobiera ceny z różnych źródeł
const axios = require('axios');
const cheerio = require('cheerio');

class PricingFetcher {
  constructor() {
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Główna metoda do pobierania cen
   */
  async fetchPricing() {
    // Sprawdź cache
    if (this.isCacheValid()) {
      console.log('✅ Returning cached pricing data');
      return this.cache;
    }

    console.log('🔄 Fetching fresh pricing data...');

    try {
      const [openaiPricing, anthropicPricing, googlePricing] = await Promise.all([
        this.fetchOpenAIPricing(),
        this.fetchAnthropicPricing(),
        this.fetchGooglePricing(),
      ]);

      const pricingData = {
        lastUpdated: new Date().toISOString(),
        dataSource: 'live',
        models: {
          openai: openaiPricing,
          anthropic: anthropicPricing,
          google: googlePricing,
        },
      };

      // Cache wyników
      this.cache = pricingData;
      this.cacheTime = Date.now();

      // Zapisz do pliku jako backup
      await this.saveToDisk(pricingData);

      return pricingData;
    } catch (error) {
      console.error('❌ Error fetching pricing:', error);

      // Fallback do ostatnich zapisanych danych
      return this.loadFromDisk();
    }
  }

  /**
   * Pobieranie cen OpenAI
   */
  async fetchOpenAIPricing() {
    // Opcja 1: Użyj oficjalnego API (jeśli dostępne)
    // Opcja 2: Scraping strony pricing
    // Opcja 3: Statyczne dane z aktualizacją ręczną

    // Na razie zwracamy statyczne dane (można później dodać scraping)
    return [
      {
        id: 'gpt-5',
        name: 'GPT-5',
        provider: 'openai',
        costPer1M: 15.0,
        costPer1000Responses: 1.50,
        avgLatency: 1200,
        quality: 10,
        contextWindow: 128000,
        available: true,
        releaseDate: '2025-08-01',
        description: 'Latest and most powerful model from OpenAI',
      },
      {
        id: 'o1-preview',
        name: 'o1-preview',
        provider: 'openai',
        costPer1M: 15.0,
        costPer1000Responses: 1.50,
        avgLatency: 2000,
        quality: 9.8,
        contextWindow: 128000,
        available: true,
        description: 'Advanced reasoning model',
      },
      {
        id: 'o1-mini',
        name: 'o1-mini',
        provider: 'openai',
        costPer1M: 3.0,
        costPer1000Responses: 0.30,
        avgLatency: 1000,
        quality: 9,
        contextWindow: 128000,
        available: true,
        description: 'Fast reasoning model',
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        costPer1M: 5.0,
        costPer1000Responses: 0.50,
        avgLatency: 600,
        quality: 9,
        contextWindow: 128000,
        available: true,
        description: 'Fast and high quality model',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        costPer1M: 0.15,
        costPer1000Responses: 0.015,
        avgLatency: 400,
        quality: 8,
        contextWindow: 128000,
        available: true,
        description: 'Most cost-effective model',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        costPer1M: 10.0,
        costPer1000Responses: 1.00,
        avgLatency: 800,
        quality: 8.8,
        contextWindow: 128000,
        available: true,
        description: 'Balanced performance model',
      },
    ];
  }

  /**
   * Pobieranie cen Anthropic
   */
  async fetchAnthropicPricing() {
    return [
      {
        id: 'claude-sonnet-4.5',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        costPer1M: 3.0,
        costPer1000Responses: 0.30,
        avgLatency: 700,
        quality: 10,
        contextWindow: 200000,
        available: true,
        releaseDate: '2025-09-29',
        description: 'Best coding model in the world',
      },
      {
        id: 'claude-opus-4',
        name: 'Claude Opus 4',
        provider: 'anthropic',
        costPer1M: 15.0,
        costPer1000Responses: 1.50,
        avgLatency: 1100,
        quality: 9.5,
        contextWindow: 200000,
        available: true,
        releaseDate: '2025-05-22',
        description: 'Highest quality model',
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        costPer1M: 15.0,
        costPer1000Responses: 1.50,
        avgLatency: 1200,
        quality: 9.2,
        contextWindow: 200000,
        available: true,
        description: 'Previous generation flagship',
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        costPer1M: 3.0,
        costPer1000Responses: 0.30,
        avgLatency: 750,
        quality: 8.8,
        contextWindow: 200000,
        available: true,
        description: 'Balanced model',
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        costPer1M: 0.25,
        costPer1000Responses: 0.025,
        avgLatency: 350,
        quality: 7.5,
        contextWindow: 200000,
        available: true,
        description: 'Fastest and cheapest',
      },
    ];
  }

  /**
   * Pobieranie cen Google
   */
  async fetchGooglePricing() {
    return [
      {
        id: 'gemini-2.0-pro-exp',
        name: 'Gemini 2.0 Pro Experimental',
        provider: 'google',
        costPer1M: 2.5,
        costPer1000Responses: 0.25,
        avgLatency: 900,
        quality: 9.5,
        contextWindow: 2000000,
        available: true,
        description: '2M token context window',
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        costPer1M: 0.075,
        costPer1000Responses: 0.0075,
        avgLatency: 300,
        quality: 8.5,
        contextWindow: 1000000,
        available: true,
        description: 'Fastest and cheapest',
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        costPer1M: 1.25,
        costPer1000Responses: 0.125,
        avgLatency: 800,
        quality: 9,
        contextWindow: 2000000,
        available: true,
        description: 'Stable production model',
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        costPer1M: 0.075,
        costPer1000Responses: 0.0075,
        avgLatency: 250,
        quality: 8,
        contextWindow: 1000000,
        available: true,
        description: 'Fast and cost-effective',
      },
    ];
  }

  /**
   * Sprawdź czy cache jest ważny
   */
  isCacheValid() {
    if (!this.cache || !this.cacheTime) {
      return false;
    }

    const age = Date.now() - this.cacheTime;
    return age < this.CACHE_TTL;
  }

  /**
   * Zapisz dane do dysku
   */
  async saveToDisk(data) {
    const fs = require('fs').promises;
    const path = require('path');

    const filePath = path.join(__dirname, '../../src/data/ai-pricing-cache.json');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    console.log('💾 Pricing data saved to disk');
  }

  /**
   * Wczytaj dane z dysku (fallback)
   */
  async loadFromDisk() {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const filePath = path.join(__dirname, '../../src/data/ai-pricing-cache.json');
      const data = await fs.readFile(filePath, 'utf-8');

      const parsed = JSON.parse(data);
      parsed.dataSource = 'cache';

      console.log('📂 Loaded pricing from disk cache');
      return parsed;
    } catch (error) {
      console.error('❌ Failed to load from disk, using hardcoded fallback');
      return this.getFallbackData();
    }
  }

  /**
   * Hardcoded fallback (ostatnia deska ratunku)
   */
  getFallbackData() {
    return {
      lastUpdated: new Date().toISOString(),
      dataSource: 'fallback',
      models: {
        openai: this.fetchOpenAIPricing(),
        anthropic: this.fetchAnthropicPricing(),
        google: this.fetchGooglePricing(),
      },
    };
  }
}

module.exports = new PricingFetcher();
```

---

### KROK 3: Backend - API Endpoint

**Plik:** `api-server.js` (dodać nowy endpoint)

```javascript
// Dodaj na początku pliku
const pricingFetcher = require('./server/pricing/pricingFetcher');

// Dodaj nowy endpoint (przed app.listen())
app.get('/api/ai-pricing', async (req, res) => {
  try {
    console.log('📊 GET /api/ai-pricing');

    const pricingData = await pricingFetcher.fetchPricing();

    // Dodaj metadata
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
      message: error.message
    });
  }
});

// Endpoint do wymuszenia odświeżenia cache
app.post('/api/ai-pricing/refresh', async (req, res) => {
  try {
    console.log('🔄 POST /api/ai-pricing/refresh - forcing cache refresh');

    // Wymuś odświeżenie poprzez wyczyszczenie cache
    pricingFetcher.cache = null;
    pricingFetcher.cacheTime = null;

    const pricingData = await pricingFetcher.fetchPricing();

    res.json({
      success: true,
      message: 'Pricing data refreshed',
      data: pricingData
    });
  } catch (error) {
    console.error('❌ Error refreshing pricing:', error);
    res.status(500).json({
      error: 'Failed to refresh pricing data',
      message: error.message
    });
  }
});
```

---

### KROK 4: Frontend - React Hook

**Plik:** `src/hooks/useAIPricing.ts` (nowy)

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PricingResponse } from '../types/pricing';

interface UseAIPricingOptions {
  enabled?: boolean;
  refetchInterval?: number; // milliseconds
}

export function useAIPricing(options: UseAIPricingOptions = {}) {
  const { enabled = true, refetchInterval = 1000 * 60 * 60 } = options; // Default: 1 hour
  const queryClient = useQueryClient();

  const query = useQuery<PricingResponse>({
    queryKey: ['ai-pricing'],
    queryFn: async () => {
      console.log('🔄 Fetching AI pricing data...');

      const response = await fetch('/api/ai-pricing');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ AI pricing data loaded:', data.dataSource);

      return data;
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchInterval, // Auto-refetch co godzinę
    refetchOnWindowFocus: false,
    retry: 3,
  });

  /**
   * Wymuś odświeżenie danych
   */
  const refresh = async () => {
    console.log('🔄 Manually refreshing pricing data...');

    try {
      const response = await fetch('/api/ai-pricing/refresh', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to refresh pricing');
      }

      // Invalidate cache i pobierz na nowo
      await queryClient.invalidateQueries({ queryKey: ['ai-pricing'] });

      return true;
    } catch (error) {
      console.error('❌ Error refreshing pricing:', error);
      return false;
    }
  };

  /**
   * Pobierz ceny dla konkretnego providera
   */
  const getPricingForProvider = (provider: 'openai' | 'anthropic' | 'google') => {
    if (!query.data) return [];
    return query.data.models[provider] || [];
  };

  /**
   * Pobierz cenę dla konkretnego modelu
   */
  const getPricingForModel = (modelId: string) => {
    if (!query.data) return null;

    const allModels = [
      ...query.data.models.openai,
      ...query.data.models.anthropic,
      ...query.data.models.google,
    ];

    return allModels.find(m => m.id === modelId) || null;
  };

  return {
    pricing: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    lastUpdated: query.data?.lastUpdated,
    dataSource: query.data?.dataSource,
    refresh,
    getPricingForProvider,
    getPricingForModel,
  };
}
```

---

### KROK 5: Frontend - Update SettingsPage

**Plik:** `src/pages/SettingsPage.tsx` (modyfikacja)

```typescript
// Dodaj na początku komponentu
import { useAIPricing } from '../hooks/useAIPricing';

// W komponencie OpenAISettings:
function OpenAISettings() {
  const { pricing, isLoading, lastUpdated, dataSource } = useAIPricing();
  const openaiModels = pricing?.models.openai || [];

  // ... reszta kodu

  return (
    <div>
      {/* Status Banner - zaktualizuj o info z API */}

      {/* Model Selection - dynamiczne opcje z API */}
      <select value={model} onChange={(e) => setModel(e.target.value)}>
        {openaiModels.map(model => (
          <option key={model.id} value={model.id}>
            {model.name} - ${model.costPer1000Responses.toFixed(3)}/1k
          </option>
        ))}
      </select>

      {/* Cost Estimate - dynamiczne ceny z API */}
      <div className="bg-blue-50...">
        <h3>💰 Przewidywany koszt za 1000 odpowiedzi</h3>
        {openaiModels.map(m => (
          <p key={m.id}>
            • {m.name}: <strong>${m.costPer1000Responses.toFixed(3)}</strong>
            {m.description && ` (${m.description})`}
          </p>
        ))}

        {lastUpdated && (
          <p className="text-xs mt-2">
            Ostatnia aktualizacja: {new Date(lastUpdated).toLocaleString('pl-PL')}
            <br />
            Źródło: {dataSource}
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## 📦 Zależności do Instalacji

```bash
# Backend (jeśli potrzebne)
npm install axios cheerio

# Frontend (już zainstalowane)
# @tanstack/react-query
```

---

## 🧪 Testowanie

### 1. Test Backend Endpoint
```bash
# Uruchom serwer
npm run dev:api

# Test w osobnym terminalu
curl http://localhost:3001/api/ai-pricing | jq

# Test refresh
curl -X POST http://localhost:3001/api/ai-pricing/refresh | jq
```

### 2. Test Frontend Hook
```typescript
// W DevTools Console lub test component
const { pricing, refresh } = useAIPricing();
console.log(pricing);
await refresh();
```

---

## 📈 Metryki i Monitorowanie

### Dashboard Component (opcjonalny)
**Plik:** `src/components/PricingDashboard.tsx`

```typescript
export function PricingDashboard() {
  const { pricing, lastUpdated, dataSource, isLoading, refresh } = useAIPricing();

  if (isLoading) return <div>Ładowanie cen...</div>;

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">Pricing Dashboard</h3>
          <p className="text-sm text-gray-500">
            Ostatnia aktualizacja: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'N/A'}
          </p>
          <p className="text-xs text-gray-400">
            Źródło danych: {dataSource}
          </p>
        </div>

        <button
          onClick={refresh}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          🔄 Odśwież
        </button>
      </div>

      {/* Tabela porównawcza */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(pricing.models).map(([provider, models]) => (
          <div key={provider} className="border rounded p-2">
            <h4 className="font-medium capitalize mb-2">{provider}</h4>
            {models.map(model => (
              <div key={model.id} className="text-xs py-1">
                {model.name}: ${model.costPer1000Responses.toFixed(4)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ Checklist Implementacji

### Backend
- [ ] Stworzyć `server/pricing/` folder
- [ ] Implementować `pricingFetcher.js`
- [ ] Dodać endpoint `/api/ai-pricing` do `api-server.js`
- [ ] Dodać endpoint `/api/ai-pricing/refresh`
- [ ] Stworzyć folder `src/data/` dla cache
- [ ] Przetestować endpoints

### Frontend
- [ ] Stworzyć `src/types/pricing.ts`
- [ ] Implementować `src/hooks/useAIPricing.ts`
- [ ] Zaktualizować `SettingsPage.tsx` - OpenAI
- [ ] Zaktualizować `SettingsPage.tsx` - Claude
- [ ] Zaktualizować `SettingsPage.tsx` - Gemini
- [ ] Dodać `PricingDashboard` component (opcjonalnie)
- [ ] Przetestować w przeglądarce

### Testy
- [ ] Test endpoint `/api/ai-pricing`
- [ ] Test hook `useAIPricing`
- [ ] Test cache behavior (24h TTL)
- [ ] Test refresh functionality
- [ ] Test error handling / fallback

### Dokumentacja
- [ ] Zaktualizować README.md
- [ ] Dodać przykłady użycia
- [ ] Dokumentować API endpoints

---

## 🚀 Kolejne Kroki (Faza 2)

Po wdrożeniu podstawowej wersji:

1. **Dodać Web Scraping** dla rzeczywistych cen
   - Puppeteer dla stron z JS
   - Cheerio dla statycznych stron

2. **Dodać Historię Cen**
   - Zapisywać zmiany cen do bazy
   - Wykres trendów

3. **Dodać Alerty**
   - Email gdy cena zmienia się >10%
   - Notyfikacje o nowych modelach

4. **Dodać Cron Jobs**
   - Automatyczne odświeżanie co 24h
   - Scheduled scraping

---

## 📞 Troubleshooting

### Problem: Cache nie działa
**Rozwiązanie:** Sprawdź uprawnienia do zapisu w `src/data/`

### Problem: Endpoint zwraca stare dane
**Rozwiązanie:** Wywołaj `/api/ai-pricing/refresh` aby wymusić odświeżenie

### Problem: React Query nie refetchuje
**Rozwiązanie:** Sprawdź `staleTime` i `refetchInterval` w konfiguracji

---

**Plan przygotowany:** 2025-10-10
**Szacowany czas implementacji:** 3-4 godziny
**Poziom trudności:** Średni

