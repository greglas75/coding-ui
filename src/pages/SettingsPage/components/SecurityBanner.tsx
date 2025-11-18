/**
 * Security Banner Component
 * Displays API key security information and session-only mode toggle
 */

import { AlertCircle, CheckCircle, Info, Shield } from 'lucide-react';

interface SecurityBannerProps {
  user: { email: string } | null;
  sessionOnlyMode: boolean;
  onSessionOnlyToggle: (enabled: boolean) => void;
}

export function SecurityBanner({ user, sessionOnlyMode, onSessionOnlyToggle }: SecurityBannerProps) {
  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">
            🔒 API Key Security Notice
          </h3>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1.5">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Protected:</strong> Keys are{' '}
                {user ? 'encrypted (AES-256) on server' : 'obfuscated (XOR + Base64) in browser storage'}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Private:</strong> Never sent to external servers (only to your local backend)
              </span>
            </li>
            {user && (
              <li className="flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Synced:</strong> Settings sync across all your devices and browsers
                </span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Limitation:</strong> Still accessible to JavaScript running on this page
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Production:</strong> For production apps, store keys on backend server only
              </span>
            </li>
          </ul>

          {/* Session-Only Mode Toggle */}
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sessionOnlyMode}
                  onChange={e => onSessionOnlyToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-blue-600 dark:bg-blue-900"
                />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Session-Only Mode
                </span>
              </div>
              <span className="text-xs text-blue-700 dark:text-blue-300">
                {sessionOnlyMode ? '🔓 Keys cleared on tab close' : '💾 Keys persist'}
              </span>
            </label>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1.5 ml-6">
              When enabled, API keys are stored in session storage and automatically cleared when you
              close this tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

