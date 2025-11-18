/**
 * Hook for managing provider settings (OpenAI, Claude, Gemini)
 * Handles localStorage persistence and validation
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface UseProviderSettingsOptions {
  provider: 'openai' | 'anthropic' | 'google_gemini';
  defaultModel: string;
  defaultTemperature: number;
}

export function useProviderSettings({
  provider,
  defaultModel,
  defaultTemperature,
}: UseProviderSettingsOptions) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(defaultModel);
  const [temperature, setTemperature] = useState(defaultTemperature);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const apiKeyKey = `${provider}_api_key`;
    const modelKey = `${provider}_model`;
    const temperatureKey = `${provider}_temperature`;

    const savedApiKey = localStorage.getItem(apiKeyKey) || '';
    const savedModel = localStorage.getItem(modelKey) || defaultModel;
    const savedTemperature = parseFloat(localStorage.getItem(temperatureKey) || String(defaultTemperature));

    setApiKey(savedApiKey);
    setModel(savedModel);
    setTemperature(savedTemperature);
    setIsValid(savedApiKey.length > 0);
  }, [provider, defaultModel, defaultTemperature]);

  const handleSave = () => {
    const apiKeyKey = `${provider}_api_key`;
    const modelKey = `${provider}_model`;
    const temperatureKey = `${provider}_temperature`;

    localStorage.setItem(apiKeyKey, apiKey);
    localStorage.setItem(modelKey, model);
    localStorage.setItem(temperatureKey, temperature.toString());

    const providerName = provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Claude' : 'Gemini';
    toast.success(`${providerName} settings saved!`);
    setIsValid(apiKey.length > 0);
  };

  const handleReset = () => {
    const providerName = provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Claude' : 'Gemini';
    if (confirm(`Reset ${providerName} settings to defaults?`)) {
      const apiKeyKey = `${provider}_api_key`;
      const modelKey = `${provider}_model`;
      const temperatureKey = `${provider}_temperature`;

      setApiKey('');
      setModel(defaultModel);
      setTemperature(defaultTemperature);
      localStorage.removeItem(apiKeyKey);
      localStorage.removeItem(modelKey);
      localStorage.removeItem(temperatureKey);
      toast.info(`${providerName} settings reset`);
      setIsValid(false);
    }
  };

  return {
    apiKey,
    setApiKey,
    model,
    setModel,
    temperature,
    setTemperature,
    showApiKey,
    setShowApiKey,
    isValid,
    handleSave,
    handleReset,
  };
}

