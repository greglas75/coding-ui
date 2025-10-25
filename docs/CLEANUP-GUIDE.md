# 🗑️ Quick Database Cleanup Guide

## How to Remove All Test Data

### Option 1: Complete Cleanup (Recommended for Development)
**Removes everything and resets the database to empty state**

1. Open **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open file: `docs/sql/clean-test-data.sql`
4. Copy the entire content
5. Paste into SQL Editor
6. Click **Run**
7. Verify result shows 0 rows for all tables

**What gets deleted:**
- ✅ All answers
- ✅ All codes  
- ✅ All categories
- ✅ All code-category relationships
- ✅ ID sequences reset to 1

---

### Option 2: Safe Cleanup with Transaction
**Same as Option 1, but with rollback capability**

1. Open **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open file: `docs/sql/clean-test-data-safe.sql`
4. Copy the entire content
5. Paste into SQL Editor
6. Click **Run**
7. **Review the output messages**
8. If everything looks good → script auto-commits
9. If you want to undo → run `ROLLBACK;` immediately

**Benefits:**
- ✅ Progress notifications
- ✅ Automatic verification
- ✅ Transaction safety
- ✅ Can rollback if needed

---

### Option 3: Selective Cleanup
**Only removes test data, keeps production data**

1. Open **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open file: `docs/sql/clean-selective-test-data.sql`
4. **IMPORTANT:** Review and adjust WHERE clauses
5. Modify patterns to match YOUR test data
6. Copy the modified script
7. Paste into SQL Editor
8. Click **Run**
9. Verify results

**Best for:**
- Mixed production + test data
- Want to keep some data
- Need selective cleanup

---

## ⚡ Quick Commands

### Check Current Data Count
```sql
SELECT 
  'answers' as table, COUNT(*) as count FROM answers
UNION ALL
SELECT 'codes', COUNT(*) FROM codes
UNION ALL
SELECT 'categories', COUNT(*) FROM categories;
```

### Delete Everything (No Transaction)
```sql
DELETE FROM answers;
DELETE FROM codes_categories;
DELETE FROM codes;
DELETE FROM categories;
```

### Reset Sequences
```sql
ALTER SEQUENCE answers_id_seq RESTART WITH 1;
ALTER SEQUENCE codes_id_seq RESTART WITH 1;
ALTER SEQUENCE categories_id_seq RESTART WITH 1;
```

---

## 🎯 Which Script Should I Use?

| Scenario | Recommended Script |
|----------|-------------------|
| Clean slate, delete everything | `clean-test-data.sql` |
| Want transaction safety | `clean-test-data-safe.sql` |
| Keep some production data | `clean-selective-test-data.sql` |
| Quick dev reset | `clean-test-data.sql` |
| Production cleanup | `clean-selective-test-data.sql` |

---

## ⚠️ Safety Tips

1. **Backup first** (if data is important)
2. **Use transactions** when unsure
3. **Test on dev** before production
4. **Verify results** after cleanup
5. **Check for orphaned data**

---

## 📚 Full Documentation

For detailed instructions, troubleshooting, and examples:
👉 See `docs/sql/README-CLEANUP.md`

---

## 🆘 Troubleshooting

**Error: Foreign key constraint**
→ Delete in order: answers → codes_categories → codes → categories

**Error: Permission denied**
→ Use Supabase dashboard, has elevated permissions

**Accidentally deleted wrong data**
→ Use Supabase time-travel or restore from backup

---

**Last Updated:** October 7, 2025



