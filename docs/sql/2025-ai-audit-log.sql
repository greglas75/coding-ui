-- ═══════════════════════════════════════════════════════════════
-- 🎯 AI Audit Log Table
-- ═══════════════════════════════════════════════════════════════
-- Purpose: Track all AI auto-confirmations for auditing and analysis
-- Created: 2025-10-07
-- ═══════════════════════════════════════════════════════════════

-- ✅ Create ai_audit_log table
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id BIGSERIAL PRIMARY KEY,
  answer_id BIGINT NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  answer_text TEXT,
  selected_code TEXT,
  probability REAL NOT NULL,
  ai_model TEXT,
  action TEXT NOT NULL DEFAULT 'auto_confirm',
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ✅ Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_answer_id 
  ON ai_audit_log(answer_id);

CREATE INDEX IF NOT EXISTS idx_ai_audit_log_category_id 
  ON ai_audit_log(category_id);

CREATE INDEX IF NOT EXISTS idx_ai_audit_log_confirmed_at 
  ON ai_audit_log(confirmed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_log_probability 
  ON ai_audit_log(probability DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_log_action 
  ON ai_audit_log(action);

-- ✅ Add comments for documentation
COMMENT ON TABLE ai_audit_log IS 
  'Audit log for AI auto-confirmation actions. Tracks all automatic status changes made by the AI agent.';

COMMENT ON COLUMN ai_audit_log.answer_id IS 
  'Reference to the answer that was auto-confirmed';

COMMENT ON COLUMN ai_audit_log.probability IS 
  'AI confidence score (0.0 - 1.0) at the time of confirmation';

COMMENT ON COLUMN ai_audit_log.ai_model IS 
  'AI model used for prediction (e.g., gpt-4o, gpt-5)';

COMMENT ON COLUMN ai_audit_log.action IS 
  'Type of action performed (auto_confirm, manual_override, etc.)';

COMMENT ON COLUMN ai_audit_log.metadata IS 
  'Additional metadata in JSON format (e.g., user info, batch ID)';

-- ═══════════════════════════════════════════════════════════════
-- 📊 HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- ✅ Get auto-confirm statistics
CREATE OR REPLACE FUNCTION get_auto_confirm_stats(
  p_category_id BIGINT DEFAULT NULL,
  p_days INT DEFAULT 30
)
RETURNS TABLE(
  total_confirmations BIGINT,
  avg_probability REAL,
  unique_codes BIGINT,
  confirmations_per_day REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_confirmations,
    AVG(probability)::REAL as avg_probability,
    COUNT(DISTINCT selected_code)::BIGINT as unique_codes,
    (COUNT(*)::REAL / NULLIF(p_days, 0))::REAL as confirmations_per_day
  FROM ai_audit_log
  WHERE 
    action = 'auto_confirm'
    AND confirmed_at >= NOW() - (p_days || ' days')::INTERVAL
    AND (p_category_id IS NULL OR category_id = p_category_id);
END;
$$ LANGUAGE plpgsql;

-- ✅ Get top auto-confirmed codes
CREATE OR REPLACE FUNCTION get_top_auto_confirmed_codes(
  p_category_id BIGINT DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  code TEXT,
  confirmation_count BIGINT,
  avg_probability REAL,
  min_probability REAL,
  max_probability REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    selected_code as code,
    COUNT(*)::BIGINT as confirmation_count,
    AVG(probability)::REAL as avg_probability,
    MIN(probability)::REAL as min_probability,
    MAX(probability)::REAL as max_probability
  FROM ai_audit_log
  WHERE 
    action = 'auto_confirm'
    AND selected_code IS NOT NULL
    AND (p_category_id IS NULL OR category_id = p_category_id)
  GROUP BY selected_code
  ORDER BY confirmation_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ✅ Get recent auto-confirmations
CREATE OR REPLACE FUNCTION get_recent_auto_confirmations(
  p_category_id BIGINT DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  id BIGINT,
  answer_id BIGINT,
  answer_text TEXT,
  selected_code TEXT,
  probability REAL,
  ai_model TEXT,
  confirmed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.answer_id,
    al.answer_text,
    al.selected_code,
    al.probability,
    al.ai_model,
    al.confirmed_at
  FROM ai_audit_log al
  WHERE 
    al.action = 'auto_confirm'
    AND (p_category_id IS NULL OR al.category_id = p_category_id)
  ORDER BY al.confirmed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- 🧪 TEST QUERIES
-- ═══════════════════════════════════════════════════════════════

-- Get stats for last 30 days
SELECT * FROM get_auto_confirm_stats();

-- Get stats for specific category
SELECT * FROM get_auto_confirm_stats(1, 30);

-- Get top 10 auto-confirmed codes
SELECT * FROM get_top_auto_confirmed_codes();

-- Get recent confirmations
SELECT * FROM get_recent_auto_confirmations(NULL, 20);

-- Get audit log entries
SELECT 
  id,
  answer_id,
  selected_code,
  probability,
  ai_model,
  confirmed_at
FROM ai_audit_log
WHERE action = 'auto_confirm'
ORDER BY confirmed_at DESC
LIMIT 100;

-- ═══════════════════════════════════════════════════════════════
-- 🧹 MAINTENANCE
-- ═══════════════════════════════════════════════════════════════

-- Clean up old audit logs (older than 90 days)
-- Run this as a scheduled job
DELETE FROM ai_audit_log
WHERE confirmed_at < NOW() - INTERVAL '90 days';

-- Check table size
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename = 'ai_audit_log';

-- ✅ Complete!

