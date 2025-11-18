/**
 * OpenAI Settings Component
 */

import type { ProviderSettingsProps } from '../types';
import { ProviderSettingsForm } from './ProviderSettingsForm';

export function OpenAISettings({ models }: ProviderSettingsProps) {
  return (
    <ProviderSettingsForm
      provider="openai"
      providerName="OpenAI"
      defaultModel="gpt-4o"
      models={models}
      apiKeyPlaceholder="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx"
      apiKeyUrl="https://platform.openai.com/api-keys"
      apiKeyPrefix="sk-"
      apiKeyPrefixError="Invalid API key format. OpenAI keys start with 'sk-'"
    />
  );
}

