/**
 * Claude Settings Component
 */

import type { ProviderSettingsProps } from '../types';
import { ProviderSettingsForm } from './ProviderSettingsForm';

export function ClaudeSettings({ models }: ProviderSettingsProps) {
  return (
    <ProviderSettingsForm
      provider="anthropic"
      providerName="Claude"
      defaultModel="claude-sonnet-4.5"
      models={models}
      apiKeyPlaceholder="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx"
      apiKeyUrl="https://console.anthropic.com/settings/keys"
      apiKeyPrefix="sk-ant-"
      apiKeyPrefixError="Invalid API key format. Claude keys start with 'sk-ant-'"
    />
  );
}

