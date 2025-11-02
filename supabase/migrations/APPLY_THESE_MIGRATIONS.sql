-- ============================================================================
-- URGENT MIGRATIONS TO FIX CODEFRAME GENERATION
-- Run this entire file in Supabase SQL Editor
-- ============================================================================

-- Migration 1: Fix ambiguous column reference in upsert_user_settings function
-- Addresses PostgreSQL error 42702: "column reference 'last_modified' is ambiguous"

CREATE OR REPLACE FUNCTION upsert_user_settings(
  p_user_id UUID,
  p_encrypted_settings TEXT,
  p_device_name TEXT DEFAULT NULL,
  p_browser_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_version INTEGER,
  last_modified TIMESTAMPTZ
) AS $$
DECLARE
  v_new_version INTEGER;
  v_last_modified TIMESTAMPTZ;
BEGIN
  -- Upsert settings
  INSERT INTO user_settings (
    user_id,
    encrypted_settings,
    device_name,
    browser_name,
    version
  ) VALUES (
    p_user_id,
    p_encrypted_settings,
    p_device_name,
    p_browser_name,
    1
  )
  ON CONFLICT (user_id) DO UPDATE SET
    encrypted_settings = EXCLUDED.encrypted_settings,
    device_name = EXCLUDED.device_name,
    browser_name = EXCLUDED.browser_name,
    version = user_settings.version + 1,
    last_modified = NOW()
  RETURNING user_settings.version, user_settings.last_modified INTO v_new_version, v_last_modified;

  -- Return success and new version
  RETURN QUERY SELECT TRUE, v_new_version, v_last_modified;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration 2: Add variants column to codeframe_hierarchy table
-- This column stores brand variants extracted during brand codeframe generation

ALTER TABLE codeframe_hierarchy
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT NULL;

COMMENT ON COLUMN codeframe_hierarchy.variants IS 'Brand variants/alternative names (for brand codes only)';

-- ============================================================================
-- VERIFICATION QUERIES (optional - run these to verify the migrations worked)
-- ============================================================================

-- Check the upsert_user_settings function was updated
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'upsert_user_settings'
  AND routine_schema = 'public';

-- Check the variants column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'codeframe_hierarchy'
  AND column_name = 'variants';
