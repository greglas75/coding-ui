/**
 * 🔑 API Keys Helper
 *
 * Centralized utilities for reading API keys from Settings page (localStorage)
 *
 * Security: Keys are obfuscated in localStorage to prevent casual inspection.
 * For stronger security, users can enable master password encryption in Settings.
 */

import { obfuscate, deobfuscate, decrypt, isCryptoAvailable } from './encryption';

export interface APIKeys {
  anthropic?: string | null;
  openai?: string | null;
  google_gemini?: string | null;
  google_cse?: string | null;
  google_cse_cx?: string | null;
}

/**
 * Check if session-only mode is enabled
 */
function isSessionOnlyMode(): boolean {
  return localStorage.getItem('api_keys_session_only') === 'true';
}

/**
 * Get storage (localStorage or sessionStorage based on settings)
 */
function getStorage(): Storage {
  return isSessionOnlyMode() ? sessionStorage : localStorage;
}

/**
 * Internal: Get encrypted/obfuscated value from storage
 */
function getSecureValue(key: string): string | null {
  const storage = getStorage();
  const stored = storage.getItem(key);
  if (!stored) return null;

  try {
    // Try to deobfuscate (handles both old plain text and new obfuscated)
    return deobfuscate(stored);
  } catch {
    // Fallback to plain text for backward compatibility
    return stored;
  }
}

/**
 * Internal: Set encrypted/obfuscated value in storage
 */
function setSecureValue(key: string, value: string): void {
  // Always obfuscate before storing
  const obfuscated = obfuscate(value);
  const storage = getStorage();
  storage.setItem(key, obfuscated);
}

/**
 * Get Anthropic (Claude) API key from Settings page
 */
export function getAnthropicAPIKey(): string | null {
  return getSecureValue('anthropic_api_key');
}

/**
 * Get OpenAI API key from Settings page
 */
export function getOpenAIAPIKey(): string | null {
  return getSecureValue('openai_api_key');
}

/**
 * Get Google Gemini API key from Settings page
 */
export function getGoogleGeminiAPIKey(): string | null {
  return getSecureValue('google_gemini_api_key');
}

/**
 * Get Google Custom Search API key from Settings page
 */
export function getGoogleCSEAPIKey(): string | null {
  return getSecureValue('google_cse_api_key');
}

/**
 * Get Google Custom Search Engine ID (CX) from Settings page
 */
export function getGoogleCSECXID(): string | null {
  return getSecureValue('google_cse_cx_id');
}

/**
 * Set Anthropic API key (with obfuscation)
 */
export function setAnthropicAPIKey(value: string): void {
  setSecureValue('anthropic_api_key', value);
}

/**
 * Set OpenAI API key (with obfuscation)
 */
export function setOpenAIAPIKey(value: string): void {
  setSecureValue('openai_api_key', value);
}

/**
 * Set Google Gemini API key (with obfuscation)
 */
export function setGoogleGeminiAPIKey(value: string): void {
  setSecureValue('google_gemini_api_key', value);
}

/**
 * Set Google CSE API key (with obfuscation)
 */
export function setGoogleCSEAPIKey(value: string): void {
  setSecureValue('google_cse_api_key', value);
}

/**
 * Set Google CSE CX ID (with obfuscation)
 */
export function setGoogleCSECXID(value: string): void {
  setSecureValue('google_cse_cx_id', value);
}

/**
 * Get all configured API keys from Settings page
 */
export function getAllAPIKeys(): APIKeys {
  return {
    anthropic: getAnthropicAPIKey(),
    openai: getOpenAIAPIKey(),
    google_gemini: getGoogleGeminiAPIKey(),
    google_cse: getGoogleCSEAPIKey(),
    google_cse_cx: getGoogleCSECXID(),
  };
}

/**
 * Check if Anthropic (Claude) is configured
 */
export function isAnthropicConfigured(): boolean {
  const key = getAnthropicAPIKey();
  return !!key && key.trim().length > 0;
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  const key = getOpenAIAPIKey();
  return !!key && key.trim().length > 0;
}

/**
 * Check if Google Gemini is configured
 */
export function isGoogleGeminiConfigured(): boolean {
  const key = getGoogleGeminiAPIKey();
  return !!key && key.trim().length > 0;
}

/**
 * Check if Google Custom Search is configured
 */
export function isGoogleCSEConfigured(): boolean {
  const apiKey = getGoogleCSEAPIKey();
  const cxId = getGoogleCSECXID();
  return !!apiKey && apiKey.trim().length > 0 && !!cxId && cxId.trim().length > 0;
}

/**
 * Check if any AI provider is configured
 */
export function isAnyAIProviderConfigured(): boolean {
  return isAnthropicConfigured() || isOpenAIConfigured() || isGoogleGeminiConfigured();
}

// ═══════════════════════════════════════════════════════════════
// Session-Only Mode Management
// ═══════════════════════════════════════════════════════════════

/**
 * Enable session-only mode (keys stored in sessionStorage, cleared on tab close)
 */
export function enableSessionOnlyMode(): void {
  // Set flag in localStorage (persists across sessions)
  localStorage.setItem('api_keys_session_only', 'true');

  // Migrate existing keys from localStorage to sessionStorage
  const keysToMigrate = [
    'anthropic_api_key',
    'openai_api_key',
    'google_gemini_api_key',
    'google_cse_api_key',
    'google_cse_cx_id',
  ];

  keysToMigrate.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  });
}

/**
 * Disable session-only mode (keys stored in localStorage, persist across sessions)
 */
export function disableSessionOnlyMode(): void {
  // Remove flag from localStorage
  localStorage.removeItem('api_keys_session_only');

  // Migrate existing keys from sessionStorage to localStorage
  const keysToMigrate = [
    'anthropic_api_key',
    'openai_api_key',
    'google_gemini_api_key',
    'google_cse_api_key',
    'google_cse_cx_id',
  ];

  keysToMigrate.forEach((key) => {
    const value = sessionStorage.getItem(key);
    if (value) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    }
  });
}

/**
 * Get current session-only mode status
 */
export function getSessionOnlyMode(): boolean {
  return isSessionOnlyMode();
}

/**
 * Clear all API keys from both localStorage and sessionStorage
 */
export function clearAllAPIKeys(): void {
  const keysToRemove = [
    'anthropic_api_key',
    'openai_api_key',
    'google_gemini_api_key',
    'google_cse_api_key',
    'google_cse_cx_id',
    'anthropic_model',
    'openai_model',
    'google_gemini_model',
    'anthropic_temperature',
    'openai_temperature',
    'google_gemini_temperature',
  ];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}
