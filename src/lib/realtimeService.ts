import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';
import { simpleLogger } from '../utils/logger';

const supabase = getSupabaseClient();

export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  currentAnswerId: number | null;
  lastActivity: string;
  isOnline: boolean;
}

export interface CodeUpdateEvent {
  answerId: number;
  codeId: number;
  codeName: string;
  action: 'add' | 'remove';
  userId: string;
  userName: string;
  timestamp: string;
}

export class RealtimeService {
  private channel: RealtimeChannel | null = null;
  private presenceData: Map<string, UserPresence> = new Map();
  private onPresenceChange: ((users: UserPresence[]) => void) | null = null;
  private onCodeUpdate: ((update: CodeUpdateEvent) => void) | null = null;
  private currentUserId: string | null = null;

  /**
   * Join a project for real-time collaboration
   */
  async joinProject(
    categoryId: number,
    userId: string,
    userName: string
  ): Promise<void> {
    this.currentUserId = userId;

    // Leave previous channel
    if (this.channel) {
      await this.leave();
    }

    simpleLogger.info(`🔗 Joining realtime channel for category: ${categoryId}`);

    // Create channel for this category
    this.channel = supabase.channel(`category:${categoryId}`, {
      config: {
        presence: {
          key: userId
        },
        broadcast: {
          self: false // Don't receive own broadcasts
        }
      }
    });

    // Track presence changes
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel!.presenceState();
        this.presenceData.clear();

        Object.values(state).forEach((presences: unknown[]) => {
          presences.forEach((presence: unknown) => {
            const p = presence as Partial<UserPresence>;
            if (p.userId) {
              this.presenceData.set(p.userId, {
                ...p,
                isOnline: true
              } as UserPresence);
            }
          });
        });

        simpleLogger.info(`👥 Presence synced: ${this.presenceData.size} users online`);
        this.notifyPresenceChange();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        simpleLogger.info(`👋 User joined:`, key);
        (newPresences as unknown[]).forEach((presence: unknown) => {
          const p = presence as Partial<UserPresence>;
          if (p.userId) {
            this.presenceData.set(p.userId, {
              ...p,
              isOnline: true
            } as UserPresence);
          }
        });
        this.notifyPresenceChange();
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        simpleLogger.info(`👋 User left:`, key);
        (leftPresences as unknown[]).forEach((presence: unknown) => {
          const p = presence as Partial<UserPresence>;
          if (p.userId) {
            this.presenceData.delete(p.userId);
          }
        });
        this.notifyPresenceChange();
      });

    // Listen to code updates
    this.channel.on(
      'broadcast',
      { event: 'code-update' },
      (payload) => {
        simpleLogger.info('📡 Received code update:', payload.payload);
        if (this.onCodeUpdate) {
          this.onCodeUpdate(payload.payload as CodeUpdateEvent);
        }
      }
    );

    // Subscribe and set initial presence
    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        simpleLogger.info('✅ Subscribed to realtime channel');
        await this.channel!.track({
          userId,
          userName,
          userColor: this.generateUserColor(userId),
          currentAnswerId: null,
          lastActivity: new Date().toISOString()
        });
      } else if (status === 'CHANNEL_ERROR') {
        simpleLogger.error('❌ Channel subscription error');
      } else if (status === 'TIMED_OUT') {
        simpleLogger.error('⏱️ Channel subscription timed out');
      }
    });
  }

  /**
   * Update current answer being viewed
   */
  async updateCurrentAnswer(answerId: number | null): Promise<void> {
    if (this.channel) {
      const currentPresence = this.presenceData.get(this.currentUserId!);
      if (currentPresence) {
        await this.channel.track({
          ...currentPresence,
          currentAnswerId: answerId,
          lastActivity: new Date().toISOString()
        });
        simpleLogger.info(`👁️ Updated current answer: ${answerId}`);
      }
    }
  }

  /**
   * Broadcast code update to team
   */
  async broadcastCodeUpdate(update: Omit<CodeUpdateEvent, 'timestamp'>): Promise<void> {
    if (this.channel) {
      const fullUpdate: CodeUpdateEvent = {
        ...update,
        timestamp: new Date().toISOString()
      };

      await this.channel.send({
        type: 'broadcast',
        event: 'code-update',
        payload: fullUpdate
      });

      simpleLogger.info('📤 Broadcasted code update:', fullUpdate);
    }
  }

  /**
   * Register callback for presence changes
   */
  onPresenceUpdate(callback: (users: UserPresence[]) => void): void {
    this.onPresenceChange = callback;
  }

  /**
   * Register callback for code updates
   */
  onCodeUpdateReceived(callback: (update: CodeUpdateEvent) => void): void {
    this.onCodeUpdate = callback;
  }

  /**
   * Get list of online users
   */
  getOnlineUsers(): UserPresence[] {
    return Array.from(this.presenceData.values());
  }

  /**
   * Check if answer is being viewed by someone
   */
  isAnswerBeingViewed(answerId: number): UserPresence | null {
    for (const user of this.presenceData.values()) {
      if (user.currentAnswerId === answerId && user.userId !== this.currentUserId) {
        return user;
      }
    }
    return null;
  }

  /**
   * Notify presence change
   */
  private notifyPresenceChange(): void {
    if (this.onPresenceChange) {
      this.onPresenceChange(this.getOnlineUsers());
    }
  }

  /**
   * Generate consistent color for user
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16'  // Lime
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  /**
   * Leave channel and cleanup
   */
  async leave(): Promise<void> {
    if (this.channel) {
      simpleLogger.info('👋 Leaving realtime channel');
      await this.channel.unsubscribe();
      this.channel = null;
      this.presenceData.clear();
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      channelActive: this.channel !== null,
      onlineUsers: this.presenceData.size,
      users: this.getOnlineUsers()
    };
  }
}
