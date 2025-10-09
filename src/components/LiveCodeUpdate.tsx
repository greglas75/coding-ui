import { Code, UserPlus, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CodeUpdateEvent } from '../lib/realtimeService';

interface Props {
  update: CodeUpdateEvent;
  onDismiss?: () => void;
}

export function LiveCodeUpdate({ update, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 4000); // Show for 4 seconds

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm border border-blue-400">
        <div className="flex-shrink-0">
          <Zap size={20} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm flex items-center gap-1.5">
            <UserPlus size={14} />
            {update.userName}
          </div>
          <div className="text-xs opacity-90 truncate flex items-center gap-1.5 mt-0.5">
            <Code size={12} />
            {update.action === 'add' ? 'Added' : 'Removed'}: {update.codeName}
          </div>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
        >
          <Zap size={14} />
        </button>
      </div>
    </div>
  );
}
