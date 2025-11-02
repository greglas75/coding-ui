/**
 * User Profile - Shows current user and logout
 */

import { useState } from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export function UserProfile() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 rounded-lg">
      <User size={16} className="text-blue-400" />
      <span className="text-sm text-gray-300">{user.email}</span>
      <button
        onClick={handleSignOut}
        disabled={loading}
        className="p-1 hover:bg-neutral-700 rounded transition-colors disabled:opacity-50"
        title="Sign out"
      >
        <LogOut size={14} className="text-gray-400 hover:text-gray-200" />
      </button>
    </div>
  );
}
