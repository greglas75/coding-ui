/**
 * 🔐 Encryption utilities for secure localStorage storage
 *
 * Uses Web Crypto API for AES-GCM encryption
 */

/**
 * Generate encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key from password
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(plaintext: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random salt and IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encrypt data
  const encryptedData = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

  // Return base64 encoded
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(ciphertext: string, password: string): Promise<string> {
  try {
    // Decode base64
    const combined = new Uint8Array(
      atob(ciphertext)
        .split('')
        .map((c) => c.charCodeAt(0))
    );

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Decrypt data
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    );

    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    throw new Error('Decryption failed - incorrect password or corrupted data');
  }
}

/**
 * Simple obfuscation (NOT SECURE - just makes casual inspection harder)
 * Use this if user doesn't set master password
 */
export function obfuscate(data: string): string {
  // Base64 encode + simple XOR with fixed key
  const key = 'coding-ui-2025'; // Fixed key in code (not secure!)
  const encoded = btoa(data);
  let result = '';

  for (let i = 0; i < encoded.length; i++) {
    result += String.fromCharCode(
      encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }

  return btoa(result);
}

/**
 * Deobfuscate data
 */
export function deobfuscate(data: string): string {
  try {
    const key = 'coding-ui-2025';
    const decoded = atob(data);
    let result = '';

    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    return atob(result);
  } catch {
    return data; // Return as-is if decoding fails (backward compatibility)
  }
}

/**
 * Check if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return !!(window.crypto && window.crypto.subtle);
}
