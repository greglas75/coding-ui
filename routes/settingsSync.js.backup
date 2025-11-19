/**
 * Settings Synchronization Routes
 * Handles encrypted user settings sync across browsers/devices
 *
 * Requires authentication via Supabase Auth
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  encryptSettings,
  decryptSettings,
  validateSettingsStructure,
  sanitizeSettings,
  getDeviceInfo,
} from '../lib/settingsEncryption.js';

const router = express.Router();

// Supabase client (using service role key for admin operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Encryption key from environment
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('SETTINGS_ENCRYPTION_KEY must be set in environment');
}

// Logger
const log = {
  info: (msg, meta) =>
    console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), msg, ...meta })),
  error: (msg, meta, err) => {
    const safeErr = err
      ? { name: err.name, message: err.message }
      : undefined;
    console.error(
      JSON.stringify({
        level: 'error',
        time: new Date().toISOString(),
        msg,
        ...meta,
        error: safeErr,
      })
    );
  },
};

/**
 * Middleware: Require authenticated user
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      log.error('Auth verification failed', { error: error?.message });
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    log.error('Auth middleware error', {}, error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /api/settings-sync
// Retrieve user's encrypted settings from server
// ═══════════════════════════════════════════════════════════════
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    log.info('Fetching user settings', { userId });

    // Query user settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('encrypted_settings, version, last_modified')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found - return empty
        log.info('No settings found for user', { userId });
        return res.json({
          settings: null,
          version: 0,
          lastModified: null,
        });
      }

      log.error('Database error fetching settings', { userId, error: error.message });
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    // Decrypt settings
    let decryptedSettings;
    try {
      decryptedSettings = decryptSettings(data.encrypted_settings, ENCRYPTION_KEY);
    } catch (decryptError) {
      log.error('Decryption failed', { userId }, decryptError);
      return res.status(500).json({ error: 'Failed to decrypt settings' });
    }

    return res.json({
      settings: decryptedSettings,
      version: data.version,
      lastModified: data.last_modified,
    });
  } catch (error) {
    log.error('Error in GET /api/settings-sync', { userId: req.userId }, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/settings-sync
// Save/update user's settings (encrypted on server)
// ═══════════════════════════════════════════════════════════════
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid request: settings object required' });
    }

    // Validate settings structure
    if (!validateSettingsStructure(settings)) {
      return res.status(400).json({ error: 'Invalid settings structure' });
    }

    // Sanitize settings (remove empty values)
    const sanitized = sanitizeSettings(settings);

    // Encrypt settings
    let encryptedSettings;
    try {
      encryptedSettings = encryptSettings(sanitized, ENCRYPTION_KEY);
    } catch (encryptError) {
      log.error('Encryption failed', { userId }, encryptError);
      return res.status(500).json({ error: 'Failed to encrypt settings' });
    }

    // Get device info
    const deviceInfo = getDeviceInfo(req);

    log.info('Saving user settings', { userId, deviceInfo });

    // Upsert settings using database function
    const { data, error } = await supabase.rpc('upsert_user_settings', {
      p_user_id: userId,
      p_encrypted_settings: encryptedSettings,
      p_device_name: deviceInfo.deviceName,
      p_browser_name: deviceInfo.browserName,
    });

    if (error) {
      log.error('Database error upserting settings', {
        userId,
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        fullError: JSON.stringify(error)
      });
      return res.status(500).json({ error: 'Failed to save settings' });
    }

    const result = data[0];

    return res.json({
      success: true,
      version: result.new_version,
      lastModified: result.last_modified,
    });
  } catch (error) {
    log.error('Error in POST /api/settings-sync', { userId: req.userId }, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/settings-sync/history
// Get history of settings changes (for recovery)
// ═══════════════════════════════════════════════════════════════
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50 records

    log.info('Fetching settings history', { userId, limit });

    // Query history
    const { data, error } = await supabase
      .from('user_settings_history')
      .select('id, version, changed_at, device_name, browser_name, change_type')
      .eq('user_id', userId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('Database error fetching history', { userId, error: error.message });
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    return res.json({
      history: data || [],
    });
  } catch (error) {
    log.error('Error in GET /api/settings-sync/history', { userId: req.userId }, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/settings-sync/restore/:version
// Restore settings from a specific version in history
// ═══════════════════════════════════════════════════════════════
router.post('/restore/:version', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const targetVersion = parseInt(req.params.version);

    if (isNaN(targetVersion) || targetVersion < 1) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    log.info('Restoring settings from version', { userId, targetVersion });

    // Find the specific version in history
    const { data: historyData, error: historyError } = await supabase
      .from('user_settings_history')
      .select('encrypted_settings')
      .eq('user_id', userId)
      .eq('version', targetVersion)
      .single();

    if (historyError || !historyData) {
      log.error('Version not found in history', { userId, targetVersion });
      return res.status(404).json({ error: 'Version not found in history' });
    }

    // Get device info
    const deviceInfo = getDeviceInfo(req);

    // Restore by upserting the historical encrypted settings
    const { data, error } = await supabase.rpc('upsert_user_settings', {
      p_user_id: userId,
      p_encrypted_settings: historyData.encrypted_settings,
      p_device_name: `${deviceInfo.deviceName} (restored)`,
      p_browser_name: deviceInfo.browserName,
    });

    if (error) {
      log.error('Database error restoring settings', { userId, error: error.message });
      return res.status(500).json({ error: 'Failed to restore settings' });
    }

    const result = data[0];

    log.info('Settings restored successfully', { userId, fromVersion: targetVersion, newVersion: result.new_version });

    return res.json({
      success: true,
      message: `Settings restored from version ${targetVersion}`,
      version: result.new_version,
      lastModified: result.last_modified,
    });
  } catch (error) {
    log.error('Error in POST /api/settings-sync/restore', { userId: req.userId }, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DELETE /api/settings-sync
// Delete all user settings (for account cleanup)
// ═══════════════════════════════════════════════════════════════
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    log.info('Deleting user settings', { userId });

    // Delete settings (history will be CASCADE deleted)
    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId);

    if (error) {
      log.error('Database error deleting settings', { userId, error: error.message });
      return res.status(500).json({ error: 'Failed to delete settings' });
    }

    return res.json({
      success: true,
      message: 'Settings deleted successfully',
    });
  } catch (error) {
    log.error('Error in DELETE /api/settings-sync', { userId: req.userId }, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
