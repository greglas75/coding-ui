import { SyncStatusIndicator } from '../toolbars/SyncStatusIndicator';
import { ViewOptionsMenu } from './ViewOptionsMenu';
import type { SyncStatus, SyncProgress } from '../../../hooks/useOfflineSync';

interface HeaderControlsProps {
  syncStatus: SyncStatus;
  pendingCount: number;
  syncProgress: SyncProgress;
  onSyncNow: () => Promise<void>;
  density: 'comfortable' | 'compact';
  onDensityChange: (density: 'comfortable' | 'compact') => void;
  onShowShortcuts: () => void;
}

export function HeaderControls({
  syncStatus,
  pendingCount,
  syncProgress,
  onSyncNow,
  density,
  onDensityChange,
  onShowShortcuts,
}: HeaderControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Status */}
      <SyncStatusIndicator
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        syncProgress={syncProgress}
        onSyncNow={onSyncNow}
      />

      {/* Shortcuts button */}
      <button
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
        onClick={onShowShortcuts}
        title="Show keyboard shortcuts"
      >
        <span>?</span>
        <span className="hidden sm:inline">Shortcuts</span>
      </button>

      {/* View Options Dropdown */}
      <ViewOptionsMenu density={density} onDensityChange={onDensityChange} />
    </div>
  );
}

