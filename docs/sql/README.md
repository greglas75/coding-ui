# SQL Migrations

## How to apply migrations

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the content from the migration file
4. Paste into the SQL Editor
5. Click **Run**

## Migration Files

- `2025-answers-dashboard.sql` - Add new columns for enhanced coding dashboard
- `2025-answers-codes.sql` - Create codes table and answer_codes pivot table
- `2025-codes-and-relations.sql` - Create codes table with categories relations and auto-assign trigger
- `2025-categories-ui.sql` - Create categories table and assign all existing codes to "Home Fragrances"
