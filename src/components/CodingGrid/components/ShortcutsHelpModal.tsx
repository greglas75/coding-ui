import { X } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b">
      <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs font-mono font-semibold">
        {shortcut}
      </kbd>
      <span className="text-gray-600 flex-1 ml-4 text-sm">{description}</span>
    </div>
  );
}

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">⌨️ Keyboard Shortcuts</h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <ShortcutRow shortcut="B" description="Mark as Blacklist" />
          <ShortcutRow shortcut="C" description="Confirm (accepts AI suggestion if available)" />
          <ShortcutRow shortcut="O" description="Mark as Other" />
          <ShortcutRow shortcut="I" description="Mark as Ignored" />
          <ShortcutRow shortcut="G" description="Mark as Global Blacklist" />
          <ShortcutRow shortcut="A" description="Run AI Categorization" />
          <ShortcutRow shortcut="S" description="Open Code Selection" />
          <ShortcutRow shortcut="↑/↓" description="Navigate rows" />
          <ShortcutRow shortcut="Esc" description="Clear focus" />
        </div>
      </div>
    </div>
  );
}

