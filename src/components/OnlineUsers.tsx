import { Circle, Users } from 'lucide-react';
import type { UserPresence } from '../lib/realtimeService';

interface Props {
  users: UserPresence[];
  currentUserId: string;
}

export function OnlineUsers({ users, currentUserId }: Props) {
  const otherUsers = users.filter(u => u.userId !== currentUserId);

  if (otherUsers.length === 0) {
    return null; // Don't show if alone
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 border border-gray-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Users size={16} className="text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {otherUsers.length} Online
        </span>
      </div>

      <div className="flex -space-x-2">
        {otherUsers.slice(0, 5).map(user => (
          <div
            key={user.userId}
            className="relative group"
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-white dark:border-neutral-900 flex items-center justify-center text-white font-semibold text-xs cursor-help transition-transform hover:scale-110"
              style={{ backgroundColor: user.userColor }}
              title={user.userName}
            >
              {user.userName.charAt(0).toUpperCase()}
            </div>

            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5">
              <Circle
                size={10}
                className="fill-green-500 text-green-500"
              />
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
              <div className="font-semibold">{user.userName}</div>
              {user.currentAnswerId && (
                <div className="text-gray-400 mt-0.5">
                  Viewing answer #{user.currentAnswerId}
                </div>
              )}
              <div className="text-gray-500 text-[10px] mt-0.5">
                Active {new Date(user.lastActivity).toLocaleTimeString()}
              </div>
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
            </div>
          </div>
        ))}

        {otherUsers.length > 5 && (
          <div
            className="w-8 h-8 rounded-full border-2 border-white dark:border-neutral-900 bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-semibold text-xs cursor-help"
            title={`${otherUsers.length - 5} more users online`}
          >
            +{otherUsers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}
