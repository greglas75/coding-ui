/**
 * ⚙️ Settings Page
 *
 * Configure AI providers (OpenAI, Claude, Gemini) and Google Search API settings
 */

import { Tab } from '@headlessui/react';
import { Cloud, Cpu, Database, Home, Info, Search, Settings } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PineconeSettings } from '../components/PineconeSettings';
import { PricingDashboard } from '../components/PricingDashboard';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useAIPricing } from '../hooks/useAIPricing';
import { useSettingsSync } from '../hooks/useSettingsSync';
import {
  disableSessionOnlyMode,
  enableSessionOnlyMode,
  getSessionOnlyMode,
} from '../utils/apiKeys';
import { ClaudeSettings } from './SettingsPage/components/ClaudeSettings';
import { CloudSyncBanner } from './SettingsPage/components/CloudSyncBanner';
import { GeminiSettings } from './SettingsPage/components/GeminiSettings';
import { GoogleSearchSettings } from './SettingsPage/components/GoogleSearchSettings';
import { OpenAISettings } from './SettingsPage/components/OpenAISettings';
import { SecurityBanner } from './SettingsPage/components/SecurityBanner';

export function SettingsPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [sessionOnlyMode, setSessionOnlyMode] = useState(getSessionOnlyMode());
  const { getPricingForProvider } = useAIPricing();
  const { user } = useAuth();
  const { syncStatus, syncSettings } = useSettingsSync();

  // Auto-sync on component mount if authenticated
  useEffect(() => {
    if (user) {
      syncSettings();
    }
  }, [user, syncSettings]);

  // Map tab index to provider
  const getProviderForTab = (tabIndex: number): 'openai' | 'anthropic' | 'google' | null => {
    if (tabIndex === 0) return 'openai';
    if (tabIndex === 1) return 'anthropic';
    if (tabIndex === 2) return 'google';
    return null; // Google Search tab
  };

  // Handle session-only mode toggle
  const handleSessionOnlyToggle = (enabled: boolean) => {
    if (enabled) {
      enableSessionOnlyMode();
      toast.success('Session-only mode enabled - keys will be cleared when tab closes');
    } else {
      disableSessionOnlyMode();
      toast.success('Keys will now persist across sessions');
    }
    setSessionOnlyMode(enabled);
  };

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Home', href: '/', icon: <Home size={14} /> },
        { label: 'Settings', icon: <Settings size={14} /> },
      ]}
      maxWidth="default"
    >
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">AI Settings</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Configure API keys and settings for AI providers and search services
          </p>
        </div>

        {/* Cloud Sync Banner */}
        <CloudSyncBanner
          user={user ? { email: user.email || '' } : null}
          syncStatus={syncStatus}
          onSync={syncSettings}
        />

        {/* Security Warning Banner */}
        <SecurityBanner
          user={user ? { email: user.email || '' } : null}
          sessionOnlyMode={sessionOnlyMode}
          onSessionOnlyToggle={handleSessionOnlyToggle}
        />

        {/* Tabs */}
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 mb-6">
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                    ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                    ${
                      selected
                        ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow'
                        : 'text-zinc-700 dark:text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Cloud className="w-4 h-4" />
                    <span>OpenAI</span>
                  </div>
                </button>
              )}
            </Tab>
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                    ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                    ${
                      selected
                        ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow'
                        : 'text-zinc-700 dark:text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Cpu className="w-4 h-4" />
                    <span>Claude</span>
                  </div>
                </button>
              )}
            </Tab>
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                    ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                    ${
                      selected
                        ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow'
                        : 'text-zinc-700 dark:text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Cloud className="w-4 h-4" />
                    <span>Gemini</span>
                  </div>
                </button>
              )}
            </Tab>
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                    ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                    ${
                      selected
                        ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow'
                        : 'text-zinc-700 dark:text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Search className="w-4 h-4" />
                    <span>Google Search</span>
                  </div>
                </button>
              )}
            </Tab>
            <Tab as={Fragment}>
              {({ selected }) => (
                <button
                  className={`
                    w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
                    ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                    ${
                      selected
                        ? 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 shadow'
                        : 'text-zinc-700 dark:text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-900 dark:hover:text-zinc-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Database className="w-4 h-4" />
                    <span>Pinecone</span>
                  </div>
                </button>
              )}
            </Tab>
          </Tab.List>

          <Tab.Panels>
            <Tab.Panel>
              <OpenAISettings models={getPricingForProvider('openai')} />
            </Tab.Panel>
            <Tab.Panel>
              <ClaudeSettings models={getPricingForProvider('anthropic')} />
            </Tab.Panel>
            <Tab.Panel>
              <GeminiSettings models={getPricingForProvider('google')} />
            </Tab.Panel>
            <Tab.Panel>
              <GoogleSearchSettings />
            </Tab.Panel>
            <Tab.Panel>
              <PineconeSettings />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>

        {/* Pricing Dashboard - Hide on Google Search and Pinecone tabs */}
        {selectedTab !== 3 && selectedTab !== 4 && (
          <div className="mt-6">
            <PricingDashboard filterProvider={getProviderForTab(selectedTab)} />
          </div>
        )}

        {/* Automation Info */}
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1 text-sm">
                🤖 Automatyczna Aktualizacja Cen i Modeli
              </h3>
              <p className="text-xs text-purple-800 dark:text-purple-200">
                Ceny i lista modeli są z <strong>października 2025</strong>. Chcesz automatycznie
                aktualizować ceny i wykrywać nowe modele? Zobacz{' '}
                <a
                  href="https://github.com/yourusername/coding-ui/blob/main/docs/AI_PRICING_AUTO_UPDATE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-purple-600 dark:hover:text-purple-300 font-medium"
                >
                  dokumentację automatyzacji
                </a>{' '}
                (JSON config, API endpoints, GitHub Actions).
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
