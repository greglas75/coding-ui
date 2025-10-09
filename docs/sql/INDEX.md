# 📚 SQL Scripts Index

Complete guide to all available SQL scripts for database management.

---

## 🗑️ Cleanup Scripts

### 1. **clean-test-data.sql** ⚠️
**Purpose:** Complete database cleanup - removes ALL data  
**Use case:** Fresh start, development reset  
**Safety:** No transaction, immediate delete  
**Restores:** No (permanent deletion)

**Quick summary:**
- Deletes all answers, codes, categories
- Resets ID sequences
- Shows verification counts

---

### 2. **clean-test-data-safe.sql** ✅ RECOMMENDED
**Purpose:** Complete database cleanup with transaction safety  
**Use case:** Safe development reset with rollback option  
**Safety:** Transaction-wrapped, can rollback  
**Restores:** Yes (before commit)

**Quick summary:**
- Same as #1 but with transaction
- Progress notifications
- Automatic verification
- Can rollback if needed

---

### 3. **clean-selective-test-data.sql** 🎯
**Purpose:** Remove only test data, keep production  
**Use case:** Mixed environments, selective cleanup  
**Safety:** Pattern-based, adjustable  
**Restores:** No (but keeps production data)

**Quick summary:**
- Deletes data matching patterns
- Customizable WHERE clauses
- Keeps production data safe
- Cleans orphaned relationships

---

## 💾 Backup Scripts

### 4. **backup-before-cleanup.sql**
**Purpose:** Create backup tables before cleanup  
**Use case:** Safety net before destructive operations  
**Safety:** Creates timestamped backup tables  
**Restores:** Yes (includes restore instructions)

**Quick summary:**
- Creates backup_TIMESTAMP tables
- Preserves all data
- Shows backup sizes
- Includes restore queries

---

### 5. **export-to-json.sql**
**Purpose:** Export data to JSON format  
**Use case:** External backups, data portability  
**Safety:** Read-only, no changes  
**Restores:** Manual (via JSON import)

**Quick summary:**
- Exports to JSON format
- Chunked exports for large datasets
- Copy-paste friendly
- Import via dashboard or scripts

---

## 🏗️ Setup Scripts

### 6. **2025-categories-ui.sql**
**Purpose:** Initial database schema setup  
**Use case:** New project setup  
**Safety:** Creates tables if not exist  
**Restores:** N/A (schema creation)

**Quick summary:**
- Creates all tables
- Sets up relationships
- Adds indexes
- Initial configuration

---

## 🦷 Demo Data Scripts

### 7. **add-translation-column.sql** ⚠️ REQUIRED FIRST
**Purpose:** Add translation column to answers table  
**Use case:** First-time setup before demo data  
**Safety:** Safe, checks if exists first  
**Restores:** N/A (schema change)

**Quick summary:**
- Adds `translation` column to answers
- Required before inserting demo data
- Safe to run multiple times
- **RUN THIS FIRST!**

---

### 8. **setup-toothpaste-demo.sql** ✨ NEW
**Purpose:** Complete Toothpaste demo data setup  
**Use case:** Testing, demonstrations, development  
**Safety:** Safe, uses WHERE NOT EXISTS  
**Restores:** Can be cleaned with cleanup scripts

**Quick summary:**
- Creates Toothpaste category
- Adds 19 brand codes
- Inserts 60+ multilingual answers
- Includes translations

---

### 9. **insert-toothpaste-codes.sql**
**Purpose:** Add toothpaste brand codes only  
**Use case:** Adding brands without answers  
**Safety:** Safe, uses WHERE NOT EXISTS  
**Restores:** Can delete codes individually

**Quick summary:**
- 21 toothpaste brands
- Links to Toothpaste category
- Common brands + misspellings

---

### 10. **insert-toothpaste-samples.sql**
**Purpose:** Add sample answers only  
**Use case:** Testing with real data  
**Safety:** Safe, uses ON CONFLICT  
**Restores:** Delete by category_id

**Quick summary:**
- 60+ answers in 7 languages
- Real translations included
- Various status types
- 30-day date range

---

## 📖 Documentation

### 11. **README-CLEANUP.md**
**Purpose:** Detailed cleanup documentation  
**Content:**
- Script descriptions
- Safety checklists
- Troubleshooting guide
- Best practices
- Example workflows

---

### 12. **TOOTHPASTE-DEMO-README.md** ✨ NEW
**Purpose:** Toothpaste demo data guide  
**Content:**
- Setup instructions
- Data overview
- Usage examples
- Customization guide

---

### 13. **INDEX.md** (this file)
**Purpose:** Quick reference to all scripts  
**Content:**
- Complete script catalog
- Quick decision guide
- Usage scenarios

---

## 🎯 Quick Decision Guide

**I want to...**

| Goal | Use This Script | Risk Level |
|------|----------------|------------|
| Delete everything (dev) | `clean-test-data.sql` | ⚠️ High |
| Delete everything (safe) | `clean-test-data-safe.sql` | ✅ Low |
| Keep production data | `clean-selective-test-data.sql` | ⚠️ Medium |
| Backup before cleanup | `backup-before-cleanup.sql` | ✅ None |
| Export to JSON | `export-to-json.sql` | ✅ None |
| Setup new database | `2025-categories-ui.sql` | ✅ None |

---

## 🔄 Recommended Workflow

### Safe Complete Cleanup
```
1. Run: backup-before-cleanup.sql
2. Run: clean-test-data-safe.sql
3. Verify results
4. COMMIT or ROLLBACK
```

### Production Cleanup
```
1. Run: export-to-json.sql (save outputs)
2. Run: backup-before-cleanup.sql
3. Modify: clean-selective-test-data.sql
4. Run modified script
5. Verify production data intact
```

### Quick Dev Reset
```
1. Run: clean-test-data.sql
2. Done!
```

---

## 📊 Script Comparison

| Feature | clean-test-data | clean-safe | clean-selective |
|---------|----------------|------------|-----------------|
| Transaction | ❌ No | ✅ Yes | ❌ No |
| Rollback | ❌ No | ✅ Yes | ❌ No |
| Complete Delete | ✅ Yes | ✅ Yes | ❌ Partial |
| Notifications | ❌ No | ✅ Yes | ❌ No |
| Customizable | ❌ No | ❌ No | ✅ Yes |
| Verification | ✅ Yes | ✅ Yes | ✅ Yes |
| Reset IDs | ✅ Yes | ✅ Yes | ❌ No |

---

## 🆘 Common Scenarios

### Scenario 1: Fresh Start (Development)
**Goal:** Clean slate, delete everything  
**Script:** `clean-test-data-safe.sql`  
**Steps:**
1. Run script
2. Verify output
3. Commit

### Scenario 2: Mixed Data (Production)
**Goal:** Remove test, keep real data  
**Script:** `clean-selective-test-data.sql`  
**Steps:**
1. Backup first (`backup-before-cleanup.sql`)
2. Customize WHERE clauses
3. Run script
4. Verify production data

### Scenario 3: Data Migration
**Goal:** Export, clean, re-import  
**Scripts:** `export-to-json.sql` + `clean-test-data.sql`  
**Steps:**
1. Export to JSON
2. Save JSON files
3. Clean database
4. Re-import selected data

---

## 📝 Best Practices

1. **Always backup** before destructive operations
2. **Use transactions** when available
3. **Test on dev** before production
4. **Verify results** after every operation
5. **Document changes** for team awareness
6. **Schedule cleanups** for regular maintenance
7. **Monitor sizes** to prevent bloat

---

## 🔗 Quick Links

- [Cleanup Guide](../../CLEANUP-GUIDE.md) - Quick start guide
- [README-CLEANUP.md](./README-CLEANUP.md) - Detailed documentation
- [Supabase Dashboard](https://supabase.com/dashboard) - Run scripts here

---

## 🎯 Demo Data Quick Start

**Want to test with real data?**

```bash
# Run this one script:
docs/sql/setup-toothpaste-demo.sql

# Get:
✅ 1 category (Toothpaste)
✅ 21 brand codes
✅ 60+ multilingual answers
✅ Real translations
✅ Various status types
```

See [TOOTHPASTE-DEMO-README.md](./TOOTHPASTE-DEMO-README.md) for details.

---

**Last Updated:** October 7, 2025  
**Total Scripts:** 13 (10 SQL + 3 Documentation)  
**Version:** 1.2  
**New:** Translation column fix + demo data scripts

