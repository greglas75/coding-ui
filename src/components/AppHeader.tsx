import { Code2, DollarSign, FileSpreadsheet, Home, Image, List, LogIn, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthDialog } from './Auth/AuthDialog';
import { UserProfile } from './Auth/UserProfile';
import { ServerStatus } from './ServerStatus';
import { useAuth } from '../contexts/AuthContext';

interface AppHeaderProps {
  dark: boolean;
  onToggleTheme: () => void;
}

export default function AppHeader({ dark, onToggleTheme }: AppHeaderProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-neutral-900 border-b border-neutral-800 text-gray-100">
      <div className="flex items-center space-x-4">
        <Link to="/" className="flex items-center space-x-3">
          <span className="text-2xl font-semibold tracking-tight text-blue-400">
            Research
          </span>
          <span className="text-sm text-gray-400 italic">
            Coding & AI Categorization Dashboard
          </span>
        </Link>

        {/* Server Status Indicator */}
        <div className="pl-4 border-l border-neutral-700">
          <ServerStatus />
        </div>
      </div>

      <nav className="flex items-center space-x-4">
        <Link
          to="/"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition cursor-pointer ${
            location.pathname === '/' || location.pathname === '/categories'
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-800 hover:bg-neutral-700 text-gray-200'
          }`}
        >
          <List size={16} />
          Categories
        </Link>
        <Link
          to="/coding"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition cursor-pointer ${
            location.pathname === '/coding'
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-800 hover:bg-neutral-700 text-gray-200'
          }`}
        >
          <Code2 size={16} />
          Coding
        </Link>
        <Link
          to="/codes"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition cursor-pointer ${
            location.pathname === '/codes'
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-800 hover:bg-neutral-700 text-gray-200'
          }`}
        >
          <Home size={16} />
          Code List
        </Link>
        <Link
          to="/file-data-coding"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition cursor-pointer ${
            location.pathname === '/file-data-coding'
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-800 hover:bg-neutral-700 text-gray-200'
          }`}
        >
          <FileSpreadsheet size={16} />
          File Import
        </Link>
        <Link
          to="/cost-dashboard"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition cursor-pointer ${
            location.pathname === '/cost-dashboard'
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-800 hover:bg-neutral-700 text-gray-200'
          }`}
          title="AI Cost Dashboard"
        >
          <DollarSign size={16} />
          Costs
        </Link>
        <Link
          to="/image-tester"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition cursor-pointer ${
            location.pathname === '/image-tester'
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-800 hover:bg-neutral-700 text-gray-200'
          }`}
          title="AI Image Search Tester"
        >
          <Image size={16} />
          Image Tester
        </Link>
        <Link
          to="/settings"
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition cursor-pointer ${
            location.pathname === '/settings'
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-800 hover:bg-neutral-700 text-gray-200'
          }`}
          title="AI Settings"
        >
          <Settings size={16} />
          Settings
        </Link>
        <div className="flex items-center space-x-2">
          {/* Auth Section - Show UserProfile if logged in, otherwise Sign In button */}
          {user ? (
            <UserProfile />
          ) : (
            <button
              onClick={() => setShowAuthDialog(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition cursor-pointer"
            >
              <LogIn size={16} />
              Sign In
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            Refresh
          </button>
          <button
            onClick={onToggleTheme}
            className="bg-neutral-700 hover:bg-neutral-600 text-sm text-gray-200 px-3 py-1.5 rounded-lg cursor-pointer"
          >
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </nav>

      {/* Auth Dialog Modal */}
      <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />
    </header>
  );
}
