/**
 * Gemini Settings Component
 */

import type { ProviderSettingsProps } from '../types';
import { ProviderSettingsForm } from './ProviderSettingsForm';

export function GeminiSettings({ models }: ProviderSettingsProps) {
  return (
    <ProviderSettingsForm
      provider="google_gemini"
      providerName="Gemini"
      defaultModel="gemini-2.0-pro-exp"
      models={models}
      apiKeyPlaceholder="AIzaSy..."
      apiKeyUrl="https://aistudio.google.com/app/apikey"
    />
  );
}

