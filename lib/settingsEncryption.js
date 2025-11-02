/**
 * Server-side Settings Encryption
 * AES-256-GCM encryption for user API keys
 *
 * Security: Uses server-side encryption key that NEVER gets sent to client
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from base64-encoded secret
 * @param {string} base64Secret - Base64-encoded 256-bit key from env
 * @returns {Buffer} - Encryption key
 */
function getEncryptionKey(base64Secret) {
  if (!base64Secret) {
    throw new Error('SETTINGS_ENCRYPTION_KEY not configured in environment');
  }

  const key = Buffer.from(base64Secret, 'base64');

  if (key.length !== KEY_LENGTH) {
    throw new Error(`Invalid encryption key length: ${key.length}. Expected ${KEY_LENGTH} bytes.`);
  }

  return key;
}

/**
 * Encrypt settings object to encrypted string
 * @param {Object} settingsObject - Plain settings object
 * @param {string} encryptionKey - Base64-encoded encryption key
 * @returns {string} - Encrypted string (base64)
 */
export function encryptSettings(settingsObject, encryptionKey) {
  try {
    const key = getEncryptionKey(encryptionKey);

    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Convert settings to JSON string
    const plaintext = JSON.stringify(settingsObject);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: salt + iv + authTag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]);

    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt encrypted string back to settings object
 * @param {string} encryptedString - Base64-encoded encrypted data
 * @param {string} encryptionKey - Base64-encoded encryption key
 * @returns {Object} - Decrypted settings object
 */
export function decryptSettings(encryptedString, encryptionKey) {
  try {
    const key = getEncryptionKey(encryptionKey);

    // Decode base64
    const combined = Buffer.from(encryptedString, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    // Parse JSON
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Validate settings object structure
 * @param {Object} settings - Settings object to validate
 * @returns {boolean} - True if valid
 */
export function validateSettingsStructure(settings) {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  // Expected structure
  const expectedFields = [
    'anthropic_api_key',
    'openai_api_key',
    'google_gemini_api_key',
    'google_cse_api_key',
    'google_cse_cx_id',
    'pinecone_api_key',
    'pinecone_environment',
    'pinecone_index_name',
    // Models
    'anthropic_model',
    'openai_model',
    'google_gemini_model',
    // Temperatures
    'anthropic_temperature',
    'openai_temperature',
    'google_gemini_temperature',
  ];

  // All fields should be strings or null/undefined
  for (const field of expectedFields) {
    const value = settings[field];
    if (value !== null && value !== undefined && typeof value !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize settings before encryption (remove empty values)
 * @param {Object} settings - Settings object
 * @returns {Object} - Sanitized settings
 */
export function sanitizeSettings(settings) {
  const sanitized = {};

  for (const [key, value] of Object.entries(settings)) {
    // Only include non-empty strings
    if (value && typeof value === 'string' && value.trim().length > 0) {
      sanitized[key] = value.trim();
    }
  }

  return sanitized;
}

/**
 * Get browser and device info from request headers
 * @param {Request} req - Express request object
 * @returns {Object} - Device info
 */
export function getDeviceInfo(req) {
  const userAgent = req.headers['user-agent'] || '';

  // Extract browser name
  let browserName = 'Unknown';
  if (userAgent.includes('Chrome')) browserName = 'Chrome';
  else if (userAgent.includes('Firefox')) browserName = 'Firefox';
  else if (userAgent.includes('Safari')) browserName = 'Safari';
  else if (userAgent.includes('Edge')) browserName = 'Edge';

  // Extract OS
  let deviceName = 'Unknown';
  if (userAgent.includes('Windows')) deviceName = 'Windows';
  else if (userAgent.includes('Mac OS')) deviceName = 'macOS';
  else if (userAgent.includes('Linux')) deviceName = 'Linux';
  else if (userAgent.includes('Android')) deviceName = 'Android';
  else if (userAgent.includes('iOS')) deviceName = 'iOS';

  return {
    browserName,
    deviceName: `${deviceName} ${browserName}`,
  };
}
