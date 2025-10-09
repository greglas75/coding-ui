# 🌐 API Filter Endpoint - Usage Guide

## 📋 Overview

The `/api/answers/filter` endpoint provides server-side filtering for coded answers. It's integrated with the `useFilters` hook for seamless filtering in React components.

**Endpoint:** `POST http://localhost:3001/api/answers/filter`

---

## 🚀 Quick Start

### 1. Start the API Server

```bash
npm run dev:api
# or
node api-server.js
```

The server will start on **http://localhost:3001**

### 2. Use in React Component

```tsx
import { useFilters } from '@/hooks/useFilters';
import { fetchFilteredAnswers } from '@/lib/apiClient';
import { useState, useEffect } from 'react';

function CodingView() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const { filters } = useFilters({
    onChange: async (filters) => {
      setLoading(true);
      try {
        const response = await fetchFilteredAnswers(filters, 1); // categoryId = 1
        setResults(response.results);
      } catch (error) {
        console.error('Filter failed:', error);
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div>
      {loading ? <Spinner /> : <DataTable data={results} />}
    </div>
  );
}
```

---

## 📝 Request Format

### Request Body

```json
{
  "search": "nike",
  "types": ["whitelist", "categorized"],
  "status": "Confirmed",
  "codes": ["Gucci", "Dior"],
  "language": "en",
  "country": "Poland",
  "categoryId": 1
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | `string` | No | Search query for answer text (case-insensitive) |
| `types` | `string[]` | No | Filter by general_status (whitelist, blacklist, etc.) |
| `status` | `string` | No | Filter by quick_status (Confirmed, etc.) |
| `codes` | `string[]` | No | Filter by selected codes |
| `language` | `string` | No | Filter by language code |
| `country` | `string` | No | Filter by country name |
| `categoryId` | `number` | No | Filter by category ID |

**Note:** All filters are optional. Empty values are ignored.

---

## 📤 Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "count": 42,
  "results": [
    {
      "id": 1,
      "answer_text": "Gucci",
      "translation_en": "Gucci",
      "language": "en",
      "country": "Poland",
      "quick_status": "Confirmed",
      "general_status": "whitelist",
      "selected_code": "Gucci",
      "ai_suggested_code": "Gucci",
      "category_id": 1,
      "coding_date": "2025-01-06T10:52:00Z",
      "created_at": "2025-01-06T10:52:00Z",
      "updated_at": "2025-01-06T10:52:00Z"
    }
  ],
  "mode": "supabase"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the request succeeded |
| `count` | `number` | Number of filtered results |
| `results` | `array` | Array of answer objects |
| `mode` | `string` | "supabase" or "mock" (indicates data source) |

### Error Response (500)

```json
{
  "success": false,
  "error": "Query failed",
  "details": "Error: invalid input syntax"
}
```

---

## 🧪 Testing the Endpoint

### Using cURL

```bash
curl -X POST http://localhost:3001/api/answers/filter \
  -H "Content-Type: application/json" \
  -d '{
    "search": "nike",
    "types": ["whitelist"],
    "categoryId": 1
  }'
```

### Using Postman

1. Create a POST request to `http://localhost:3001/api/answers/filter`
2. Set Headers: `Content-Type: application/json`
3. Add Body (raw JSON):
```json
{
  "search": "gucci",
  "types": ["whitelist", "categorized"],
  "language": "en"
}
```
4. Send request

### Using Browser Fetch

```javascript
const response = await fetch('http://localhost:3001/api/answers/filter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    search: 'nike',
    types: ['whitelist'],
    categoryId: 1
  })
});

const data = await response.json();
console.log('Results:', data.results);
```

---

## 🔧 Frontend Integration

### Option 1: With useFilters Hook (Recommended)

```tsx
import { useFilters } from '@/hooks/useFilters';
import { fetchFilteredAnswers } from '@/lib/apiClient';

function DashboardView() {
  const [answers, setAnswers] = useState([]);

  const { filters, setFilter, resetFilters } = useFilters({
    initialValues: { types: ['whitelist'] },
    onChange: async (filters) => {
      const { results } = await fetchFilteredAnswers(filters, 1);
      setAnswers(results);
    },
    debounceMs: 500,
  });

  return (
    <div>
      <input
        value={filters.search}
        onChange={(e) => setFilter('search', e.target.value)}
        placeholder="Search..."
      />
      
      <AnswersList answers={answers} />
    </div>
  );
}
```

### Option 2: Manual Fetching

```tsx
import { fetchFilteredAnswers } from '@/lib/apiClient';

async function loadData() {
  try {
    const response = await fetchFilteredAnswers({
      search: 'gucci',
      types: ['whitelist', 'categorized'],
      language: 'en',
    }, 1);

    console.log('Found:', response.count, 'answers');
    console.log('Data:', response.results);
  } catch (error) {
    console.error('Failed to load:', error);
  }
}
```

### Option 3: React Query Integration

```tsx
import { useQuery } from '@tanstack/react-query';
import { fetchFilteredAnswers } from '@/lib/apiClient';
import { useFilters } from '@/hooks/useFilters';

function DataView() {
  const { filters } = useFilters();

  const { data, isLoading, error } = useQuery({
    queryKey: ['answers', filters],
    queryFn: () => fetchFilteredAnswers(filters, 1),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <AnswersList answers={data?.results || []} />;
}
```

---

## 🔍 Filter Behavior

### Search (ILIKE)
- Case-insensitive
- Partial match on `answer_text`
- Example: `"nike"` matches "Nike", "Nike shoes", "NIKE"

### Types (IN)
- Multi-select filter on `general_status`
- Matches any of the provided types
- Example: `["whitelist", "categorized"]` returns records with either status

### Status (EQ)
- Exact match on `quick_status`
- Single value
- Example: `"Confirmed"` returns only Confirmed records

### Codes (Client-side filter)
- Filters on comma-separated `selected_code` field
- Case-insensitive partial match
- Example: `["Gucci"]` matches "Gucci", "Gucci, Dior", etc.

### Language (EQ)
- Exact match on `language`
- Example: `"en"` matches English records

### Country (EQ)
- Exact match on `country`
- Example: `"Poland"` matches Polish records

### Category ID (EQ)
- Exact match on `category_id`
- Recommended to always include for performance
- Example: `1` returns only records from category 1

---

## 🎭 Mock Mode vs Supabase Mode

### Mock Mode
- Activated when Supabase credentials are missing
- Returns 3 hardcoded demo records
- Useful for development without database
- Response includes `"mode": "mock"`

### Supabase Mode
- Activated when credentials are present in `.env`
- Queries real database
- Response includes `"mode": "supabase"`
- Supports all filters with optimal performance

---

## ⚙️ Configuration

### Environment Variables

Create/update `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
OPENAI_API_KEY=your-openai-key-here
```

### API Server Port

Default: **3001**

To change, edit `api-server.js`:
```javascript
const port = 3001; // Change to your preferred port
```

---

## 🐛 Troubleshooting

### API Server Not Running

**Error:** `Failed to fetch` or `ECONNREFUSED`

**Solution:**
```bash
npm run dev:api
# or
node api-server.js
```

### CORS Errors

**Error:** `Access-Control-Allow-Origin`

**Solution:** CORS is already enabled in `api-server.js`. If issues persist:
```javascript
app.use(cors({
  origin: 'http://localhost:5173', // Your Vite dev server
  credentials: true
}));
```

### Supabase Connection Failed

**Error:** `Supabase query failed`

**Solution:**
1. Check `.env` has correct credentials
2. Verify Supabase project is active
3. Check RLS policies allow access
4. API will fall back to mock mode automatically

### No Results Returned

**Possible causes:**
- Filters are too restrictive
- Category ID doesn't exist
- Data doesn't match filter criteria

**Debug:**
```bash
# Check API server logs for filter details
# Look for: 🔍 Filter request: { ... }
```

---

## 📊 Performance Tips

1. **Always include categoryId** - Significantly reduces query size
2. **Use debounced search** - Prevents excessive API calls (default 300ms)
3. **Limit filter complexity** - Too many filters may slow response
4. **Monitor response times** - Typical: <100ms for filtered queries
5. **Consider pagination** - Current limit: 100 records per request

---

## 🔐 Security Notes

⚠️ **Current setup uses anonymous Supabase key** - suitable for development only.

For production:
- Use service role key with proper RLS policies
- Add authentication middleware
- Validate all input parameters
- Rate limit the endpoint
- Add request logging

---

## ✅ Health Check

Test if API is running:

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-06T12:00:00.000Z",
  "supabaseConfigured": true
}
```

Or use the helper:
```typescript
import { checkAPIHealth, isAPIAvailable } from '@/lib/apiClient';

const health = await checkAPIHealth();
console.log('API status:', health.status);

const available = await isAPIAvailable();
console.log('API available:', available);
```

---

## 📚 Related Documentation

- [useFilters Hook](./USEFILTERS_INTEGRATION_GUIDE.md)
- [API Client](../src/lib/apiClient.ts)
- [Query Optimization](./sql/2025-query-optimization-audit.sql)

---

**Created:** 2025-01-06  
**Status:** ✅ Ready to use  
**Endpoint:** `POST http://localhost:3001/api/answers/filter`

