/**
 * useRealtimeCollaboration Hook
 *
 * Manages realtime collaboration features:
 * - User presence tracking
 * - Live code updates
 * - Realtime service initialization
 */

import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import type { Answer } from '../../../types';
import { RealtimeService, type CodeUpdateEvent, type UserPresence } from '../../../lib/realtimeService';
import { simpleLogger } from '../../../utils/logger';

interface UseRealtimeCollaborationOptions {
  categoryId: number | undefined;
  focusedRowId: number | null;
  setLocalAnswers: Dispatch<SetStateAction<Answer[]>>;
}

interface UseRealtimeCollaborationReturn {
  realtimeService: RealtimeService;
  onlineUsers: UserPresence[];
  liveUpdate: CodeUpdateEvent | null;
  setLiveUpdate: Dispatch<SetStateAction<CodeUpdateEvent | null>>;
}

export function useRealtimeCollaboration({
  categoryId,
  focusedRowId,
  setLocalAnswers,
}: UseRealtimeCollaborationOptions): UseRealtimeCollaborationReturn {
  // Realtime service instance (stable across renders)
  const [realtimeService] = useState(() => new RealtimeService());

  // Online users tracking
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);

  // Live code update notifications
  const [liveUpdate, setLiveUpdate] = useState<CodeUpdateEvent | null>(null);

  // Initialize realtime connection when category changes
  useEffect(() => {
    if (!categoryId) return;

    const initRealtime = async () => {
      try {
        // Generate user identity (in production, this should come from auth)
        const userName = `User-${Math.random().toString(36).substring(7)}`;
        const userId = `user-${Date.now()}`;

        // Join the category's realtime project
        await realtimeService.joinProject(categoryId, userId, userName);

        // Subscribe to presence updates
        realtimeService.onPresenceUpdate(users => {
          setOnlineUsers(users);
        });

        // Subscribe to code update events
        realtimeService.onCodeUpdateReceived(update => {
          setLiveUpdate(update);

          // Update local state with the new code
          setLocalAnswers(prev =>
            prev.map(a =>
              a.id === update.answerId
                ? { ...a, selected_code: update.action === 'add' ? update.codeName : null }
                : a
            )
          );

          // Clear the notification after 4 seconds
          setTimeout(() => setLiveUpdate(null), 4000);
        });

        simpleLogger.info('✅ Realtime collaboration initialized');
      } catch (error) {
        simpleLogger.error('❌ Failed to initialize realtime:', error);
      }
    };

    initRealtime();

    // Cleanup: leave the project when unmounting or category changes
    return () => {
      realtimeService.leave();
      simpleLogger.info('👋 Left realtime collaboration');
    };
  }, [categoryId, realtimeService, setLocalAnswers]);

  // Update current answer in realtime when focus changes
  useEffect(() => {
    if (focusedRowId) {
      realtimeService.updateCurrentAnswer(focusedRowId);
    }
  }, [focusedRowId, realtimeService]);

  return {
    realtimeService,
    onlineUsers,
    liveUpdate,
    setLiveUpdate,
  };
}
