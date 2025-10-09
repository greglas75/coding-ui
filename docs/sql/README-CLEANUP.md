# 🗑️ Database Cleanup Scripts

## Overview
This folder contains SQL scripts to clean test data from your Supabase database.

---

## 📁 Available Scripts

### 1. `clean-test-data.sql` - **Complete Cleanup**
**⚠️ WARNING: This deletes ALL data!**

**What it does:**
- Deletes all answers
- Deletes all codes
- Deletes all categories
- Deletes all code-category relationships
- Resets ID sequences to start from 1

**When to use:**
- Starting fresh with a clean database
- Removing all test data
- Development/testing environment reset

**How to use:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy entire content of `clean-test-data.sql`
4. Run the script
5. Verify results in the output table

---

### 2. `clean-selective-test-data.sql` - **Selective Cleanup**
**✅ Safer: Only removes data matching patterns**

**What it does:**
- Deletes answers/codes/categories containing "test", "sample", "demo"
- Cleans orphaned relationships
- Keeps production data intact

**When to use:**
- Mixed production + test data
- Want to keep some data
- Selective cleanup

**How to use:**
1. **Review the script first!**
2. Adjust WHERE clauses to match your test data patterns
3. Open Supabase Dashboard
4. Go to SQL Editor
5. Copy modified script
6. Run and verify results

---

## 🚨 Safety Checklist

Before running cleanup scripts:

- [ ] **Backup your database** (if needed)
- [ ] **Review the script** - understand what will be deleted
- [ ] **Test on development first** - never run on production without testing
- [ ] **Check data patterns** - ensure WHERE clauses match only test data
- [ ] **Verify results** - check the output counts after running

---

## 📊 Verification Queries

After cleanup, run these to verify:

```sql
-- Count all records
SELECT 
  'answers' as table_name, COUNT(*) as count FROM answers
UNION ALL
SELECT 'codes', COUNT(*) FROM codes
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'codes_categories', COUNT(*) FROM codes_categories;

-- List remaining categories
SELECT id, name, created_at FROM categories ORDER BY id;

-- List remaining codes
SELECT id, name, created_at FROM codes ORDER BY id LIMIT 20;

-- Check for orphaned relationships
SELECT cc.* 
FROM codes_categories cc
LEFT JOIN codes c ON cc.code_id = c.id
LEFT JOIN categories cat ON cc.category_id = cat.id
WHERE c.id IS NULL OR cat.id IS NULL;
```

---

## 🔄 Common Cleanup Patterns

### Delete by Date
```sql
-- Delete answers created today
DELETE FROM answers WHERE DATE(created_at) = CURRENT_DATE;

-- Delete answers from last 7 days
DELETE FROM answers WHERE created_at > NOW() - INTERVAL '7 days';
```

### Delete by Pattern
```sql
-- Delete answers with specific text patterns
DELETE FROM answers WHERE answer_text ~ 'pattern';

-- Delete codes starting with "TEST_"
DELETE FROM codes WHERE name LIKE 'TEST_%';
```

### Delete by ID Range
```sql
-- Delete answers with IDs 1-100
DELETE FROM answers WHERE id BETWEEN 1 AND 100;
```

---

## 🛠️ Troubleshooting

### Error: Foreign Key Constraint
**Problem:** Can't delete categories/codes because they're referenced

**Solution:** Delete in correct order:
1. First: `answers` (references codes)
2. Second: `codes_categories` (junction table)
3. Third: `codes`
4. Fourth: `categories`

### Error: Permission Denied
**Problem:** User doesn't have delete permissions

**Solution:** 
- Run as database owner
- Grant necessary permissions
- Use Supabase dashboard (has elevated permissions)

### Need to Restore Data
**Problem:** Accidentally deleted wrong data

**Solution:**
- Restore from backup (if available)
- Use Supabase time-travel feature (if enabled)
- Re-import data from CSV/JSON

---

## 📝 Example Workflow

### Full Cleanup (Development)
```bash
# 1. Navigate to Supabase Dashboard
# 2. SQL Editor → New Query
# 3. Copy clean-test-data.sql
# 4. Run
# 5. Verify: all counts should be 0
```

### Selective Cleanup (Production)
```bash
# 1. Review clean-selective-test-data.sql
# 2. Adjust WHERE clauses for your test data
# 3. Backup database (optional)
# 4. Run script
# 5. Verify results
# 6. Check that production data remains
```

---

## 🎯 Best Practices

1. **Always backup** before major cleanups
2. **Test on dev** before running on production
3. **Use transactions** for complex multi-table deletes
4. **Verify first** - run SELECT queries before DELETE
5. **Document patterns** - note what constitutes "test data"
6. **Schedule cleanups** - regularly clean test data
7. **Use soft deletes** - consider marking as deleted vs hard delete

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs for error details
2. Verify your database schema matches expectations
3. Ensure foreign key constraints are properly configured
4. Review Supabase documentation on data management

---

**Last Updated:** October 7, 2025  
**Version:** 1.0



