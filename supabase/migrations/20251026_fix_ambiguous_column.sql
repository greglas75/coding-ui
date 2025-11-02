-- Fix ambiguous column reference in upsert_user_settings function
-- This addresses PostgreSQL error 42702: "column reference 'last_modified' is ambiguous"

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
