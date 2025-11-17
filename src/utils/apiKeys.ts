/**
 * 🔑 API Keys Helper
 *
 * Centralized utilities for reading API keys from Settings page (localStorage)
 *
 * Security: Keys are obfuscated in localStorage to prevent casual inspection.
 * For stronger security, users can enable master password encryption in Settings.
 */

import { obfuscate, deobfuscate, decrypt, isCryptoAvailable } from './encryption';

const importMetaEnv = (import.meta?.env ?? {}) as Record<string, string | undefined>;

if (typeof process !== 'undefined' && process.env) {
  const envKeys = [
    'VITE_OPENAI_API_KEY',
    'VITE_ANTHROPIC_API_KEY',
    'VITE_GOOGLE_GEMINI_API_KEY',
    'VITE_GOOGLE_CSE_API_KEY',
    'VITE_GOOGLE_CSE_CX_ID',
    'VITE_PINECONE_API_KEY',
  ];

  envKeys.forEach(key => {
    if (typeof importMetaEnv[key] === 'undefined' && typeof process.env[key] === 'string') {
      importMetaEnv[key] = process.env[key];
    }
  });
}

export interface APIKeys {
  anthropic?: string | null;
  openai?: string | null;
  google_gemini?: string | null;
  google_cse?: string | null;
  google_cse_cx?: string | null;
  pinecone?: string | null;
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

function getEnvValue(envKey: string): string | null {
  const envValue = importMetaEnv[envKey];

  if (typeof envValue === 'string') {
    if (envValue.trim().length > 0) {
      return envValue;
    }
    return null;
  }

  const processValue =
    typeof process !== 'undefined' ? (process.env?.[envKey] as string | undefined) : undefined;

  if (typeof processValue === 'string' && processValue.trim().length > 0) {
    return processValue;
  }

  return null;
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
  return getSecureValue('anthropic_api_key') ?? getEnvValue('VITE_ANTHROPIC_API_KEY');
}

/**
 * Get OpenAI API key from Settings page
 */
export function getOpenAIAPIKey(): string | null {
  return getSecureValue('openai_api_key') ?? getEnvValue('VITE_OPENAI_API_KEY');
}

/**
 * Get Google Gemini API key from Settings page
 */
export function getGoogleGeminiAPIKey(): string | null {
  return getSecureValue('google_gemini_api_key') ?? getEnvValue('VITE_GOOGLE_GEMINI_API_KEY');
}

/**
 * Get Google Custom Search API key from Settings page
 */
export function getGoogleCSEAPIKey(): string | null {
  return getSecureValue('google_cse_api_key') ?? getEnvValue('VITE_GOOGLE_CSE_API_KEY');
}

/**
 * Get Google Custom Search Engine ID (CX) from Settings page
 */
export function getGoogleCSECXID(): string | null {
  return getSecureValue('google_cse_cx_id') ?? getEnvValue('VITE_GOOGLE_CSE_CX_ID');
}

/**
 * Get Pinecone API key from Settings page
 */
export function getPineconeAPIKey(): string | null {
  return getSecureValue('pinecone_api_key') ?? getEnvValue('VITE_PINECONE_API_KEY');
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
 * Set Pinecone API key (with obfuscation)
 */
export function setPineconeAPIKey(value: string): void {
  setSecureValue('pinecone_api_key', value);
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
    pinecone: getPineconeAPIKey(),
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
    'pinecone_api_key',
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
    'pinecone_api_key',
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
    'pinecone_api_key',
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
