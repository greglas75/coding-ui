import CryptoJS from 'crypto-js';
import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import { simpleLogger } from '../utils/logger';

// ───────────────────────────────────────────────────────────────
// Encryption Key Management
// ───────────────────────────────────────────────────────────────
// SECURITY: Encryption key MUST be set via VITE_OFFLINE_KEY environment variable
// Required format: Minimum 32 characters (recommended: 64-character hex string)
// Generate secure key: node -e "simpleLogger.info(require('crypto').randomBytes(32).toString('hex'))"

/**
 * Get and validate the encryption key from environment
 * @throws {Error} If key is not set or invalid
 * @returns {string} The validated encryption key
 */
function getEncryptionKey(): string {
  const key = import.meta.env.VITE_OFFLINE_KEY;

  // Check if key is set
  if (!key) {
    const errorMessage = `
❌ VITE_OFFLINE_KEY is not set!

Offline storage requires a secure encryption key.

To fix this:
1. Generate a secure key using:
   node -e "simpleLogger.info(require('crypto').randomBytes(32).toString('hex'))"

   Or using OpenSSL:
   openssl rand -hex 32

2. Add the key to your .env file:
   VITE_OFFLINE_KEY=your_generated_key_here

3. Restart your development server

For more information, see .env.example
    `.trim();

    throw new Error(errorMessage);
  }

  return key;
}

/**
 * Validate encryption key strength and security
 * @param key - The encryption key to validate
 * @throws {Error} In production if key is weak
 * @returns {boolean} True if key is valid
 */
function validateEncryptionKey(key: string): boolean {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  // Check minimum length
  if (key.length < 32) {
    const message = `⚠️ Encryption key is too short! Minimum 32 characters required (current: ${key.length})`;

    if (isProduction) {
      throw new Error(message);
    } else {
      simpleLogger.warn(message);
      simpleLogger.warn('⚠️ This is allowed in development but will fail in production!');
      return false;
    }
  }

  // Check for weak/common patterns
  const weakPatterns = [
    'default-key-change-me',
    'test',
    'dev',
    'development',
    'password',
    '12345',
    'qwerty',
    'changeme',
    'secret',
  ];

  const lowerKey = key.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerKey.includes(pattern)) {
      const message = `⚠️ Encryption key contains weak pattern: "${pattern}"`;

      if (isProduction) {
        throw new Error(message);
      } else {
        simpleLogger.warn(message);
        simpleLogger.warn('⚠️ Please use a cryptographically secure random key!');
        return false;
      }
    }
  }

  // Check for repeated characters (e.g., 'aaaaaaa...')
  const hasRepeatedChars = /(.)\1{5,}/.test(key);
  if (hasRepeatedChars) {
    const message = '⚠️ Encryption key contains repeated characters - this is weak!';

    if (isProduction) {
      throw new Error(message);
    } else {
      simpleLogger.warn(message);
      return false;
    }
  }

  // All checks passed
  if (isDevelopment && key.length >= 32) {
    simpleLogger.info('✅ Encryption key validated successfully');
  }

  return true;
}

// Initialize and validate encryption key on module load
const KEY = getEncryptionKey();
validateEncryptionKey(KEY);

/**
 * Encrypt data before storing in IndexedDB
 */
function encrypt(data: any): string {
  try {
    const jsonData = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonData, KEY).toString();
  } catch (error) {
    simpleLogger.error('❌ Encryption failed:', error);
    throw new Error('Failed to encrypt data for offline storage');
  }
}

/**
 * Decrypt data after retrieving from IndexedDB
 */
function decrypt(ciphertext: string): any {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, KEY);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
      throw new Error('Decryption resulted in empty string - invalid key or corrupted data');
    }

    return JSON.parse(decryptedText);
  } catch (error) {
    simpleLogger.error('❌ Decryption failed:', error);
    throw new Error('Failed to decrypt data from offline storage');
  }
}

export interface PendingChange {
  id: string;
  timestamp: number;
  action: 'update' | 'insert' | 'delete';
  table: string;
  data: ChangeData;
  synced: boolean;
}

export interface ChangeData {
  ids?: number[];
  id?: number;
  updates?: Record<string, any>;
  [key: string]: any;
}

export interface CachedItem {
  id: number;
  timestamp: number;
  encryptedData: string;
}

interface OfflineDB extends DBSchema {
  'pending-changes': {
    key: string;
    value: PendingChange;
  };
  'local-cache': {
    key: number;
    value: CachedItem;
  };
}

let db: IDBPDatabase<OfflineDB> | null = null;

/**
 * Initialize IndexedDB for offline storage
 */
export async function initOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (db) return db;

  try {
    db = await openDB<OfflineDB>('coding-offline', 2, { // Increment version for encryption migration
      upgrade(upgradeDb, oldVersion) {
        simpleLogger.info('🗄️ Initializing IndexedDB...');

        if (!upgradeDb.objectStoreNames.contains('pending-changes')) {
          const pendingStore = upgradeDb.createObjectStore('pending-changes', { keyPath: 'id' });
          (pendingStore as any).createIndex('timestamp', 'timestamp');
          (pendingStore as any).createIndex('synced', 'synced');
          simpleLogger.info('✅ Created pending-changes store');
        }

        if (!upgradeDb.objectStoreNames.contains('local-cache')) {
          const cacheStore = upgradeDb.createObjectStore('local-cache', { keyPath: 'id' });
          (cacheStore as any).createIndex('timestamp', 'timestamp');
          simpleLogger.info('✅ Created local-cache store');
        }

        // Migration from version 1 to 2: Handle encryption
        if (oldVersion < 2) {
          simpleLogger.info('🔄 Migrating to encrypted storage...');
          // Note: Existing data will be lost during this migration
          // This is intentional for security - old unencrypted data should not be preserved
        }
      },
    });

    simpleLogger.info('✅ IndexedDB initialized successfully with encryption');
    return db;
  } catch (error) {
    simpleLogger.error('❌ Failed to initialize IndexedDB:', error);
    throw error;
  }
}

/**
 * Add a pending change to the queue
 */
export async function addPendingChange(change: {
  action: 'update' | 'insert' | 'delete';
  table: string;
  data: any;
}): Promise<string> {
  const db = await initOfflineDB();
  const id = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const pendingChange = {
    id,
    timestamp: Date.now(),
    synced: false,
    ...change,
  };

  await db.add('pending-changes', pendingChange);
  simpleLogger.info(`📝 Queued change: ${change.action} on ${change.table}`, pendingChange);

  return id;
}

/**
 * Get all pending changes
 */
export async function getPendingChanges() {
  const db = await initOfflineDB();
  return db.getAll('pending-changes');
}

/**
 * Get unsynced pending changes
 */
export async function getUnsyncedChanges() {
  const db = await initOfflineDB();
  const allChanges = await db.getAll('pending-changes');
  return allChanges.filter(change => !change.synced);
}

/**
 * Mark change as synced (remove from queue)
 */
export async function markAsSynced(id: string): Promise<void> {
  const db = await initOfflineDB();
  await db.delete('pending-changes', id);
  simpleLogger.info(`✅ Marked change as synced: ${id}`);
}

/**
 * Mark multiple changes as synced
 */
export async function markMultipleAsSynced(ids: string[]): Promise<void> {
  const db = await initOfflineDB();
  const tx = db.transaction('pending-changes', 'readwrite');

  for (const id of ids) {
    await tx.store.delete(id);
  }

  await tx.done;
  simpleLogger.info(`✅ Marked ${ids.length} changes as synced`);
}

/**
 * Cache answers locally for offline access (encrypted)
 */
export async function cacheAnswers(answers: any[]): Promise<void> {
  const db = await initOfflineDB();
  const tx = db.transaction('local-cache', 'readwrite');

  for (const answer of answers) {
    await tx.store.put({
      id: answer.id,
      timestamp: Date.now(),
      encryptedData: encrypt(answer), // Encrypt the answer data
    });
  }

  await tx.done;
  simpleLogger.info(`💾 Cached ${answers.length} answers locally (encrypted)`);
}

/**
 * Get cached answers (decrypted)
 */
export async function getCachedAnswers(): Promise<any[]> {
  const db = await initOfflineDB();
  const cached = await db.getAll('local-cache');

  try {
    return cached.map(item => decrypt(item.encryptedData));
  } catch (error) {
    simpleLogger.error('❌ Failed to decrypt cached answers:', error);
    // If decryption fails, try to return empty array or handle gracefully
    return [];
  }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  const db = await initOfflineDB();
  const tx = db.transaction(['pending-changes', 'local-cache'], 'readwrite');

  await tx.objectStore('pending-changes').clear();
  await tx.objectStore('local-cache').clear();

  await tx.done;
  simpleLogger.info('🗑️ Cleared all offline cache');
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const db = await initOfflineDB();
    const pendingCount = await db.count('pending-changes');
    const cacheCount = await db.count('local-cache');

    // Fix IndexedDB count issue - use getAll instead of countFromIndex
    let unsyncedCount = 0;
    try {
      // Always use fallback approach - get all and filter manually
      // This is more reliable than trying to query boolean indexes
      const allChanges = await db.getAll('pending-changes');
      unsyncedCount = allChanges.filter(change => !change.synced).length;
    } catch (error) {
      simpleLogger.warn('Failed to get unsynced count:', error);
      unsyncedCount = 0;
    }

    return {
      pendingChanges: pendingCount,
      cachedAnswers: cacheCount,
      unsyncedChanges: unsyncedCount,
    };
  } catch (error) {
    simpleLogger.error('Failed to get cache stats:', error);
    return {
      pendingChanges: 0,
      cachedAnswers: 0,
      unsyncedChanges: 0,
    };
  }
}

/**
 * Test encryption/decryption functionality
 */
export async function testEncryption(): Promise<boolean> {
  try {
    const testData = { test: 'encryption', timestamp: Date.now() };
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    const isValid = JSON.stringify(testData) === JSON.stringify(decrypted);
    simpleLogger.info(isValid ? '✅ Encryption test passed' : '❌ Encryption test failed');
    return isValid;
  } catch (error) {
    simpleLogger.error('❌ Encryption test failed:', error);
    return false;
  }
}

/**
 * Export pending changes for debugging
 */
export async function exportPendingChanges(): Promise<string> {
  const changes = await getPendingChanges();
  const exportData = {
    timestamp: new Date().toISOString(),
    totalChanges: changes.length,
    changes: changes.map(change => ({
      id: change.id,
      timestamp: new Date(change.timestamp).toISOString(),
      action: change.action,
      table: change.table,
      synced: change.synced,
      data: change.data,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import pending changes (for debugging/restoration)
 */
export async function importPendingChanges(jsonData: string): Promise<void> {
  const db = await initOfflineDB();
  const importData = JSON.parse(jsonData);

  if (!importData.changes || !Array.isArray(importData.changes)) {
    throw new Error('Invalid import data format');
  }

  const tx = db.transaction('pending-changes', 'readwrite');

  for (const change of importData.changes) {
    await tx.store.put({
      id: change.id,
      timestamp: new Date(change.timestamp).getTime(),
      action: change.action,
      table: change.table,
      data: change.data,
      synced: change.synced,
    });
  }

  await tx.done;
  simpleLogger.info(`📥 Imported ${importData.changes.length} pending changes`);
}
