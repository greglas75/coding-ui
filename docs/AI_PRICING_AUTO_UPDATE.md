# 🤖 Automatyczna Aktualizacja Cen i Modeli AI

## 📋 Przegląd

Ten dokument opisuje jak automatycznie aktualizować:
1. **Ceny modeli AI** - żeby zawsze mieć aktualne koszty
2. **Listę dostępnych modeli** - żeby automatycznie wykrywać nowe modele

---

## 💰 Automatyczna Aktualizacja Cen

### Opcja 1: JSON Config File (Najprostsza) ⭐ **Polecana**

Stwórz plik `src/config/ai-pricing.json`:

```json
{
  "lastUpdated": "2025-10-10",
  "models": {
    "openai": {
      "gpt-5": {
        "name": "GPT-5",
        "costPer1M": 15.0,
        "costPer1000Responses": 1.50,
        "quality": 10,
        "speed": "slow"
      },
      "gpt-4o": {
        "name": "GPT-4o",
        "costPer1M": 5.0,
        "costPer1000Responses": 0.50,
        "quality": 9,
        "speed": "fast"
      },
      "gpt-4o-mini": {
        "name": "GPT-4o Mini",
        "costPer1M": 0.15,
        "costPer1000Responses": 0.015,
        "quality": 8,
        "speed": "fastest"
      }
    },
    "anthropic": {
      "claude-sonnet-4.5": {
        "name": "Claude Sonnet 4.5",
        "costPer1M": 3.0,
        "costPer1000Responses": 0.30,
        "quality": 10,
        "speed": "fast"
      },
      "claude-opus-4": {
        "name": "Claude Opus 4",
        "costPer1M": 15.0,
        "costPer1000Responses": 1.50,
        "quality": 9.5,
        "speed": "slow"
      }
    },
    "google": {
      "gemini-2.0-pro-exp": {
        "name": "Gemini 2.0 Pro Experimental",
        "costPer1M": 2.5,
        "costPer1000Responses": 0.25,
        "quality": 9.5,
        "speed": "fast"
      },
      "gemini-2.0-flash": {
        "name": "Gemini 2.0 Flash",
        "costPer1M": 0.075,
        "costPer1000Responses": 0.0075,
        "quality": 8.5,
        "speed": "fastest"
      }
    }
  }
}
```

**Wczytywanie w kodzie:**
```typescript
import pricingData from './config/ai-pricing.json';

// Użycie
const openAIModels = pricingData.models.openai;
const gpt5Cost = openAIModels['gpt-5'].costPer1000Responses;
```

**Aktualizacja:** Ręcznie edytujesz plik JSON co miesiąc lub kwartalnie.

---

### Opcja 2: API Endpoint (Bardziej Zaawansowane)

Stwórz własny backend endpoint który pobiera ceny:

```typescript
// api-server.js lub osobny endpoint
app.get('/api/ai-pricing', async (req, res) => {
  try {
    // Możesz:
    // 1. Scrape'ować strony pricing providerów
    // 2. Użyć zewnętrznego API (np. llmpricing.co API)
    // 3. Pobrać z własnej bazy danych

    const pricing = {
      lastUpdated: new Date().toISOString(),
      models: {
        // ... struktura jak wyżej
      }
    };

    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});
```

**Frontend:**
```typescript
// src/hooks/useAIPricing.ts
export function useAIPricing() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-pricing'],
    queryFn: async () => {
      const response = await fetch('/api/ai-pricing');
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache na 24h
  });

  return { pricing: data, isLoading };
}
```

---

### Opcja 3: Zewnętrzne API (LLM Pricing Services)

Istnieją serwisy które śledzą ceny AI modeli:

```typescript
// Przykład z hypothetical API
const response = await fetch('https://llmpricing.co/api/v1/pricing', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

const pricing = await response.json();
```

**Znane serwisy:**
- [LLMPrices.dev](https://llmprices.dev) - Open source pricing tracker
- Można też użyć GitHub Actions do automatycznego scrapowania

---

## 🆕 Automatyczna Aktualizacja Modeli

### Opcja 1: Oficjalne API Providerów

Niestety większość providerów nie ma dedykowanego API do listowania modeli, ale można:

#### OpenAI:
```typescript
// OpenAI ma endpoint do listowania modeli
const response = await fetch('https://api.openai.com/v1/models', {
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});

const models = await response.json();
// Zwraca: { data: [{ id: 'gpt-4o', ... }, ...] }
```

#### Anthropic & Google:
Nie mają publicznych API do listowania modeli - trzeba śledzić ręcznie lub monitorować ich blogi/dokumentację.

---

### Opcja 2: GitHub Actions + Web Scraping

Stwórz GitHub Action który:
1. Codziennie sprawdza strony pricing providerów
2. Wykrywa nowe modele
3. Automatycznie tworzy PR z aktualizacją

```yaml
# .github/workflows/update-ai-models.yml
name: Update AI Models

on:
  schedule:
    - cron: '0 0 * * *' # Codziennie o północy
  workflow_dispatch: # Ręczne uruchomienie

jobs:
  update-models:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check OpenAI Models
        run: |
          curl https://api.openai.com/v1/models \
            -H "Authorization: Bearer ${{ secrets.OPENAI_API_KEY }}" \
            > openai-models.json

      - name: Scrape Anthropic Pricing
        run: |
          # Użyj puppeteer lub cheerio do scraping
          node scripts/scrape-anthropic.js

      - name: Update Config Files
        run: node scripts/update-pricing-config.js

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'chore: Update AI models and pricing'
          body: 'Automated update of AI models and pricing data'
          branch: update-ai-pricing
```

---

### Opcja 3: RSS/Newsletter Monitoring

Subskrybuj oficjalne kanały providerów:
- **OpenAI**: https://openai.com/blog/rss
- **Anthropic**: https://www.anthropic.com/news
- **Google AI**: https://ai.googleblog.com

Możesz użyć IFTTT lub Zapier do automatycznego powiadomienia o nowych modelach.

---

## 🎯 Polecana Strategia

### Dla małych projektów:
1. ✅ **JSON config file** (`ai-pricing.json`)
2. ✅ Ręczna aktualizacja co 1-3 miesiące
3. ✅ Dodaj reminder w kalendarzu

### Dla średnich projektów:
1. ✅ **Backend endpoint** z cache
2. ✅ Scraping stron pricing raz dziennie
3. ✅ Notyfikacje email przy zmianach cen >10%

### Dla dużych projektów:
1. ✅ **Dedykowany serwis** do monitorowania cen
2. ✅ GitHub Actions z automatycznymi PR
3. ✅ Dashboard do śledzenia trendów cenowych
4. ✅ Alerty przy nowych modelach

---

## 📊 Przykładowy Dashboard

Możesz dodać na stronie Settings:

```typescript
function PricingDashboard() {
  const { pricing, lastUpdated } = useAIPricing();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4">
      <h3>Pricing Dashboard</h3>
      <p className="text-sm text-zinc-500">
        Last updated: {formatDate(lastUpdated)}
      </p>

      {/* Wykres trendów cenowych */}
      <PricingTrendChart data={pricing.history} />

      {/* Porównanie kosztów */}
      <ModelCostComparison models={pricing.models} />
    </div>
  );
}
```

---

## 🔗 Przydatne Linki

### Oficjalne cenniki:
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [Google AI Pricing](https://ai.google.dev/pricing)

### Community Resources:
- [Artificial Analysis](https://artificialanalysis.ai/) - Porównania modeli
- [LLM Price Check](https://llmpricecheck.com/) - Tracker cen
- [OpenRouter](https://openrouter.ai/) - Unified API z aktualnymi cenami

---

## 📝 Notatki

1. **Ceny mogą się różnić** w zależności od:
   - Wielkości użycia (volume discounts)
   - Regionu geograficznego
   - Typu użycia (batch vs streaming)

2. **Estymowane koszty** w aplikacji zakładają:
   - Średnią długość promptu: ~200 tokenów
   - Średnią długość odpowiedzi: ~100 tokenów
   - Total: ~300 tokenów na request

3. **Monitoruj rzeczywiste koszty** w dashboardach providerów:
   - OpenAI: https://platform.openai.com/usage
   - Anthropic: https://console.anthropic.com/settings/usage
   - Google: https://console.cloud.google.com/

---

## ✅ To-Do dla Automatyzacji

- [ ] Stworzyć `ai-pricing.json` config file
- [ ] Dodać hook `useAIPricing()` do wczytywania cen
- [ ] Zaktualizować SettingsPage aby używał dynamicznych cen
- [ ] Dodać endpoint `/api/ai-pricing` (opcjonalnie)
- [ ] Skonfigurować GitHub Action do monitorowania (opcjonalnie)
- [ ] Dodać dashboard z historią cen (opcjonalnie)

---

**Last Updated:** 2025-10-10

