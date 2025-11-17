/**
 * Types for Codeframe Builder components
 */

export type TabType = 'manual' | 'ai' | 'paste';
export type VerificationStep = 'idle' | 'discovering' | 'verifying' | 'done';

export interface DiscoveredCode {
  name: string;
  frequency?: number;
  type?: string;
  verified?: boolean;
  confidence?: number;
  official_name?: string;
  website?: string;
  logo_url?: string;
  verification_source?: string;
  reason?: string;
}

export interface VerificationProgress {
  current: number;
  total: number;
}
