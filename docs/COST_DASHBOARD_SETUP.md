# AI Cost Dashboard - Setup Guide

This guide walks you through setting up the AI Cost Dashboard from scratch.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL/Supabase database
- Express API server running
- React frontend (Vite)
- Supabase CLI (optional, for migrations)

## Step 1: Database Migration

### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd /path/to/coding-ui

# Run the migration
supabase db push

# Or manually apply the migration
psql -h your-db-host -U your-user -d your-database -f supabase/migrations/20250102000000_create_unified_ai_cost_tracking.sql
```

### Option B: Manual SQL Execution

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Paste the contents of `ai-cost-migration-FIXED-v2.sql`
4. Click "Run"
5. Verify: "Success. No rows returned"

### Verify Migration

Check that the table was created:

```sql
-- Check table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'ai_usage_logs';

-- Check structure
\d ai_usage_logs

-- Should show columns:
-- - id (UUID)
-- - feature_type (VARCHAR)
-- - user_id (UUID, nullable)
-- - category_id (INTEGER, nullable)
-- - generation_id (UUID, nullable)
-- - answer_id (INTEGER, nullable)
-- - model (VARCHAR)
-- - input_tokens (INTEGER)
-- - output_tokens (INTEGER)
-- - cost_usd (DECIMAL)
-- - metadata (JSONB)
-- - created_at (TIMESTAMPTZ)
```

## Step 2: Backend Setup

### Files Installed

The following files should already exist:
- `routes/costDashboard.js` - REST API routes
- `services/costDashboardService.js` - Business logic
- `middleware/budgetCheck.js` - Budget protection

### Verify API Integration

Check that `api-server.js` includes:

```javascript
import costDashboardRoutes from './routes/costDashboard.js';

// ...

app.use('/api/v1/cost-dashboard', costDashboardRoutes);
```

### Test Backend Endpoints

```bash
# Start API server
node api-server.js

# Test in another terminal:

# 1. Test overview
curl http://localhost:3001/api/v1/cost-dashboard/overview

# 2. Test budget
curl http://localhost:3001/api/v1/cost-dashboard/budget

# 3. Test trend
curl http://localhost:3001/api/v1/cost-dashboard/trend?period=daily

# 4. Test predictions
curl http://localhost:3001/api/v1/cost-dashboard/predictions

# 5. Test detailed
curl http://localhost:3001/api/v1/cost-dashboard/detailed
```

Expected response (empty data initially):
```json
{
  "period": {"start": "...", "end": "...", "label": "..."},
  "total_cost_usd": 0,
  "breakdown": {
    "answer_coding": {"cost_usd": 0, "total_items": 0, ...},
    "codeframe_generation": {"cost_usd": 0, "total_items": 0, ...}
  },
  ...
}
```

## Step 3: Frontend Setup

### Files Installed

TypeScript types:
- `src/types/cost-dashboard.ts`

Custom hooks:
- `src/hooks/useCostOverview.ts`
- `src/hooks/useCostTrend.ts`
- `src/hooks/useCostDetailed.ts`
- `src/hooks/useCostPredictions.ts`

UI Components:
- `src/components/CostDashboard/OverviewCards.tsx`
- `src/components/CostDashboard/BudgetStatus.tsx`
- `src/components/CostDashboard/PredictionCard.tsx`
- `src/components/CostDashboard/BreakdownChart.tsx`
- `src/components/CostDashboard/TrendChart.tsx`
- `src/components/CostDashboard/DetailedTable.tsx`

Main page:
- `src/pages/CostDashboardPage.tsx`

### Verify Route Configuration

Check `src/App.tsx`:

```typescript
// Import
const CostDashboardPage = lazy(() => import("./pages/CostDashboardPage"));

// Route
<Route path="/cost-dashboard" element={<CostDashboardPage />} />
```

Check `src/components/AppHeader.tsx`:

```typescript
// Import
import { DollarSign } from 'lucide-react';

// Navigation link
<Link to="/cost-dashboard" ...>
  <DollarSign size={16} />
  Costs
</Link>
```

### Test Frontend

```bash
# Start dev server
npm run dev

# Open browser
open http://localhost:5173/cost-dashboard
```

You should see:
- Dashboard header "AI Cost Dashboard"
- Three overview cards (all showing $0.00)
- Budget status section
- End-of-month projection
- Two charts (breakdown and trend)
- Detailed cost table (empty)

## Step 4: Environment Variables

Ensure your `.env` file has:

```bash
# API Base URL
VITE_API_URL=http://localhost:3001

# Supabase (if using)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Database
DATABASE_URL=postgresql://user:password@host:5432/database
```

## Step 5: Integration with Existing Features

### Answer Coding Integration

When answers are categorized with AI, log the cost:

```javascript
import { supabase } from './supabaseClient.js';

async function categorizeAnswers(answers, categoryId) {
  // ... existing categorization logic ...

  // After successful categorization
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .insert({
      feature_type: 'answer_coding',
      category_id: categoryId,
      answer_id: answerId, // if single answer
      model: 'gpt-4o-mini',
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens,
      cost_usd: calculateCost(response.usage),
      metadata: {
        category_name: categoryName,
        answers_count: answers.length
      }
    });
}
```

### Codeframe Generation Integration

When codeframes are generated, log the cost:

```javascript
async function generateCodeframe(prompt, samples) {
  // ... existing generation logic ...

  // After successful generation
  await supabase
    .from('ai_usage_logs')
    .insert({
      feature_type: 'codeframe_generation',
      generation_id: generationId, // from codeframe_generations table
      model: 'claude-sonnet-4-5',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cost_usd: calculateCost(response.usage),
      metadata: {
        samples_count: samples.length,
        codes_generated: codeframe.codes.length
      }
    });
}
```

## Step 6: Budget Protection (Optional)

### Enable Budget Check Middleware

In your answer coding and codeframe routes:

```javascript
import { checkBudget } from './middleware/budgetCheck.js';

// Protect expensive endpoints
router.post('/api/answers/categorize', checkBudget, categorizeAnswers);
router.post('/api/codeframe/generate', checkBudget, generateCodeframe);
```

This will return `429 Too Many Requests` if budget is exceeded.

### Configure Budget Settings

Update default budget via API:

```bash
curl -X PUT http://localhost:3001/api/v1/cost-dashboard/budget \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_limit": 500,
    "alert_threshold": 85
  }'
```

## Step 7: Testing

### Run Integration Tests

```bash
# Start both servers
node api-server.js &
npm run dev &

# Run tests
npm test tests/cost-dashboard.integration.test.js
```

### Run E2E Tests

```bash
# Make sure servers are running
npx playwright test e2e/tests/cost-dashboard.spec.ts
```

## Step 8: Load Sample Data (Optional)

For testing purposes, you can load sample data:

```bash
# Run the seed script
psql -h your-db-host -U your-user -d your-database -f scripts/seed-cost-data.sql
```

This creates:
- 100 sample answer coding operations
- 10 sample codeframe generations
- Distributed over the last 30 days

After seeding, refresh the dashboard to see populated charts and data.

## Verification Checklist

- [ ] Database migration applied successfully
- [ ] `ai_usage_logs` table exists with correct schema
- [ ] API server starts without errors
- [ ] All 8 API endpoints return valid JSON
- [ ] Frontend dev server runs without errors
- [ ] Dashboard accessible at `/cost-dashboard`
- [ ] Navigation link visible in header
- [ ] All dashboard sections render (even if empty)
- [ ] No console errors in browser
- [ ] Dark mode works correctly
- [ ] Mobile responsive layout works

## Troubleshooting

### Database Issues

**Error: Table does not exist**
```
Solution: Re-run the migration SQL file
```

**Error: Invalid UUID for user_id**
```
Solution: Ensure you're passing null or valid UUID, not strings
Check: routes/costDashboard.js uses `null` not 'service-user'
```

**Error: RLS policy blocks access**
```
Solution: Verify RLS policies allow service_role access
Check: Migration includes proper policies for service_role
```

### API Issues

**Error: 404 Not Found**
```
Solution: Verify route mounting in api-server.js
Check: app.use('/api/v1/cost-dashboard', costDashboardRoutes)
```

**Error: Cannot read property of undefined**
```
Solution: Check Supabase client initialization
Verify: Environment variables are set correctly
```

**Error: CORS issues**
```
Solution: Ensure CORS is configured in Express
Check: api-server.js has proper CORS settings
```

### Frontend Issues

**Error: Module not found**
```
Solution: Check all imports use correct paths
Verify: File names match exactly (case-sensitive)
```

**Error: Recharts not rendering**
```
Solution: Install recharts if missing
Run: npm install recharts
```

**Error: Network request failed**
```
Solution: Verify API server is running on port 3001
Check: VITE_API_URL in .env
```

### Data Not Appearing

**Dashboard shows all zeros**
```
This is normal if no AI features have been used yet.
Solution: Use answer coding or codeframe generation, then refresh.
Or: Load sample data using seed script.
```

**Old data not showing**
```
Check: Time period selector is set correctly
Verify: Database has data in the selected date range
```

## Next Steps

1. **Integrate Cost Logging** - Add logging to your AI feature functions
2. **Set Your Budget** - Configure appropriate monthly limits
3. **Monitor Regularly** - Check dashboard weekly
4. **Optimize Usage** - Use data to identify cost-saving opportunities
5. **Export Reports** - Download monthly CSV reports for accounting

## Support

For issues or questions:
- Check logs: Browser console and server logs
- Review documentation: [COST_DASHBOARD.md](./COST_DASHBOARD.md)
- Check GitHub issues
- Contact system administrator

---

**Installation Complete!** 🎉

Your AI Cost Dashboard is now ready to track and manage AI expenses.

Visit: `http://localhost:5173/cost-dashboard`
