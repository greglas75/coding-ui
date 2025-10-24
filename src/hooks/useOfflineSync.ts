import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  addPendingChange,
  cacheAnswers,
  clearCache,
  exportPendingChanges,
  getCachedAnswers,
  getCacheStats,
  getUnsyncedChanges,
  markMultipleAsSynced
} from '../lib/offlineStorage';
import { simpleLogger } from '../utils/logger';
import { getSupabaseClient } from '../lib/supabase';

const supabase = getSupabaseClient();

type SyncStatus = 'online' | 'offline' | 'syncing' | 'saved';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('online');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      simpleLogger.info('🌐 Connection restored');
      setIsOnline(true);
      setSyncStatus('online');
      toast.success('Connection restored - syncing...');
      syncPendingChanges();
    };

    const handleOffline = () => {
      simpleLogger.info('📴 Connection lost');
      setIsOnline(false);
      setSyncStatus('offline');
      toast.warning('Working offline - changes will sync when online');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count periodically
  useEffect(() => {
    async function updateCount() {
      try {
        const stats = await getCacheStats();
        setPendingCount(stats.unsyncedChanges);
      } catch (error) {
        simpleLogger.error('Failed to update pending count:', error);
      }
    }

    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Queue change for sync (works offline)
   */
  const queueChange = useCallback(async (change: {
    action: 'update' | 'insert' | 'delete';
    table: string;
    data: any;
  }): Promise<string> => {
    try {
      const changeId = await addPendingChange(change);
      setPendingCount(prev => prev + 1);

      if (isOnline) {
        // Try to sync immediately if online
        simpleLogger.info('🔄 Online - attempting immediate sync');
        syncPendingChanges();
      } else {
        setSyncStatus('offline');
        simpleLogger.info('📴 Offline - queued for later sync');
      }

      return changeId;
    } catch (error) {
      simpleLogger.error('Failed to queue change:', error);
      toast.error('Failed to save changes');
      throw error;
    }
  }, [isOnline]);

  /**
   * Sync all pending changes to Supabase
   */
  const syncPendingChanges = useCallback(async (): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> => {
    if (!isOnline) {
      simpleLogger.info('❌ Cannot sync - offline');
      toast.error('Cannot sync - you are offline');
      return { synced: 0, failed: 0, errors: ['Offline'] };
    }

    try {
      setSyncStatus('syncing');
      const unsyncedChanges = await getUnsyncedChanges();

      if (unsyncedChanges.length === 0) {
        simpleLogger.info('✅ No pending changes to sync');
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('online'), 2000);
        return { synced: 0, failed: 0, errors: [] };
      }

      simpleLogger.info(`🔄 Syncing ${unsyncedChanges.length} pending changes...`);
      setSyncProgress({ current: 0, total: unsyncedChanges.length });

      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      const syncedIds: string[] = [];

      // Grupuj zmiany po tabeli + akcji
      const grouped = unsyncedChanges.reduce((acc, change) => {
        const key = `${change.table}-${change.action}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(change);
        return acc;
      }, {} as Record<string, typeof unsyncedChanges>);

      simpleLogger.info(`📦 Grouped into ${Object.keys(grouped).length} batches`);

      let processedCount = 0;

      for (const [key, changes] of Object.entries(grouped)) {
        const [table, action] = key.split('-');

        try {
          if (action === 'update' && changes.length > 1) {
            simpleLogger.info(`🚀 Batch updating ${changes.length} records in ${table}`);

            const bulkRecords = changes.flatMap(change => {
              const ids = change.data.ids || [change.data.id];
              return ids.filter((id): id is number => id !== undefined).map((id) => ({
                id,
                ...change.data.updates,
                updated_at: new Date().toISOString()
              }));
            });

            const { error: bulkError } = await supabase
              .from(table)
              .upsert(bulkRecords, { onConflict: 'id', ignoreDuplicates: false });

            if (bulkError) throw bulkError;

            syncedIds.push(...changes.map(c => c.id));
            syncedCount += changes.length;
            processedCount += changes.length;

          } else if (action === 'insert' && changes.length > 1) {
            simpleLogger.info(`🚀 Batch inserting ${changes.length} records in ${table}`);

            const insertRecords = changes.map(c => c.data);

            const { error: insertError } = await supabase.from(table).insert(insertRecords);
            if (insertError) throw insertError;

            syncedIds.push(...changes.map(c => c.id));
            syncedCount += changes.length;
            processedCount += changes.length;

          } else if (action === 'delete' && changes.length > 1) {
            simpleLogger.info(`🚀 Batch deleting ${changes.length} records in ${table}`);

            const idsToDelete = changes.flatMap(c => c.data.ids || [c.data.id]);

            const { error: deleteError } = await supabase.from(table).delete().in('id', idsToDelete);
            if (deleteError) throw deleteError;

            syncedIds.push(...changes.map(c => c.id));
            syncedCount += changes.length;
            processedCount += changes.length;

          } else {
            // Pojedyncze operacje (fallback)
            for (const change of changes) {
              try {
                switch (change.action) {
                  case 'update':
                    const updateIds = change.data.ids || [change.data.id].filter(Boolean);
                    const { error: updateError } = await supabase
                      .from(table)
                      .update(change.data.updates)
                      .in('id', updateIds);
                    if (updateError) throw updateError;
                    break;

                  case 'insert':
                    const { error: insertError } = await supabase.from(table).insert(change.data);
                    if (insertError) throw insertError;
                    break;

                  case 'delete':
                    const deleteIds = change.data.ids || [change.data.id].filter(Boolean);
                    const { error: deleteError } = await supabase
                      .from(table)
                      .delete()
                      .in('id', deleteIds);
                    if (deleteError) throw deleteError;
                    break;
                }

                syncedIds.push(change.id);
                syncedCount++;
                processedCount++;

              } catch (error) {
                simpleLogger.error(`❌ Failed to sync single change:`, error);
                failedCount++;
                errors.push(`${change.action} on ${table}: ${error instanceof Error ? error.message : 'Unknown'}`);
              }
            }
          }

          setSyncProgress({ current: processedCount, total: unsyncedChanges.length });

        } catch (error) {
          simpleLogger.error(`❌ Batch operation failed for ${key}:`, error);
          failedCount += changes.length;
          errors.push(`Batch ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (syncedIds.length > 0) {
        await markMultipleAsSynced(syncedIds);
      }

      setPendingCount(failedCount);
      setLastSyncTime(new Date());
      setSyncProgress({ current: 0, total: 0 });

      if (failedCount === 0) {
        setSyncStatus('saved');
        toast.success(`⚡ Batch synced ${syncedCount} changes successfully`);
        setTimeout(() => setSyncStatus('online'), 2000);
      } else {
        setSyncStatus('offline');
        toast.error(`Synced ${syncedCount}, failed ${failedCount} changes`);
      }

      simpleLogger.info(`📊 Sync complete: ${syncedCount} synced, ${failedCount} failed`);
      return { synced: syncedCount, failed: failedCount, errors };

    } catch (error) {
      simpleLogger.error('❌ Sync process failed:', error);
      setSyncStatus('offline');
      setSyncProgress({ current: 0, total: 0 });
      toast.error('Sync process failed');
      return { synced: 0, failed: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }, [isOnline]);

  /**
   * Cache answers for offline access
   */
  const cacheAnswersOffline = useCallback(async (answers: any[]) => {
    try {
      await cacheAnswers(answers);
      simpleLogger.info(`💾 Cached ${answers.length} answers for offline access`);
    } catch (error) {
      simpleLogger.error('Failed to cache answers:', error);
    }
  }, []);

  /**
   * Get cached answers for offline use
   */
  const getCachedAnswersOffline = useCallback(async () => {
    try {
      const cached = await getCachedAnswers();
      simpleLogger.info(`📖 Retrieved ${cached.length} cached answers`);
      return cached;
    } catch (error) {
      simpleLogger.error('Failed to get cached answers:', error);
      return [];
    }
  }, []);

  /**
   * Clear all offline cache
   */
  const clearOfflineCache = useCallback(async () => {
    try {
      await clearCache();
      setPendingCount(0);
      toast.success('Offline cache cleared');
      simpleLogger.info('🗑️ Offline cache cleared');
    } catch (error) {
      simpleLogger.error('Failed to clear cache:', error);
      toast.error('Failed to clear cache');
    }
  }, []);

  /**
   * Export pending changes for debugging
   */
  const exportChanges = useCallback(async () => {
    try {
      const exportData = await exportPendingChanges();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pending-changes-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Changes exported for debugging');
    } catch (error) {
      simpleLogger.error('Failed to export changes:', error);
      toast.error('Failed to export changes');
    }
  }, []);

  /**
   * Get cache statistics
   */
  const getStats = useCallback(async () => {
    try {
      return await getCacheStats();
    } catch (error) {
      simpleLogger.error('Failed to get cache stats:', error);
      return { pendingChanges: 0, cachedAnswers: 0, unsyncedChanges: 0 };
    }
  }, []);

  return {
    // Status
    isOnline,
    syncStatus,
    pendingCount,
    lastSyncTime,
    syncProgress,

    // Actions
    queueChange,
    syncPendingChanges,
    cacheAnswersOffline,
    getCachedAnswersOffline,
    clearOfflineCache,
    exportChanges,
    getStats,
  };
}
