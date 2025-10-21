# AI Cost Tracking - Setup Guide

## Summary

This document guides you through setting up the unified AI cost tracking system for the TGM Research Coding & AI Categorization Dashboard.

## What Was Built

### 1. **Cost Dashboard API** ✅ COMPLETE
- **Location**: `routes/costDashboard.js`, `services/costDashboardService.js`
- **Endpoints**: 8 REST API endpoints for cost tracking
- **Status**: Fully implemented and integrated into `api-server.js`

### 2. **Budget Protection Middleware** ✅ COMPLETE
- **Location**: `middleware/budgetCheck.js`
- **Purpose**: Prevents AI operations when budget limits are exceeded
- **Status**: Ready to use

### 3. **Database Migration** ⏳ NEEDS MANUAL EXECUTION
- **Location**: `supabase/migrations/20250102000000_create_unified_ai_cost_tracking.sql`
- **Purpose**: Creates `ai_usage_logs` table and supporting infrastructure
- **Status**: SQL file created, needs to be run in Supabase dashboard

---

## 🚨 ACTION REQUIRED: Apply Database Migration

The database schema needs to be created before the API endpoints will work.

### Option 1: Quick Setup (Recommended)

1. **Open Supabase SQL Editor**:
   ```
   https://supabase.com/dashboard/project/hoanegucluoshmpoxfnl/sql/new
   ```

2. **Copy and paste this SQL**:

\`\`\`sql
-- Create ai_usage_logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN ('answer_coding', 'codeframe_generation')),
    user_id UUID,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES codeframe_generations(id) ON DELETE SET NULL,
    answer_id INTEGER REFERENCES answers(id) ON DELETE SET NULL,
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_feature_type ON ai_usage_logs(feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_date ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_category ON ai_usage_logs(category_id);

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY IF NOT EXISTS "Service role has full access"
    ON ai_usage_logs FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- Allow insert for all (for logging)
CREATE POLICY IF NOT EXISTS "Allow all inserts"
    ON ai_usage_logs FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- Allow SELECT for development
CREATE POLICY IF NOT EXISTS "Allow all selects"
    ON ai_usage_logs FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

-- Add AI cost columns to codeframe_generations if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'codeframe_generations' AND column_name = 'ai_model') THEN
        ALTER TABLE codeframe_generations ADD COLUMN ai_model VARCHAR(100);
        ALTER TABLE codeframe_generations ADD COLUMN ai_input_tokens INTEGER;
        ALTER TABLE codeframe_generations ADD COLUMN ai_output_tokens INTEGER;
        ALTER TABLE codeframe_generations ADD COLUMN ai_cost_usd DECIMAL(10, 6);
        RAISE NOTICE 'Added AI cost columns to codeframe_generations';
    END IF;
END $$;
\`\`\`

3. **Click "Run"** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

4. **Verify** by running:
   \`\`\`bash
   cd /Users/greglas/coding-ui
   node simple-migration.js
   \`\`\`

### Option 2: Full Migration (Advanced)

For the complete migration with helper functions and triggers:

1. Open the full migration file:
   ```
   supabase/migrations/20250102000000_create_unified_ai_cost_tracking.sql
   ```

2. Copy entire contents to Supabase SQL Editor

3. Run it

---

## Verification Steps

After running the SQL:

### 1. Verify Table Creation
\`\`\`bash
node simple-migration.js
\`\`\`

Expected output:
\`\`\`
✅ ai_usage_logs table verified! Current rows: 0
\`\`\`

### 2. Test API Endpoints

\`\`\`bash
# Test overview endpoint
curl http://localhost:3001/api/v1/cost-dashboard/overview | jq .

# Test budget endpoint
curl http://localhost:3001/api/v1/cost-dashboard/budget | jq .

# Test daily trend
curl "http://localhost:3001/api/v1/cost-dashboard/trend?period=daily&days=7" | jq .
\`\`\`

Expected: JSON responses (may be empty initially, that's fine)

---

## API Endpoints Reference

All endpoints are mounted at `/api/v1/cost-dashboard/`:

### 1. GET `/overview`
Get cost overview for a time period.

**Query params**:
- `period`: `today` | `this_week` | `this_month` | `last_month` | `custom`
- `start_date`: ISO date (for custom period)
- `end_date`: ISO date (for custom period)

**Example**:
\`\`\`bash
curl "http://localhost:3001/api/v1/cost-dashboard/overview?period=this_month"
\`\`\`

### 2. GET `/trend`
Get cost trend over time.

**Query params**:
- `period`: `daily` | `weekly` | `monthly`
- `days`: number of days (for daily, default 30)
- `weeks`: number of weeks (for weekly, default 12)
- `months`: number of months (for monthly, default 6)

**Example**:
\`\`\`bash
curl "http://localhost:3001/api/v1/cost-dashboard/trend?period=daily&days=7"
\`\`\`

### 3. GET `/detailed`
Get detailed cost breakdown with pagination.

**Query params**:
- `feature_type`: `all` | `answer_coding` | `codeframe_generation`
- `start_date`: ISO date
- `end_date`: ISO date
- `limit`: number (default 50, max 200)
- `offset`: number (default 0)
- `sort`: `date_desc` | `date_asc` | `cost_desc` | `cost_asc`

**Example**:
\`\`\`bash
curl "http://localhost:3001/api/v1/cost-dashboard/detailed?limit=10&feature_type=answer_coding"
\`\`\`

### 4. GET `/budget`
Get current budget status.

**Example**:
\`\`\`bash
curl http://localhost:3001/api/v1/cost-dashboard/budget
\`\`\`

**Response**:
\`\`\`json
{
  "monthly_limit": 200,
  "used": 0,
  "remaining": 200,
  "percentage": 0,
  "alert_threshold": 80,
  "is_alert": false,
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-02-01T00:00:00Z"
}
\`\`\`

### 5. PUT `/budget`
Update budget settings.

**Body**:
\`\`\`json
{
  "monthly_limit": 300,
  "alert_threshold": 90,
  "auto_pause": false
}
\`\`\`

**Example**:
\`\`\`bash
curl -X PUT http://localhost:3001/api/v1/cost-dashboard/budget \
  -H "Content-Type: application/json" \
  -d '{"monthly_limit": 300, "alert_threshold": 90}'
\`\`\`

### 6. GET `/export`
Export cost data as CSV.

**Example**:
\`\`\`bash
curl "http://localhost:3001/api/v1/cost-dashboard/export?feature_type=all" > costs.csv
\`\`\`

### 7. GET `/predictions`
Get cost predictions for end of month.

**Example**:
\`\`\`bash
curl http://localhost:3001/api/v1/cost-dashboard/predictions
\`\`\`

---

## Database Schema

### `ai_usage_logs` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `feature_type` | VARCHAR(50) | `'answer_coding'` or `'codeframe_generation'` |
| `user_id` | UUID | User who triggered the operation (nullable) |
| `category_id` | INTEGER | Related category |
| `generation_id` | UUID | Related codeframe generation (nullable) |
| `answer_id` | INTEGER | Related answer (nullable) |
| `model` | VARCHAR(100) | AI model used (e.g., `'gpt-4o-mini'`, `'claude-sonnet-4-5-20251022'`) |
| `input_tokens` | INTEGER | Number of input tokens |
| `output_tokens` | INTEGER | Number of output tokens |
| `cost_usd` | DECIMAL(10,6) | Cost in USD |
| `metadata` | JSONB | Additional feature-specific data |
| `created_at` | TIMESTAMPTZ | Timestamp |

### Indexes
- `idx_ai_usage_logs_feature_type` on `feature_type`
- `idx_ai_usage_logs_created_at` on `created_at DESC`
- `idx_ai_usage_logs_user_date` on `(user_id, created_at DESC)`
- `idx_ai_usage_logs_category` on `category_id`

---

## Budget Protection Middleware

Use the budget check middleware to prevent expensive operations when budget is exceeded:

\`\`\`javascript
import { checkBudget, checkBudgetStrict } from './middleware/budgetCheck.js';

// Option 1: Block at 100% budget
router.post('/api/expensive-operation', checkBudget, async (req, res) => {
  // Operation only runs if budget not exceeded
});

// Option 2: Block at alert threshold (stricter)
router.post('/api/critical-operation', checkBudgetStrict, async (req, res) => {
  // Operation only runs if below alert threshold
});
\`\`\`

---

## Files Created

| File | Purpose | Status |
|------|---------|--------|
| `routes/costDashboard.js` | REST API routes | ✅ Complete |
| `services/costDashboardService.js` | Business logic | ✅ Complete |
| `middleware/budgetCheck.js` | Budget protection | ✅ Complete |
| `supabase/migrations/20250102000000_create_unified_ai_cost_tracking.sql` | Database schema | ⏳ Needs execution |
| `docs/AI_COST_TRACKING_SETUP.md` | This document | ✅ Complete |

---

## Next Steps

1. ✅ **Run the SQL migration** (see above)
2. ✅ **Verify table creation** with `node simple-migration.js`
3. ✅ **Test API endpoints** with curl commands
4. ✅ **Integrate budget middleware** into expensive routes
5. ⏳ **Monitor costs** as AI operations run
6. ⏳ **Set up alerts** when approaching budget limits

---

## Troubleshooting

### Issue: "ai_usage_logs does not exist"
**Solution**: Run the SQL migration in Supabase dashboard (see above)

### Issue: "codeframe_generations missing ai_cost_usd column"
**Solution**: The migration SQL includes ALTER TABLE to add missing columns

### Issue: API endpoints return empty data
**This is expected** when no AI operations have run yet. The table is empty initially.

To test with sample data, run:
\`\`\`sql
INSERT INTO ai_usage_logs (
    feature_type, category_id, model, input_tokens, output_tokens, cost_usd, metadata
) VALUES (
    'answer_coding', 1, 'gpt-4o-mini', 1500, 250, 0.000375, '{"confidence": 0.95}'::jsonb
);
\`\`\`

---

## Support

For questions or issues:
1. Check this document first
2. Review the migration SQL file
3. Check Supabase logs in dashboard
4. Test with curl commands to isolate issues

---

**Generated**: 2025-10-21
**Author**: Claude Code
**Version**: 1.0
