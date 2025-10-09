-- ═══════════════════════════════════════════════════════════════
-- File Imports History Table
-- Created: 2025-10-07
-- Purpose: Track all file uploads for audit and history
-- ═══════════════════════════════════════════════════════════════

-- Create file_imports table
CREATE TABLE IF NOT EXISTS file_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  category_name TEXT,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  rows_imported INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  user_email TEXT DEFAULT 'system',
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  file_size_kb NUMERIC(10, 2),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_file_imports_created_at ON file_imports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_imports_status ON file_imports(status);
CREATE INDEX IF NOT EXISTS idx_file_imports_category_id ON file_imports(category_id);
CREATE INDEX IF NOT EXISTS idx_file_imports_user_email ON file_imports(user_email);

-- Add comments for documentation
COMMENT ON TABLE file_imports IS 'Tracks all file upload history for auditing and analytics';
COMMENT ON COLUMN file_imports.id IS 'Unique identifier for import record';
COMMENT ON COLUMN file_imports.file_name IS 'Original filename uploaded';
COMMENT ON COLUMN file_imports.category_name IS 'Category name at time of import';
COMMENT ON COLUMN file_imports.category_id IS 'Reference to category (nullable if category deleted)';
COMMENT ON COLUMN file_imports.rows_imported IS 'Number of successfully imported rows';
COMMENT ON COLUMN file_imports.rows_skipped IS 'Number of skipped/invalid rows';
COMMENT ON COLUMN file_imports.user_email IS 'Email of user who uploaded (or system)';
COMMENT ON COLUMN file_imports.status IS 'Import status: success, failed, or partial';
COMMENT ON COLUMN file_imports.error_message IS 'Error message if status is failed';
COMMENT ON COLUMN file_imports.file_size_kb IS 'File size in kilobytes';
COMMENT ON COLUMN file_imports.processing_time_ms IS 'Processing time in milliseconds';
COMMENT ON COLUMN file_imports.created_at IS 'Timestamp of import';

-- ═══════════════════════════════════════════════════════════════
-- Helper Functions
-- ═══════════════════════════════════════════════════════════════

-- Get import statistics
CREATE OR REPLACE FUNCTION get_import_stats(days INTEGER DEFAULT 7)
RETURNS TABLE (
  total_imports BIGINT,
  successful_imports BIGINT,
  failed_imports BIGINT,
  total_rows_imported BIGINT,
  avg_processing_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_imports,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_imports,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_imports,
    COALESCE(SUM(rows_imported), 0)::BIGINT as total_rows_imported,
    ROUND(AVG(processing_time_ms), 2) as avg_processing_time_ms
  FROM file_imports
  WHERE created_at >= NOW() - (days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Get recent imports with category details
CREATE OR REPLACE FUNCTION get_recent_imports(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  category_name TEXT,
  rows_imported INTEGER,
  rows_skipped INTEGER,
  user_email TEXT,
  status TEXT,
  error_message TEXT,
  file_size_kb NUMERIC,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fi.id,
    fi.file_name,
    COALESCE(fi.category_name, 'Unknown') as category_name,
    fi.rows_imported,
    fi.rows_skipped,
    fi.user_email,
    fi.status,
    fi.error_message,
    fi.file_size_kb,
    fi.processing_time_ms,
    fi.created_at
  FROM file_imports fi
  ORDER BY fi.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- Sample Queries
-- ═══════════════════════════════════════════════════════════════

-- Get last 20 imports
-- SELECT * FROM get_recent_imports(20);

-- Get import stats for last 7 days
-- SELECT * FROM get_import_stats(7);

-- Get imports by status
-- SELECT status, COUNT(*), SUM(rows_imported)
-- FROM file_imports
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY status;

-- Get imports by category
-- SELECT category_name, COUNT(*), SUM(rows_imported)
-- FROM file_imports
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY category_name
-- ORDER BY COUNT(*) DESC;

-- Get average processing time by file size range
-- SELECT 
--   CASE 
--     WHEN file_size_kb < 100 THEN '< 100 KB'
--     WHEN file_size_kb < 1000 THEN '100-1000 KB'
--     WHEN file_size_kb < 5000 THEN '1-5 MB'
--     ELSE '> 5 MB'
--   END as size_range,
--   COUNT(*),
--   ROUND(AVG(processing_time_ms), 2) as avg_time_ms
-- FROM file_imports
-- GROUP BY size_range
-- ORDER BY MIN(file_size_kb);

-- ═══════════════════════════════════════════════════════════════
-- RLS Policies (Optional - adjust based on your auth setup)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS
-- ALTER TABLE file_imports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all imports (read-only)
-- CREATE POLICY "Allow read access to all imports"
--   ON file_imports
--   FOR SELECT
--   USING (true);

-- Policy: System can insert imports
-- CREATE POLICY "Allow system to insert imports"
--   ON file_imports
--   FOR INSERT
--   WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- Cleanup (Optional)
-- ═══════════════════════════════════════════════════════════════

-- Delete imports older than 90 days
-- DELETE FROM file_imports WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum table to reclaim space
-- VACUUM ANALYZE file_imports;

