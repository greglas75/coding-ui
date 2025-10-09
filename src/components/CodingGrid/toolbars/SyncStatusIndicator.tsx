import type { FC } from 'react';
import { Wifi, WifiOff, Loader2, Check } from 'lucide-react';

interface SyncStatusIndicatorProps {
  syncStatus: 'online' | 'offline' | 'syncing' | 'saved';
  pendingCount: number;
  syncProgress: { current: number; total: number };
  onSyncNow: () => void;
}

export const SyncStatusIndicator: FC<SyncStatusIndicatorProps> = ({
  syncStatus,
  pendingCount,
  syncProgress,
  onSyncNow
}) => {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      {syncStatus === 'offline' && (
        <>
          <WifiOff size={14} className="text-orange-500" />
          <span className="text-xs text-orange-600 dark:text-orange-400">
            Offline ({pendingCount} queued)
          </span>
        </>
      )}

      {syncStatus === 'syncing' && (
        <>
          <Loader2 size={14} className="text-blue-500 animate-spin" />
          <span className="text-xs text-blue-600 dark:text-blue-400">
            Syncing... ({syncProgress.current}/{syncProgress.total})
          </span>
        </>
      )}

      {syncStatus === 'saved' && (
        <>
          <Check size={14} className="text-green-500" />
          <span className="text-xs text-green-600 dark:text-green-400">
            Saved
          </span>
        </>
      )}

      {syncStatus === 'online' && pendingCount === 0 && (
        <>
          <Wifi size={14} className="text-green-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Online
          </span>
        </>
      )}

      {pendingCount > 0 && syncStatus !== 'syncing' && (
        <button
          onClick={onSyncNow}
          className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Sync Now
        </button>
      )}
    </div>
  );
};