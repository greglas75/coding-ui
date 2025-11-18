/**
 * Cloud Sync Banner Component
 * Displays cloud sync status and controls
 */

import { Cloud, RefreshCw } from 'lucide-react';
import type { SyncStatus } from '../../../hooks/useSettingsSync';

interface CloudSyncBannerProps {
  user: { email: string } | null;
  syncStatus: SyncStatus;
  onSync: () => void;
}

export function CloudSyncBanner({ user, syncStatus, onSync }: CloudSyncBannerProps) {
  if (!user) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Cloud className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 text-sm">
            ☁️ Cloud Sync Enabled
          </h3>
          <p className="text-xs text-green-800 dark:text-green-200 mb-3">
            Your API keys are synced across browsers using AES-256 encryption. Signed in as{' '}
            <strong>{user.email}</strong>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onSync}
              disabled={syncStatus.syncing}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-medium rounded-lg transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncStatus.syncing ? 'animate-spin' : ''}`} />
              {syncStatus.syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            {syncStatus.lastSync && (
              <span className="text-xs text-green-700 dark:text-green-300">
                Last synced: {new Date(syncStatus.lastSync).toLocaleString()} (v{syncStatus.version})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

