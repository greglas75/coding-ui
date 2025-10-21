# How to Apply Sentiment Analysis Migration

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20250103000000_add_sentiment_analysis.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. Wait for completion (should take 5-10 seconds)
8. Check for success messages in the output

## Option 2: Using Supabase CLI

```bash
# Make sure you're in the project directory
cd /Users/greglas/coding-ui

# Link to your Supabase project (if not already linked)
supabase link --project-ref hoanegucluoshmpoxfnl

# Push the migration
supabase db push
```

## Option 3: Direct PostgreSQL Connection

If you have direct database access:

```bash
# Get your connection string from Supabase Dashboard > Project Settings > Database
# It looks like: postgresql://postgres:[password]@[host]:5432/postgres

psql "your-connection-string-here" -f supabase/migrations/20250103000000_add_sentiment_analysis.sql
```

## Verification

After applying the migration, verify it worked:

### 1. Check Categories Table

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name LIKE 'sentiment%';
```

**Expected output:**
```
     column_name     | data_type
---------------------+-----------
 sentiment_enabled   | boolean
 sentiment_mode      | character varying
```

### 2. Check Answers Table

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'answers'
  AND column_name LIKE 'sentiment%';
```

**Expected output:**
```
         column_name         |     data_type
-----------------------------+-------------------
 sentiment                   | character varying
 sentiment_score             | numeric
 sentiment_confidence        | numeric
 sentiment_applicable        | boolean
 sentiment_reasoning         | text
```

### 3. Test Functions

```sql
-- Should return without error
SELECT * FROM get_sentiment_stats(1);

-- Should return without error
SELECT * FROM get_sentiment_by_code(1);
```

### 4. Test API Endpoint

```bash
curl http://localhost:3020/api/v1/sentiment/cost-estimate
```

**Expected response:**
```json
{
  "cost_without": "0.000060",
  "cost_with": "0.000180",
  "difference": "0.000120",
  "percentage_increase": 20,
  "notes": [
    "Sentiment adds ~20% to categorization cost",
    "Smart mode reduces cost by skipping non-applicable answers",
    "Cost is per-answer, one-time (results cached)"
  ]
}
```

## Troubleshooting

### Error: "column already exists"

This is safe to ignore - it means the column was already added (migration is idempotent).

### Error: "function already exists"

This is safe to ignore - the migration uses `CREATE OR REPLACE FUNCTION`.

### Error: "permission denied"

You need to use a privileged connection (service role key or direct database access).

### Migration appears to hang

Some parts of the migration use DO blocks which may take a few seconds. Wait up to 30 seconds.

## What the Migration Does

1. **Categories Table:**
   - Adds `sentiment_enabled` (boolean, default false)
   - Adds `sentiment_mode` (varchar, default 'smart')
   - Adds check constraint for mode values
   - Creates index on sentiment_enabled

2. **Answers Table:**
   - Adds `sentiment` (varchar: positive/neutral/negative/mixed)
   - Adds `sentiment_score` (decimal 0-1)
   - Adds `sentiment_confidence` (decimal 0-1)
   - Adds `sentiment_applicable` (boolean)
   - Adds `sentiment_reasoning` (text)
   - Adds check constraints for valid values
   - Creates 3 indexes for filtering

3. **AI Usage Logs:**
   - Updates feature_type constraint to include 'sentiment'

4. **Functions:**
   - Creates `get_sentiment_stats(category_id)` - Overall statistics
   - Creates `get_sentiment_by_code(category_id)` - Per-code breakdown

## After Migration

Once the migration is applied successfully:

1. ✅ Restart your development server (if running)
2. ✅ Test the API endpoints
3. ✅ Open a category settings modal in the UI
4. ✅ You should see the new "Sentiment Analysis" section
5. ✅ Enable sentiment and test with a few answers

## Need Help?

Check the full documentation:
- `docs/SENTIMENT_QUICK_START.md` - Getting started guide
- `docs/SENTIMENT_IMPLEMENTATION_STATUS.md` - Implementation details
