/**
 * Settings Synchronization Hook
 * Handles syncing API keys with backend
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllAPIKeys, setAnthropicAPIKey, setOpenAIAPIKey, setGoogleGeminiAPIKey, setGoogleCSEAPIKey, setGoogleCSECXID, setPineconeAPIKey } from '../utils/apiKeys';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020';

interface SyncStatus {
  lastSync: Date | null;
  version: number;
  syncing: boolean;
}

export function useSettingsSync() {
  const { session } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    version: 0,
    syncing: false,
  });

  // Fetch settings from server and apply locally
  const fetchAndApplySettings = useCallback(async () => {
    if (!session) {
      console.log('No session available, skipping fetch');
      return false;
    }

    setSyncStatus(prev => ({ ...prev, syncing: true }));

    try {
      const response = await fetch(`${API_BASE}/api/settings-sync`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();

      if (data.settings) {
        // Apply settings to localStorage
        if (data.settings.anthropic_api_key) setAnthropicAPIKey(data.settings.anthropic_api_key);
        if (data.settings.openai_api_key) setOpenAIAPIKey(data.settings.openai_api_key);
        if (data.settings.google_gemini_api_key) setGoogleGeminiAPIKey(data.settings.google_gemini_api_key);
        if (data.settings.google_cse_api_key) setGoogleCSEAPIKey(data.settings.google_cse_api_key);
        if (data.settings.google_cse_cx_id) setGoogleCSECXID(data.settings.google_cse_cx_id);
        if (data.settings.pinecone_api_key) setPineconeAPIKey(data.settings.pinecone_api_key);

        setSyncStatus({
          lastSync: new Date(data.lastModified),
          version: data.version,
          syncing: false,
        });

        return true;
      } else {
        // No settings on server yet
        setSyncStatus(prev => ({ ...prev, syncing: false }));
        return false;
      }
    } catch (error) {
      console.error('Settings fetch error:', error);
      setSyncStatus(prev => ({ ...prev, syncing: false }));
      throw error;
    }
  }, [session]);

  // Push local settings to server
  const pushSettings = useCallback(async () => {
    if (!session) {
      toast.error('Please sign in to sync settings');
      return;
    }

    setSyncStatus(prev => ({ ...prev, syncing: true }));

    try {
      const localSettings = getAllAPIKeys();

      const response = await fetch(`${API_BASE}/api/settings-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: localSettings }),
      });

      if (!response.ok) {
        throw new Error('Failed to push settings');
      }

      const data = await response.json();

      setSyncStatus({
        lastSync: new Date(data.lastModified),
        version: data.version,
        syncing: false,
      });

      toast.success('Settings synced successfully!');
      return true;
    } catch (error) {
      console.error('Settings push error:', error);
      setSyncStatus(prev => ({ ...prev, syncing: false }));
      toast.error('Failed to sync settings');
      return false;
    }
  }, [session]);

  // Sync: fetch from server, compare timestamps, and merge
  const syncSettings = useCallback(async () => {
    if (!session) {
      console.log('No session available, skipping sync');
      return;
    }

    setSyncStatus(prev => ({ ...prev, syncing: true }));

    try {
      // Try to fetch settings from server
      const hasServerSettings = await fetchAndApplySettings();

      if (!hasServerSettings) {
        // No server settings, push local
        await pushSettings();
        toast.info('Local settings uploaded to cloud');
      } else {
        toast.success('Settings synced from cloud');
      }
    } catch (error) {
      toast.error('Sync failed - please try again');
      setSyncStatus(prev => ({ ...prev, syncing: false }));
    }
  }, [session, fetchAndApplySettings, pushSettings]);

  return {
    syncStatus,
    syncSettings,
    pushSettings,
    fetchSettings: fetchAndApplySettings,
  };
}
