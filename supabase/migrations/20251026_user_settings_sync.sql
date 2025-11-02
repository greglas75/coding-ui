-- =====================================================
-- User Settings Synchronization
-- =====================================================
-- This migration creates tables for syncing user settings
-- across browsers and devices with encryption support.
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- Table: user_settings
-- =====================================================
-- Stores encrypted API keys and user preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Encrypted API Keys (AES-256 encrypted JSON)
  encrypted_settings TEXT NOT NULL,

  -- Encryption metadata
  encryption_key_id TEXT NOT NULL DEFAULT 'default',
  encryption_algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',

  -- Sync metadata
  version INTEGER NOT NULL DEFAULT 1,
  last_modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_name TEXT,
  browser_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one settings record per user
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- =====================================================
-- Table: user_settings_history
-- =====================================================
-- Keeps history of settings changes for recovery
CREATE TABLE IF NOT EXISTS user_settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Snapshot of settings
  encrypted_settings TEXT NOT NULL,
  version INTEGER NOT NULL,

  -- Change metadata
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_name TEXT,
  browser_name TEXT,
  change_type TEXT NOT NULL DEFAULT 'update', -- 'create', 'update', 'sync'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON user_settings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_settings_history_user_id ON user_settings_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_history_changed_at ON user_settings_history(changed_at DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings_history ENABLE ROW LEVEL SECURITY;

-- Users can only read their own settings
CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only read their own history
CREATE POLICY "Users can read own history"
  ON user_settings_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own history (via trigger)
CREATE POLICY "Users can insert own history"
  ON user_settings_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Trigger: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Trigger: Auto-create history on settings change
-- =====================================================
CREATE OR REPLACE FUNCTION create_settings_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into history table
  INSERT INTO user_settings_history (
    user_id,
    encrypted_settings,
    version,
    device_name,
    browser_name,
    change_type
  ) VALUES (
    NEW.user_id,
    NEW.encrypted_settings,
    NEW.version,
    NEW.device_name,
    NEW.browser_name,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      ELSE 'sync'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_settings_history
  AFTER INSERT OR UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION create_settings_history();

-- =====================================================
-- Function: Get latest settings for user
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id UUID)
RETURNS TABLE (
  settings_json TEXT,
  version INTEGER,
  last_modified TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    encrypted_settings,
    version,
    last_modified
  FROM user_settings
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: Upsert user settings (insert or update)
-- =====================================================
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

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_settings TO authenticated;
GRANT ALL ON user_settings_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_settings(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE user_settings IS 'Stores encrypted user settings and API keys for cross-device synchronization';
COMMENT ON TABLE user_settings_history IS 'Historical record of settings changes for recovery and audit';
COMMENT ON COLUMN user_settings.encrypted_settings IS 'AES-256-GCM encrypted JSON containing all user settings and API keys';
COMMENT ON COLUMN user_settings.version IS 'Incremental version number for conflict resolution';
COMMENT ON COLUMN user_settings.last_modified IS 'Timestamp of last modification for conflict resolution';
