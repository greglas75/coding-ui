-- ═══════════════════════════════════════════════════════════════
-- 💾 Backup Data Before Cleanup
-- ═══════════════════════════════════════════════════════════════
-- This script creates backup tables with current data
-- Run this BEFORE running any cleanup scripts
-- ═══════════════════════════════════════════════════════════════

-- Create backup tables with timestamp suffix
DO $$
DECLARE
  backup_suffix TEXT;
BEGIN
  -- Generate timestamp suffix (e.g., _backup_20251007_120000)
  backup_suffix := '_backup_' || to_char(NOW(), 'YYYYMMDD_HH24MISS');
  
  RAISE NOTICE '💾 Creating backups with suffix: %', backup_suffix;
  
  -- Backup answers
  EXECUTE format('CREATE TABLE IF NOT EXISTS answers%s AS SELECT * FROM answers', backup_suffix);
  RAISE NOTICE '✅ Backed up answers → answers%', backup_suffix;
  
  -- Backup codes
  EXECUTE format('CREATE TABLE IF NOT EXISTS codes%s AS SELECT * FROM codes', backup_suffix);
  RAISE NOTICE '✅ Backed up codes → codes%', backup_suffix;
  
  -- Backup categories
  EXECUTE format('CREATE TABLE IF NOT EXISTS categories%s AS SELECT * FROM categories', backup_suffix);
  RAISE NOTICE '✅ Backed up categories → categories%', backup_suffix;
  
  -- Backup codes_categories
  EXECUTE format('CREATE TABLE IF NOT EXISTS codes_categories%s AS SELECT * FROM codes_categories', backup_suffix);
  RAISE NOTICE '✅ Backed up codes_categories → codes_categories%', backup_suffix;
  
  -- Show counts
  RAISE NOTICE '';
  RAISE NOTICE '📊 Backup Summary:';
  EXECUTE format('SELECT COUNT(*) FROM answers%s', backup_suffix) INTO STRICT backup_suffix;
  RAISE NOTICE '   Answers: %', backup_suffix;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 📋 List all backup tables
-- ═══════════════════════════════════════════════════════════════

SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE '%_backup_%'
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════
-- 🔄 To restore from backup (run separately):
-- ═══════════════════════════════════════════════════════════════

-- Replace {TIMESTAMP} with your backup timestamp
/*

BEGIN;

-- Clear current data
TRUNCATE answers, codes_categories, codes, categories RESTART IDENTITY CASCADE;

-- Restore from backup
INSERT INTO categories SELECT * FROM categories_backup_{TIMESTAMP};
INSERT INTO codes SELECT * FROM codes_backup_{TIMESTAMP};
INSERT INTO codes_categories SELECT * FROM codes_categories_backup_{TIMESTAMP};
INSERT INTO answers SELECT * FROM answers_backup_{TIMESTAMP};

COMMIT;

*/

-- ═══════════════════════════════════════════════════════════════
-- 🗑️  To delete old backups:
-- ═══════════════════════════════════════════════════════════════

-- List all backups first
-- SELECT tablename FROM pg_tables WHERE tablename LIKE '%_backup_%';

-- Then drop specific backup tables
-- DROP TABLE IF EXISTS answers_backup_20251007_120000;
-- DROP TABLE IF EXISTS codes_backup_20251007_120000;
-- DROP TABLE IF EXISTS categories_backup_20251007_120000;
-- DROP TABLE IF EXISTS codes_categories_backup_20251007_120000;

-- Or drop all backups at once (USE WITH CAUTION!)
/*
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE tablename LIKE '%_backup_%') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename);
    RAISE NOTICE 'Dropped table: %', r.tablename;
  END LOOP;
END $$;
*/

-- ═══════════════════════════════════════════════════════════════
-- 📝 Notes:
-- - Backups are created with timestamp suffix for uniqueness
-- - Original tables remain unchanged
-- - Use restore script to recover data if needed
-- - Clean up old backups periodically to save space
-- ═══════════════════════════════════════════════════════════════



